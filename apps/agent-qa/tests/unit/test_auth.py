from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar

import pytest
from agent_qa import auth
from agent_qa.auth import TestUser
from agent_qa.config import Settings


@dataclass
class FakeResponse:
    status_code: int
    payload: dict[str, object] | None = None
    text: str = ""

    def json(self) -> dict[str, object]:
        return self.payload or {}


class FakeRequestError(Exception):
    pass


class FakeAsyncClient:
    responses: ClassVar[list[FakeResponse | Exception]] = []
    calls: ClassVar[list[tuple[str, dict[str, object]]]] = []

    def __init__(self, **kwargs: object) -> None:
        self.kwargs = kwargs

    async def __aenter__(self) -> FakeAsyncClient:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def post(self, path: str, json: dict[str, object]) -> FakeResponse:
        self.calls.append((path, json))
        item = self.responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


class FakeHttpx:
    AsyncClient = FakeAsyncClient
    RequestError = FakeRequestError


def settings() -> Settings:
    return Settings(test_user_roles=("player1", "gm"))


def test_test_users_for_builds_configured_roles() -> None:
    users = auth.test_users_for(settings())

    assert [user.role for user in users] == ["player1", "gm"]
    assert users[0].email == "player1@agent-qa.test"
    assert users[0].password == "agent-qa-test-1234"


def test_test_user_by_role_raises_for_unknown_role() -> None:
    with pytest.raises(KeyError):
        auth.test_user_by_role("missing", settings())


@pytest.mark.asyncio
async def test_ensure_test_users_classifies_created_existing_and_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    FakeAsyncClient.calls = []
    FakeAsyncClient.responses = [
        FakeResponse(200, {"id": "u1"}),
        FakeResponse(409, {"error": "exists"}),
        FakeResponse(400, {"error": "invalid"}),
    ]
    monkeypatch.setattr(auth, "httpx", FakeHttpx)
    active = Settings(test_user_roles=("player1", "player2", "gm"))

    result = await auth.ensure_test_users(active)

    assert [user.user_id for user in result.created] == ["u1"]
    assert [user.role for user in result.existing] == ["player2"]
    assert [(user.role, message) for user, message in result.failed] == [
        ("gm", "Fastify auth register returned HTTP 400: invalid")
    ]
    assert [call[0] for call in FakeAsyncClient.calls] == ["/api/auth/register"] * 3


@pytest.mark.asyncio
async def test_ensure_test_users_returns_failed_when_fastify_is_down(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    FakeAsyncClient.calls = []
    FakeAsyncClient.responses = [
        FakeRequestError("connection refused"),
        FakeRequestError("connection refused"),
    ]
    monkeypatch.setattr(auth, "httpx", FakeHttpx)

    result = await auth.ensure_test_users(settings())

    assert result.created == []
    assert result.existing == []
    assert len(result.failed) == 2
    assert result.failed[0][0].role == "player1"
    assert "connection refused" in result.failed[0][1]


@pytest.mark.asyncio
async def test_verify_user_returns_id_for_valid_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    FakeAsyncClient.calls = []
    FakeAsyncClient.responses = [FakeResponse(200, {"id": "verified-user"})]
    monkeypatch.setattr(auth, "httpx", FakeHttpx)

    user_id = await auth.verify_user(auth.test_user_by_role("player1", settings()), settings())

    assert user_id == "verified-user"
    assert FakeAsyncClient.calls[0][0] == "/api/auth/verify"


@pytest.mark.asyncio
async def test_verify_user_returns_none_for_invalid_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    FakeAsyncClient.responses = [FakeResponse(401, {"error": "invalid"})]
    monkeypatch.setattr(auth, "httpx", FakeHttpx)

    assert await auth.verify_user(TestUser("bad@example.test", "password", "Bad", "bad")) is None


def test_build_login_task_includes_credentials_and_base_url() -> None:
    task = auth.build_login_task(
        TestUser("p@example.test", "secret123", "Player", "player"), "http://x/"
    )

    assert "http://x/login" in task
    assert "p@example.test" in task
    assert "secret123" in task
