from __future__ import annotations

import asyncio
import base64
import os
import time
from collections.abc import Awaitable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol, cast

from agent_qa.charters.schema import Charter
from agent_qa.config import Settings
from agent_qa.personas.schema import Persona
from agent_qa.reporting.evidence import EvidenceDir
from agent_qa.runtime.budget import BudgetConfig, BudgetExceeded, BudgetGuard, BudgetSnapshot
from agent_qa.runtime.tape import StepKind, StepRecord, Tape


@dataclass
class StepCapture:
    """Snapshot of one agent step, captured via callback."""

    step_index: int
    timestamp: datetime
    url: str
    title: str
    next_goal: str | None
    actions: list[dict[str, object]]
    screenshot_b64: str | None
    fsm_state_observed: str | None


@dataclass
class DriverResult:
    success: bool
    steps: list[StepCapture]
    final_url: str | None
    final_result: str | None
    errors: list[str]
    total_tokens: int
    wall_clock_s: float
    budget_snapshot: dict[str, int | float]
    termination_reason: str


class _ChatClass(Protocol):
    def __call__(self, *args: object, **kwargs: object) -> object: ...


class _AgentLike(Protocol):
    def run(
        self,
        max_steps: int,
        on_step_start: object,
        on_step_end: object,
    ) -> Awaitable[object]: ...


class _AgentClass(Protocol):
    def __call__(self, **kwargs: object) -> _AgentLike: ...


class _BrowserClass(Protocol):
    def __call__(self, **kwargs: object) -> object: ...


class CharterDriver:
    """Wraps Browser-Use Agent for a single player's charter run."""

    def __init__(
        self,
        charter: Charter,
        persona: Persona,
        evidence_dir: EvidenceDir,
        *,
        headless: bool = True,
        user_data_dir: Path | None = None,
    ):
        self.charter: Charter = charter
        self.persona: Persona = persona
        self.evidence_dir: EvidenceDir = evidence_dir
        self.headless: bool = headless
        self.user_data_dir: Path | None = user_data_dir
        self.tape: Tape = Tape(evidence_dir.tape)
        self.steps: list[StepCapture] = []
        self.errors: list[str] = []
        self._budget: BudgetGuard = BudgetGuard(
            BudgetConfig(
                max_steps=charter.budget.max_steps,
                max_tokens_per_step=charter.budget.max_tokens_per_step,
                max_total_tokens=charter.budget.max_total_tokens,
                max_wall_clock_s=charter.budget.max_wall_clock_s,
                retry_on_infra_failure=charter.budget.retry_on_infra_failure,
            )
        )
        self._stop_requested: bool = False
        self._termination_reason: str = "done"
        self._url_window: list[str] = []
        self._history: object | None = None

    async def run(self) -> DriverResult:
        """Build Agent with hooks, call agent.run(max_steps=...), return DriverResult."""
        started = time.monotonic()
        browser: object | None = None
        total_tokens = 0
        final_result: str | None = None
        final_url: str | None = None
        success = False
        self._budget.start()

        try:
            llm = build_llm(self.persona)
            browser = await build_browser(headless=self.headless, user_data_dir=self.user_data_dir)
            agent_class = _agent_class()
            agent = agent_class(
                task=self._task_text(),
                llm=llm,
                fallback_llm=build_fallback_llm(self.persona),
                browser=browser,
                register_new_step_callback=self._capture_step,
                register_done_callback=self._capture_done,
                register_should_stop_callback=self._should_stop,
                use_vision=_provider_has_vision(),
            )
            history = await agent.run(
                max_steps=self.charter.budget.max_steps,
                on_step_start=self._on_step_start,
                on_step_end=self._on_step_end,
            )
            self._history = history
            final_result = _history_final_result(history)
            final_url = _history_final_url(history) or self._latest_url()
            total_tokens = _history_total_tokens(history) or self._budget.snapshot().tokens_used
            if self._termination_reason == "done" and not _history_done(history):
                self._termination_reason = "stopped" if self._stop_requested else "max_steps"
            success = self._termination_reason == "done" and _history_success(history)
        except BudgetExceeded as exc:
            self._termination_reason = "budget_exceeded"
            self.errors.append(str(exc))
        except Exception as exc:
            self._termination_reason = "error"
            self.errors.append(f"{type(exc).__name__}: {exc}")
        finally:
            if browser is not None:
                await _close_browser(browser)

        snapshot = self._budget.snapshot()
        if total_tokens == 0:
            total_tokens = snapshot.tokens_used
        return DriverResult(
            success=success,
            steps=list(self.steps),
            final_url=final_url or self._latest_url(),
            final_result=final_result,
            errors=list(self.errors),
            total_tokens=total_tokens,
            wall_clock_s=time.monotonic() - started,
            budget_snapshot=_snapshot_dict(snapshot),
            termination_reason=self._termination_reason,
        )

    async def _capture_step(self, browser_state: object, model_output: object, step: int) -> None:
        timestamp = datetime.now(UTC)
        screenshot_b64 = _optional_attr_str(browser_state, "screenshot")
        actions = _actions_from_output(model_output)
        next_goal = _optional_attr_str(model_output, "next_goal")
        url = _optional_attr_str(browser_state, "url") or ""
        title = _optional_attr_str(browser_state, "title") or ""
        tokens = _tokens_from_model_output(model_output)
        self._budget.record_step(tokens)
        screenshot_path = await self._save_step_screenshot(step, screenshot_b64)
        capture = StepCapture(
            step_index=step,
            timestamp=timestamp,
            url=url,
            title=title,
            next_goal=next_goal,
            actions=actions,
            screenshot_b64=screenshot_b64,
            fsm_state_observed=None,
        )
        self.steps.append(capture)
        self._url_window.append(url)
        if len(self._url_window) > 3:
            _ = self._url_window.pop(0)
        await asyncio.to_thread(
            self.tape.write_step,
            StepRecord(
                index=step,
                kind=StepKind.ACT,
                timestamp=timestamp,
                action=_format_actions(actions),
                result=next_goal,
                screenshot_path=str(screenshot_path) if screenshot_path else None,
                tokens_used=tokens,
                metadata={"url": url, "title": title},
            ),
        )

    async def _capture_done(self, history: object) -> None:
        self._history = history

    async def _should_stop(self) -> bool:
        return self._stop_requested

    async def _on_step_start(self, _agent: object) -> None:
        self._budget.check_time()

    async def _on_step_end(self, _agent: object) -> None:
        self._budget.check_time()
        if len(self._url_window) == 3 and len(set(self._url_window)) == 1:
            self._stop_requested = True
            self._termination_reason = "stopped"

    async def _save_step_screenshot(self, step: int, screenshot_b64: str | None) -> Path | None:
        if self.charter.evidence.screenshots != "per_step" or not screenshot_b64:
            return None
        path = self.evidence_dir.screenshots / f"step_{step:03d}.png"
        try:
            data = base64.b64decode(screenshot_b64)
        except ValueError as exc:
            self.errors.append(f"Invalid screenshot at step {step}: {exc}")
            return None
        path.parent.mkdir(parents=True, exist_ok=True)
        _ = await asyncio.to_thread(path.write_bytes, data)
        return path

    def _latest_url(self) -> str | None:
        return _latest_url_from_steps(self.steps)

    def _task_text(self) -> str:
        settings = Settings.from_env()
        base_url = settings.web_url.rstrip("/")
        constraints = "\n".join(f"- {item}" for item in self.persona.behavioral_constraints)
        success = "\n".join(f"- {item}" for item in self.charter.success_criteria.required)
        return (
            f"Open {base_url}/chargen and execute charter {self.charter.id}: {self.charter.title}.\n"
            f"Mission: {self.charter.mission.strip()}\n"
            f"Role: {self.persona.role}.\n"
            f"Constraints:\n{constraints or '- none'}\n"
            f"Success criteria:\n{success}\n"
            "For this smoke harness, stop and mark the task done as soon as the page is loaded, "
            "a Highport or Chargen title/shell is visible, and no obvious browser error page is shown."
        )


