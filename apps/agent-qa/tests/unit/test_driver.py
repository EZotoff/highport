import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Any, ClassVar
from unittest.mock import AsyncMock

import pytest
from agent_qa.auth import TestUser
from agent_qa.charters.loader import load_charter
from agent_qa.config import Settings
from agent_qa.personas.loader import load_persona
from agent_qa.reporting.evidence import EvidenceDir
from agent_qa.runtime import driver


@dataclass
class BuiltLLM:
    provider: str
    kwargs: dict[str, object]


class ChatFactory:
    def __init__(self, provider: str) -> None:
        self.provider = provider
        self.calls: list[dict[str, object]] = []

    def __call__(self, **kwargs: object) -> BuiltLLM:
        self.calls.append(kwargs)
        return BuiltLLM(self.provider, kwargs)


class FakeHistory:
    def __init__(self, done: bool = True, success: bool | None = True) -> None:
        self.done = done
        self.success = success

    def final_result(self) -> str:
        return "Loaded Highport Chargen"

    def urls(self) -> list[str]:
        return ["http://localhost:18120/chargen"]

    def is_done(self) -> bool:
        return self.done

    def is_successful(self) -> bool | None:
        return self.success

    def model_dump(self) -> dict[str, object]:
        return {"usage": {"total_tokens": 42}}


class FakeBrowser:
    def __init__(self) -> None:
        self.closed = False

    async def close(self) -> None:
        self.closed = True


class State:
    url = "http://localhost:18120/chargen"
    title = "Highport Chargen"
    screenshot = base64.b64encode(b"png").decode()


class Output:
    next_goal = "verify shell"
    action: ClassVar[list[dict[str, dict[str, str]]]] = [{"done": {"text": "loaded"}}]
    total_tokens = 10


def persona() -> object:
    return load_persona("player")


def evidence(tmp_path: Path) -> EvidenceDir:
    return EvidenceDir.create(tmp_path, "S0")


def fake_chat_classes() -> tuple[ChatFactory, ChatFactory, ChatFactory]:
    return ChatFactory("anthropic"), ChatFactory("gemini"), ChatFactory("groq")


def test_build_llm_prefers_anthropic(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "anthropic")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini")
    monkeypatch.setattr(driver, "_chat_classes", fake_chat_classes)
    monkeypatch.setattr(driver, "_load_env_files", lambda: None)

    llm = driver.build_llm(persona())

    assert isinstance(llm, BuiltLLM)
    assert llm.provider == "anthropic"
    assert llm.kwargs["api_key"] == "anthropic"


def test_build_llm_uses_gemini_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "gemini")
    monkeypatch.setenv("GROQ_API_KEY", "groq")
    monkeypatch.setattr(driver, "_chat_classes", fake_chat_classes)
    monkeypatch.setattr(driver, "_load_env_files", lambda: None)

    llm = driver.build_llm(persona())

    assert isinstance(llm, BuiltLLM)
    assert llm.provider == "gemini"
    assert llm.kwargs["model"] == "gemini-2.5-flash"


def test_build_llm_falls_back_to_groq(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "groq")
    monkeypatch.setattr(driver, "_chat_classes", fake_chat_classes)
    monkeypatch.setattr(driver, "_load_env_files", lambda: None)

    llm = driver.build_llm(persona())

    assert isinstance(llm, BuiltLLM)
    assert llm.provider == "groq"
    assert llm.kwargs["model"] == "gemini-2.5-flash"


def test_build_llm_honors_provider_pref_and_configured_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "anthropic")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini")
    monkeypatch.setattr(driver, "_chat_classes", fake_chat_classes)
    monkeypatch.setattr(driver, "_load_env_files", lambda: None)

    llm = driver.build_llm(
        persona(), Settings(llm_provider_pref="gemini", llm_model="gemini-custom")
    )

    assert isinstance(llm, BuiltLLM)
    assert llm.provider == "gemini"
    assert llm.kwargs["model"] == "gemini-custom"


def test_build_llm_fails_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setattr(driver, "_chat_classes", fake_chat_classes)
    monkeypatch.setattr(driver, "_load_env_files", lambda: None)

    with pytest.raises(RuntimeError, match="No LLM API key"):
        driver.build_llm(persona())


