"""Authentication regressions exercised through the real ASGI application."""

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from pydantic import JsonValue

from auth import verify_api_jwt
from main import app
from mocks.mock_auth import SERVICE_SECRET, sign_token
from mocks.mock_embeddings import MockEmbeddings
from mocks.mock_gemini import MockGeminiProvider
from mocks.mock_pinecone import MockPineconeIndex
from routers.query import clear_dependencies, set_dependencies


PROTECTED_ROUTES = [
    "/query", "/ingest", "/update-scope",
    "/narrative/event-description", "/narrative/mishap-description",
    "/narrative/npc-details", "/narrative/suggest-connections",
    "/narrative/lifepath-review", "/narrative/cross-character-links",
    "/ai/portraits/image", "/ai/portraits/tags",
]


@pytest.mark.parametrize("path", PROTECTED_ROUTES)
async def test_protected_route_rejects_missing_token(path: str) -> None:
    # Given an unauthenticated client, even one claiming GM identity.
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # When it requests a protected operation.
        response = await client.post(path, json={}, headers={"X-User-Id": "victim", "X-Is-GM": "true"})
    # Then authentication fails before input validation or provider access.
    assert response.status_code == 401


@pytest.mark.parametrize("path", PROTECTED_ROUTES)
@pytest.mark.parametrize("token", [
    sign_token(secret="forged"),
    sign_token({"sub": "victim", "purpose": "api", "iat": 1, "exp": 1}),
    sign_token({"sub": "victim", "purpose": "hocuspocus", "iat": 1, "exp": 4102444800}),
    "malformed.token",
])
async def test_protected_route_rejects_invalid_token(path: str, token: str) -> None:
    # Given an invalid credential.
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # When any protected operation is requested.
        response = await client.post(path, json={}, headers={"Authorization": f"Bearer {token}"})
    # Then no router accepts it.
    assert response.status_code == 401


@pytest.mark.parametrize("path", ["/ingest", "/update-scope"])
async def test_privileged_route_rejects_user_token(path: str, auth_headers: dict[str, str]) -> None:
    # Given a valid user token, but no service capability.
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # When it requests a privileged mutation.
        response = await client.post(path, json={}, headers=auth_headers)
    # Then identity alone does not authorize the operation.
    assert response.status_code == 403


@pytest.mark.parametrize("path", PROTECTED_ROUTES)
@pytest.mark.parametrize("configured", [True, False])
async def test_service_secret_fails_closed(path: str, configured: bool, monkeypatch: pytest.MonkeyPatch) -> None:
    # Given a wrong secret or a disabled service-auth configuration.
    if not configured:
        monkeypatch.delenv("RAG_SERVICE_SECRET")
    headers = {"X-RAG-Service-Secret": "wrong" if configured else SERVICE_SECRET}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # When a service operation is requested.
        response = await client.post(path, json={}, headers=headers)
    # Then missing configuration never becomes an authentication bypass.
    assert response.status_code == 401


@pytest.mark.parametrize("service", [False, True])
async def test_query_ignores_forged_scope_claims(service: bool, auth_headers: dict[str, str]) -> None:
    # Given real retrieval adapters with documents of distinct visibility.
    vectors = MockPineconeIndex()
    for scope in ["public", "gm", "party", "char:victim"]:
        await vectors.upsert(id=scope, vector=[0.1] * 1536, metadata={"text": scope, "access_scope": [scope]})
    set_dependencies(embeddings=MockEmbeddings(), llm=MockGeminiProvider(), pinecone=vectors)
    headers = {"X-RAG-Service-Secret": SERVICE_SECRET} if service else auth_headers
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # When a caller forges user, GM and character headers.
            response = await client.post("/query", json={"query": "secrets"}, headers={
                **headers, "X-User-Id": "victim", "X-Is-GM": "true", "X-Character-Id": "victim",
            })
        # Then only authenticated service capability expands retrieval.
        assert response.status_code == 200
        expected = ["public", "gm", "party"] if service else ["public"]
        assert vectors.call_history[-1]["filter"]["access_scope"]["$in"] == expected
    finally:
        clear_dependencies()