def build_llm(persona: Persona) -> object:
    """Construct the LLM per persona.model + env API keys."""
    _load_env_files()
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    groq_key = os.environ.get("GROQ_API_KEY")
    chat_anthropic, chat_google, chat_groq = _chat_classes()
    temperature = persona.model.temperature

    if anthropic_key:
        model = persona.model.driver or persona.model.critic or persona.model.planner
        return chat_anthropic(model=model, temperature=temperature, api_key=anthropic_key)
    if gemini_key:
        return chat_google(
            model="gemini-2.0-flash-exp", temperature=temperature, api_key=gemini_key
        )
    if groq_key:
        return chat_groq(model="llama-3.3-70b-versatile", temperature=temperature, api_key=groq_key)
    raise RuntimeError(
        "No LLM API key found. Set ANTHROPIC_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY."
    )


def build_fallback_llm(persona: Persona) -> object | None:
    _load_env_files()
    if os.environ.get("ANTHROPIC_API_KEY"):
        return None
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        _chat_anthropic, chat_google, _chat_groq = _chat_classes()
        return chat_google(
            model="gemini-2.5-flash", temperature=persona.model.temperature, api_key=gemini_key
        )
    return None


async def build_browser(
    *,
    headless: bool = True,
    user_data_dir: Path | None = None,
    cdp_url: str | None = None,
) -> object:
    """Construct Browser-Use Browser with isolation profile."""
    browser_class, profile_class = _browser_classes()
    profile = profile_class(
        headless=headless,
        user_data_dir=user_data_dir,
        keep_alive=False,
        cdp_url=cdp_url,
    )
    browser = browser_class(browser_profile=profile)
    await asyncio.sleep(0)
    return browser


def _chat_classes() -> tuple[_ChatClass, _ChatClass, _ChatClass]:
    from browser_use import ChatAnthropic, ChatGoogle, ChatGroq

    return cast(tuple[_ChatClass, _ChatClass, _ChatClass], (ChatAnthropic, ChatGoogle, ChatGroq))