@pytest.mark.asyncio
async def test_run_populates_result_and_tape(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    captured: dict[str, Any] = {}
    browser = FakeBrowser()

    page = object()

    class FakeAgent:
        def __init__(self, **kwargs: Any) -> None:
            captured.update(kwargs)
            self.browser = type(
                "AgentBrowser", (), {"_ctx": type("Ctx", (), {"pages": [page]})()}
            )()

        async def run(
            self, max_steps: int, on_step_start: object, on_step_end: object
        ) -> FakeHistory:
            assert max_steps == 8
            await captured["register_new_step_callback"](State(), Output(), 1)
            await on_step_start(self)
            await on_step_end(self)
            return FakeHistory()

    monkeypatch.setattr(driver, "build_llm", lambda _persona, _settings=None: object())
    monkeypatch.setattr(driver, "build_fallback_llm", lambda _persona, _settings=None: None)
    monkeypatch.setattr(driver, "build_browser", AsyncMock(return_value=browser))
    monkeypatch.setattr(driver, "_agent_class", lambda: FakeAgent)
    monkeypatch.setattr(driver, "_provider_has_vision", lambda: True)

    result = await driver.CharterDriver(load_charter("S0"), persona(), evidence(tmp_path)).run()

    assert result.success is True
    assert result.final_result == "Loaded Highport Chargen"
    assert result.total_tokens == 42
    assert result.steps[0].title == "Highport Chargen"
    assert result.steps[0].tokens_used == 10
    assert (tmp_path / next(tmp_path.iterdir()).name / "S0" / "tape.jsonl").exists()
    assert browser.closed is True


@pytest.mark.asyncio
async def test_login_user_prepends_task_and_marks_login_completed(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    captured: dict[str, Any] = {}

    class FakeAgent:
        def __init__(self, **kwargs: Any) -> None:
            captured.update(kwargs)

        async def run(
            self, max_steps: int, on_step_start: object, on_step_end: object
        ) -> FakeHistory:
            _ = max_steps, on_step_start, on_step_end
            await captured["register_new_step_callback"](State(), Output(), 1)
            return FakeHistory()

    monkeypatch.setattr(driver, "build_llm", lambda _persona, _settings=None: object())
    monkeypatch.setattr(driver, "build_fallback_llm", lambda _persona, _settings=None: None)
    monkeypatch.setattr(driver, "build_browser", AsyncMock(return_value=FakeBrowser()))
    monkeypatch.setattr(driver, "_agent_class", lambda: FakeAgent)
    monkeypatch.setattr(driver, "_provider_has_vision", lambda: True)
    user = TestUser("player1@agent-qa.test", "agent-qa-test-1234", "Agent QA player1", "player1")

    result = await driver.CharterDriver(
        load_charter("S0"), persona(), evidence(tmp_path), login_user=user
    ).run()

    assert "First, sign in" in captured["task"]
    assert "player1@agent-qa.test" in captured["task"]
    assert result.login_completed is True


@pytest.mark.asyncio
async def test_budget_exceeded_terminates(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    class GreedyOutput(Output):
        total_tokens = 2

    class FakeAgent:
        def __init__(self, **kwargs: Any) -> None:
            self.callback = kwargs["register_new_step_callback"]

        async def run(
            self, max_steps: int, on_step_start: object, on_step_end: object
        ) -> FakeHistory:
            _ = max_steps, on_step_start, on_step_end
            await self.callback(State(), GreedyOutput(), 1)
            return FakeHistory()

    charter = load_charter("S0").model_copy(
        update={"budget": load_charter("S0").budget.model_copy(update={"max_tokens_per_step": 1})}
    )
    monkeypatch.setattr(driver, "build_llm", lambda _persona, _settings=None: object())
    monkeypatch.setattr(driver, "build_fallback_llm", lambda _persona, _settings=None: None)
    monkeypatch.setattr(driver, "build_browser", AsyncMock(return_value=FakeBrowser()))
    monkeypatch.setattr(driver, "_agent_class", lambda: FakeAgent)
    monkeypatch.setattr(driver, "_provider_has_vision", lambda: True)

    result = await driver.CharterDriver(charter, persona(), evidence(tmp_path)).run()

    assert result.termination_reason == "budget_exceeded"


@pytest.mark.asyncio
async def test_stuck_detection_requests_stop(tmp_path: Path) -> None:
    harness = driver.CharterDriver(load_charter("S0"), persona(), evidence(tmp_path))
    harness._budget.start()

    await harness._capture_step(State(), Output(), 1)
    await harness._capture_step(State(), Output(), 2)
    await harness._capture_step(State(), Output(), 3)
    await harness._on_step_end(object())

    assert await harness._should_stop() is True
    assert harness._termination_reason == "stopped"


@pytest.mark.asyncio
async def test_on_step_end_exposes_playwright_page(tmp_path: Path) -> None:
    page = object()
    agent = type(
        "Agent",
        (),
        {"browser": type("Browser", (), {"_ctx": type("Ctx", (), {"pages": [page]})()})()},
    )()
    harness = driver.CharterDriver(load_charter("S0"), persona(), evidence(tmp_path))
    harness._budget.start()

    await harness._on_step_end(agent)

    assert harness.last_page is page