async def test_principal_uses_signed_sub_despite_spoofed_headers(auth_headers: dict[str, str]) -> None:
    from typing import Annotated
    from fastapi import Depends, FastAPI
    from auth import Principal, require_principal

    # Given a real dependency consumer (without overriding authentication).
    probe = FastAPI()

    @probe.get("/principal")
    def identity(principal: Annotated[Principal, Depends(require_principal)]) -> str | None:
        return principal.user_id

    async with AsyncClient(transport=ASGITransport(app=probe), base_url="http://test") as client:
        # When the valid signed subject is accompanied by forged claims.
        response = await client.get("/principal", headers={
            **auth_headers, "X-User-Id": "victim", "X-Is-GM": "true",
        })
    # Then the only identity is the signed subject.
    assert response.status_code == 200
    assert response.json() == "signed-user"


@pytest.mark.parametrize("patch", [
    {"sub": ""}, {"sub": 42}, {"purpose": "hocuspocus"},
    {"iat": "1"}, {"iat": True}, {"iat": float("inf")},
    {"exp": "4102444800"}, {"exp": True}, {"exp": float("nan")},
    {"email": None}, {"email": 42},
])
def test_invalid_claim_types_are_rejected(patch: dict[str, JsonValue]) -> None:
    # Given a correctly signed JWT with an invalid claim.
    token = sign_token({"sub": "user", "purpose": "api", "iat": 1, "exp": 4102444800, **patch})
    # When verification reaches claim parsing, then it rejects the token.
    with pytest.raises(HTTPException) as caught:
        verify_api_jwt(token)
    assert caught.value.status_code == 401


@pytest.mark.parametrize("missing", ["sub", "purpose", "iat", "exp"])
def test_required_claim_is_rejected_when_absent(missing: str) -> None:
    # Given a signed token missing a required claim.
    claims: dict[str, JsonValue] = {"sub": "user", "purpose": "api", "iat": 1, "exp": 4102444800}
    del claims[missing]
    # When verification runs, then it rejects the incomplete principal.
    with pytest.raises(HTTPException) as caught:
        verify_api_jwt(sign_token(claims))
    assert caught.value.status_code == 401


@pytest.mark.parametrize("header", [
    {"alg": "none", "typ": "JWT"}, {"alg": "HS512", "typ": "JWT"},
    {"alg": "HS256", "typ": "other"}, {"alg": "HS256"},
])
def test_invalid_jwt_header_is_rejected(header: dict[str, JsonValue]) -> None:
    # Given a signed token advertising an unsupported JWT header.
    token = sign_token(header=header)
    # When verification runs, then it refuses algorithm/type substitution.
    with pytest.raises(HTTPException) as caught:
        verify_api_jwt(token)
    assert caught.value.status_code == 401


def test_jwt_secret_override_matches_game_api(monkeypatch: pytest.MonkeyPatch) -> None:
    # Given a JWT signed with the game API's explicit secret override.
    monkeypatch.setenv("HOCUSPOCUS_JWT_SECRET", "override-secret")
    token = sign_token(secret="override-secret")
    # When verification runs, then the override wins over AUTH_SECRET.
    assert verify_api_jwt(token).user_id == "signed-user"


def test_jwt_fails_closed_when_secret_is_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    # Given no configured JWT secret.
    monkeypatch.delenv("AUTH_SECRET")
    # When verification runs, then a known test signature grants nothing.
    with pytest.raises(HTTPException) as caught:
        verify_api_jwt(sign_token())
    assert caught.value.status_code == 401


def test_jwt_expires_at_current_whole_second(monkeypatch: pytest.MonkeyPatch) -> None:
    # Given a token expiring at the game API's current whole second.
    monkeypatch.setattr("auth.time.time", lambda: 1000.9)
    token = sign_token({"sub": "user", "purpose": "api", "iat": 1, "exp": 1000})
    # When verification runs, then equality is expired, not still authorized.
    with pytest.raises(HTTPException) as caught:
        verify_api_jwt(token)
    assert caught.value.status_code == 401


@pytest.mark.parametrize("claims", [
    {"sub": "user", "purpose": "api", "iat": 1, "exp": 1000.5},
    {"sub": "user", "purpose": "api", "iat": 2000, "exp": 3000},
])
def test_numeric_dates_match_game_api(claims: dict[str, JsonValue], monkeypatch: pytest.MonkeyPatch) -> None:
    # Given the game API's whole-second expiry clock and finite numeric dates.
    monkeypatch.setattr("auth.time.time", lambda: 1000.9)
    token = sign_token(claims)
    # When verification runs, then fractional expiry and future iat match its semantics.
    assert verify_api_jwt(token).user_id == "user"
