from __future__ import annotations

import dataclasses

import httpx

from agent_qa.config import Settings


@dataclasses.dataclass(frozen=True)
class TestUser:
    __test__ = False

    email: str
    password: str
    name: str
    role: str
    user_id: str | None = None


@dataclasses.dataclass
class EnsureResult:
    created: list[TestUser]
    existing: list[TestUser]
    failed: list[tuple[TestUser, str]]


async def ensure_test_users(settings: Settings | None = None) -> EnsureResult:
    """Create configured test users through Fastify auth, treating 409 as success."""
    active_settings = settings or Settings.from_env()
    created: list[TestUser] = []
    existing: list[TestUser] = []
    failed: list[tuple[TestUser, str]] = []

    try:
        async with httpx.AsyncClient(
            base_url=active_settings.fastify_url.rstrip("/"), timeout=10.0
        ) as client:
            for user in test_users_for(active_settings):
                try:
                    response = await client.post(
                        "/api/auth/register",
                        json={"email": user.email, "password": user.password, "name": user.name},
                    )
                except httpx.RequestError as exc:
                    failed.append((user, f"Fastify auth register failed: {exc}"))
                    continue

                if response.status_code == 200:
                    payload = _response_json(response)
                    user_id = payload.get("id")
                    created.append(
                        dataclasses.replace(
                            user, user_id=str(user_id) if user_id is not None else None
                        )
                    )
                elif response.status_code == 409:
                    existing.append(user)
                else:
                    failed.append((user, _status_error(response)))
    except Exception as exc:  # httpx import/config faults should not abort the harness bootstrap.
        message = f"Fastify auth register unavailable: {type(exc).__name__}: {exc}"
        failed.extend((user, message) for user in test_users_for(active_settings))

    return EnsureResult(created=created, existing=existing, failed=failed)


def test_users_for(settings: Settings | None = None) -> list[TestUser]:
    """Return configured TestUser objects without network calls."""
    active_settings = settings or Settings.from_env()
    users: list[TestUser] = []
    for role in active_settings.test_user_roles:
        email = active_settings.test_user_email_fmt.format(role=role)
        users.append(
            TestUser(
                email=email,
                password=active_settings.test_user_password,
                name=f"Agent QA {role}",
                role=role,
            )
        )
    return users


def test_user_by_role(role: str, settings: Settings | None = None) -> TestUser:
    """Return one configured test user by role."""
    for user in test_users_for(settings):
        if user.role == role:
            return user
    raise KeyError(role)


async def verify_user(user: TestUser, settings: Settings | None = None) -> str | None:
    """Verify credentials through Fastify auth and return the user id when valid."""
    active_settings = settings or Settings.from_env()
    try:
        async with httpx.AsyncClient(
            base_url=active_settings.fastify_url.rstrip("/"), timeout=10.0
        ) as client:
            response = await client.post(
                "/api/auth/verify", json={"email": user.email, "password": user.password}
            )
    except httpx.RequestError:
        return None
    if response.status_code != 200:
        return None
    user_id = _response_json(response).get("id")
    return str(user_id) if user_id is not None else None


LOGIN_TASK_TEMPLATE = """\
First, sign in to the Highport web app.

Steps:
1. Navigate to {base_url}/login
2. Fill the email input with: {email}
3. Fill the password input with: {password}
4. Click the "Sign in" submit button
5. Wait for the page to navigate away from /login

Credentials:
- Email: {email}
- Password: {password}

If login fails or the page shows an error, stop and report the error.
"""


def build_login_task(user: TestUser, base_url: str) -> str:
    """Render the login task with the user's credentials."""
    return LOGIN_TASK_TEMPLATE.format(
        base_url=base_url.rstrip("/"), email=user.email, password=user.password
    )


def _response_json(response: httpx.Response) -> dict[str, object]:
    try:
        payload = response.json()
    except ValueError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _status_error(response: httpx.Response) -> str:
    detail = _response_json(response).get("error") or response.text
    return f"Fastify auth register returned HTTP {response.status_code}: {detail}"
