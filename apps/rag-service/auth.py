"""RAG trust boundary.

Browser identity comes only from an HS256 API JWT signed with AUTH_SECRET
(HOCUSPOCUS_JWT_SECRET takes precedence, as in the game API). JWTs establish
identity, not campaign membership: browser retrieval is public-only. Character
selectors and legacy X-User-Id/X-Is-GM headers never grant access.

RAG_SERVICE_SECRET authenticates trusted server callers via X-RAG-Service-Secret.
Only these callers may ingest, change scopes, or retrieve GM/party context; the
game API must authorize the campaign operation before calling RAG. This secret
must never be exposed in NEXT_PUBLIC configuration. Service principals have no
user identity; we never manufacture a user or accept one from a header.
"""

import base64
import binascii
import hashlib
import hmac
import os
import time
from dataclasses import dataclass
from typing import Annotated, Literal

from fastapi import Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError


class JwtHeader(BaseModel):
    model_config = ConfigDict(strict=True, frozen=True)
    alg: Literal["HS256"]
    typ: Literal["JWT"]


class ApiClaims(BaseModel):
    model_config = ConfigDict(strict=True, frozen=True, allow_inf_nan=False)
    sub: str = Field(min_length=1)
    purpose: Literal["api"]
    iat: int | float
    exp: int | float
    email: str = ""


@dataclass(frozen=True, slots=True)
class Principal:
    user_id: str | None
    is_service: bool = False

    @property
    def scope(self) -> list[str]:
        return ["public", "gm", "party"] if self.is_service else ["public"]


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401, detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _decode(segment: str) -> bytes:
    return base64.b64decode(
        segment + "=" * (-len(segment) % 4), altchars=b"-_", validate=True,
    )


def verify_api_jwt(token: str) -> Principal:
    """Verify the game API's signature, header, purpose and temporal claims."""
    secret = os.environ.get("HOCUSPOCUS_JWT_SECRET", os.environ.get("AUTH_SECRET", ""))
    if not secret:
        raise _unauthorized()
    try:
        header, payload, signature = token.split(".")
        JwtHeader.model_validate_json(_decode(header))
        expected = hmac.digest(secret.encode(), f"{header}.{payload}".encode("ascii"), hashlib.sha256)
        if not hmac.compare_digest(_decode(signature), expected):
            raise _unauthorized()
        claims = ApiClaims.model_validate_json(_decode(payload))
        if claims.exp <= int(time.time()):
            raise _unauthorized()
    except (ValueError, UnicodeError, binascii.Error, ValidationError) as error:
        raise _unauthorized() from error
    return Principal(user_id=claims.sub)


def require_principal(
    authorization: Annotated[str | None, Header()] = None,
    service_secret: Annotated[str | None, Header(alias="X-RAG-Service-Secret")] = None,
) -> Principal:
    if authorization is not None:
        if not authorization.startswith("Bearer "):
            raise _unauthorized()
        return verify_api_jwt(authorization[7:])
    expected = os.environ.get("RAG_SERVICE_SECRET", "")
    if expected and service_secret and hmac.compare_digest(service_secret.encode(), expected.encode()):
        return Principal(user_id=None, is_service=True)
    raise _unauthorized()


def require_service(principal: Annotated[Principal, Depends(require_principal)]) -> Principal:
    if not principal.is_service:
        raise HTTPException(status_code=403, detail="Trusted service required")
    return principal
