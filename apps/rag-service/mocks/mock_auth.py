import base64
import hashlib
import hmac
import json

from pydantic import JsonValue

AUTH_SECRET = "test-only-api-secret"
SERVICE_SECRET = "test-only-service-secret"


def sign_token(
    claims: dict[str, JsonValue] | None = None,
    header: dict[str, JsonValue] | None = None,
    secret: str = AUTH_SECRET,
) -> str:
    parts = [
        base64.urlsafe_b64encode(json.dumps(value).encode()).rstrip(b"=").decode()
        for value in (
            header if header is not None else {"alg": "HS256", "typ": "JWT"},
            claims if claims is not None else {
                "sub": "signed-user", "purpose": "api", "iat": 1, "exp": 4102444800,
            },
        )
    ]
    message = ".".join(parts)
    signature = hmac.digest(secret.encode(), message.encode(), hashlib.sha256)
    return f"{message}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"