def _agent_class() -> _AgentClass:
    from browser_use import Agent

    return cast(_AgentClass, cast(object, Agent))


def _browser_classes() -> tuple[_BrowserClass, _BrowserClass]:
    from browser_use import Browser, BrowserProfile

    return cast(tuple[_BrowserClass, _BrowserClass], (Browser, BrowserProfile))


def _load_env_files() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        load_dotenv = None
    if load_dotenv is not None:
        _ = load_dotenv()
        rag_env = _find_repo_file(Path("apps") / "rag-service" / ".env")
        if rag_env is not None:
            _ = load_dotenv(rag_env, override=False)
        return
    rag_env = _find_repo_file(Path("apps") / "rag-service" / ".env")
    if rag_env is not None:
        for line in rag_env.read_text(encoding="utf-8").splitlines():
            key, separator, value = line.partition("=")
            if separator and key and key not in os.environ:
                os.environ[key] = value.strip().strip('"').strip("'")


def _find_repo_file(relative_path: Path) -> Path | None:
    bases = [Path.cwd(), *Path.cwd().parents, Path(__file__).resolve().parent]
    bases.extend(Path(__file__).resolve().parents)
    for base in bases:
        candidate = base / relative_path
        if candidate.exists():
            return candidate
    return None


def _provider_has_vision() -> bool:
    _load_env_files()
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("GEMINI_API_KEY"))


def _optional_attr_str(obj: object, name: str) -> str | None:
    value = getattr(obj, name, None)
    if value is None:
        return None
    return str(value)


def _actions_from_output(model_output: object) -> list[dict[str, object]]:
    raw_actions = getattr(model_output, "action", [])
    if not isinstance(raw_actions, list):
        return []
    actions: list[dict[str, object]] = []
    for action in raw_actions:
        if isinstance(action, dict):
            actions.append(action)
        elif hasattr(action, "model_dump"):
            dumped = action.model_dump()
            if isinstance(dumped, dict):
                actions.append(cast(dict[str, object], dumped))
        else:
            actions.append({"action": str(action)})
    return actions


def _tokens_from_model_output(model_output: object) -> int:
    for name in ("total_tokens", "tokens", "tokens_used"):
        value = getattr(model_output, name, None)
        if isinstance(value, int):
            return value
    usage = getattr(model_output, "usage", None)
    if usage is not None:
        for name in ("total_tokens", "input_tokens", "output_tokens"):
            value = getattr(usage, name, None)
            if isinstance(value, int):
                return value
    return 0


def _format_actions(actions: list[dict[str, object]]) -> str:
    if not actions:
        return "no action"
    return "; ".join(str(action) for action in actions)


def _history_final_result(history: object) -> str | None:
    final_result = getattr(history, "final_result", None)
    if callable(final_result):
        value = final_result()
        return None if value is None else str(value)
    return None if final_result is None else str(final_result)


def _history_final_url(history: object) -> str | None:
    urls = getattr(history, "urls", None)
    if callable(urls):
        values = urls()
        if isinstance(values, list) and values:
            return str(values[-1])
    return None


def _history_total_tokens(history: object) -> int:
    for name in ("total_input_tokens", "total_tokens"):
        value = getattr(history, name, None)
        if callable(value):
            computed = value()
            if isinstance(computed, int):
                return computed
        elif isinstance(value, int):
            return value
    model_dump = getattr(history, "model_dump", None)
    dumped = model_dump() if callable(model_dump) else {}
    if isinstance(dumped, dict):
        return _sum_token_fields(cast(dict[str, object], dumped))
    return 0


def _sum_token_fields(payload: dict[str, object]) -> int:
    total = 0
    for key, value in payload.items():
        if key in {"total_tokens", "tokens", "tokens_used"} and isinstance(value, int):
            total += value
        elif isinstance(value, dict):
            total += _sum_token_fields(cast(dict[str, object], value))
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    total += _sum_token_fields(cast(dict[str, object], item))
    return total


def _history_done(history: object) -> bool:
    is_done = getattr(history, "is_done", None)
    return bool(is_done()) if callable(is_done) else bool(is_done)


def _history_success(history: object) -> bool:
    is_successful = getattr(history, "is_successful", None)
    if callable(is_successful):
        value = is_successful()
        return _history_done(history) if value is None else bool(value)
    if is_successful is None:
        return _history_done(history)
    return bool(is_successful)


async def _close_browser(browser: object) -> None:
    close = getattr(browser, "close", None)
    if callable(close):
        result = close()
        if isinstance(result, Awaitable):
            await result


def _snapshot_dict(snapshot: BudgetSnapshot) -> dict[str, int | float]:
    return {
        "steps_used": snapshot.steps_used,
        "tokens_used": snapshot.tokens_used,
        "wall_clock_s": snapshot.wall_clock_s,
        "last_step_tokens": snapshot.last_step_tokens,
    }


def _latest_url_from_steps(steps: list[StepCapture]) -> str | None:
    for step in reversed(steps):
        if step.url:
            return step.url
    return None
