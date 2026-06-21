from __future__ import annotations

import asyncio
import re
from typing import TYPE_CHECKING, Protocol, cast
from weakref import WeakKeyDictionary

from agent_qa.charters.schema import BoundaryInvariant
from agent_qa.runtime.fsm import (
    STATUS_ORDER,
    ChargenStatus,
    is_valid_transition,
    next_status,
    parse_status,
)

if TYPE_CHECKING:
    from playwright.async_api import ConsoleMessage, Page


_CONSOLE_HISTORIES: WeakKeyDictionary[object, list[ConsoleMessage]] = WeakKeyDictionary()


class AssertionFailure(RuntimeError):
    """Base class for all harness assertions."""


class FSMViolation(AssertionFailure):
    """Observed FSM transition is illegal."""

    def __init__(
        self,
        from_status: ChargenStatus | None,
        to_status: ChargenStatus,
        detail: str = "",
    ):
        self.from_status: ChargenStatus | None = from_status
        self.to_status: ChargenStatus = to_status
        valid_next = _valid_next_status(from_status)
        from_value = from_status.value if from_status is not None else None
        valid_next_value = valid_next.value if valid_next is not None else None
        message = (
            f"Illegal transition: {from_value} -> {to_status.value}. Valid next: {valid_next_value}"
        )
        if detail:
            message = f"{message}. {detail}"
        super().__init__(message)


class DOMAssertionFailure(AssertionFailure):
    """DOM did not match expected pattern."""


class ConsoleErrorExceeded(AssertionFailure):
    """Console error count exceeded boundary."""

    def __init__(self, count: int, limit: int, sample_messages: list[str]):
        self.count: int = count
        self.limit: int = limit
        self.sample_messages: list[str] = sample_messages
        super().__init__(f"Console errors: {count} (limit {limit}). Sample: {sample_messages[:3]}")


class BoundaryViolation(AssertionFailure):
    """A charter boundary invariant was violated."""

    def __init__(self, invariant_id: str, kind: str, expected: str, actual: str):
        self.invariant_id: str = invariant_id
        self.kind: str = kind
        self.expected: str = expected
        self.actual: str = actual
        super().__init__(
            f"Invariant '{invariant_id}' ({kind}) violated: expected {expected}, got {actual}"
        )


class _TextLocator(Protocol):
    async def inner_text(self, *, timeout: int | None = None) -> str: ...


def assert_fsm_transition(
    from_status: ChargenStatus | None,
    to_status: ChargenStatus,
) -> None:
    """Raise FSMViolation if transition is illegal.
    `from_status=None` means initial state (only ChargenStatus.BACKGROUND is valid as `to_status`).
    """
    if from_status is None:
        if to_status is ChargenStatus.BACKGROUND:
            return
        raise FSMViolation(from_status, to_status)

    if not is_valid_transition(from_status, to_status):
        raise FSMViolation(from_status, to_status)


def assert_status_advances(
    current: ChargenStatus,
    observed: ChargenStatus,
) -> None:
    """Raise FSMViolation if observed != next_status(current). Strict forward-by-1."""
    if next_status(current) is not observed:
        raise FSMViolation(current, observed)


async def assert_dom_text_matches(
    page: Page,
    pattern: str,
    *,
    selector: str = "body",
    timeout_ms: int = 3000,
) -> None:
    """Wait for selector's text to match regex pattern. Raise DOMAssertionFailure on timeout.
    Uses page.wait_for_function with a regex test against element.innerText().
    """
    try:
        _ = await page.wait_for_function(
            """
            ([selector, pattern]) => {
                const element = document.querySelector(selector);
                if (!element) return false;
                return new RegExp(pattern).test(element.innerText || "");
            }
            """,
            arg=[selector, pattern],
            timeout=timeout_ms,
        )
    except _playwright_timeout_types() as exc:
        raise DOMAssertionFailure(
            f"Pattern '{pattern}' not found in '{selector}' within {timeout_ms}ms"
        ) from exc


async def assert_dom_text_absent(
    page: Page,
    pattern: str,
    *,
    selector: str = "body",
    timeout_ms: int = 500,
) -> None:
    """Assert pattern does NOT appear in selector's text within timeout.
    Inverted logic: returns as soon as pattern is confirmed absent; raises if found.
    """
    try:
        _ = await page.wait_for_function(
            """
            ([selector, pattern]) => {
                const element = document.querySelector(selector);
                if (!element) return false;
                return new RegExp(pattern).test(element.innerText || "");
            }
            """,
            arg=[selector, pattern],
            timeout=timeout_ms,
        )
    except _playwright_timeout_types():
        return
    raise DOMAssertionFailure(
        f"Pattern '{pattern}' unexpectedly found in '{selector}' within {timeout_ms}ms"
    )


async def read_current_status_from_dom(
    page: Page,
    *,
    selector: str = "[data-chargen-status]",
    timeout_ms: int = 2000,
) -> ChargenStatus:
    """Read the wizard's current status from a DOM element. Uses `data-chargen-status` attribute.
    Falls back to parsing visible text if attribute missing. Raises DOMAssertionFailure if unreadable.
    Returns parse_status(text) — invalid values raise ValueError.
    """
    try:
        element = await page.wait_for_selector(selector, timeout=timeout_ms)
    except _playwright_timeout_types() as exc:
        raise DOMAssertionFailure(
            f"Status selector '{selector}' not found within {timeout_ms}ms"
        ) from exc

    if element is None:
        raise DOMAssertionFailure(f"Status selector '{selector}' resolved to no element")

    status_text = await element.get_attribute("data-chargen-status")
    if status_text is None:
        status_text = await element.inner_text()

    stripped_status = status_text.strip()
    if not stripped_status:
        raise DOMAssertionFailure(f"Status selector '{selector}' did not expose a status value")
    return parse_status(stripped_status)


async def collect_console_messages(
    page: Page,
    *,
    types: tuple[str, ...] = ("error",),
    duration_ms: int = 0,
) -> list[ConsoleMessage]:
    """Subscribe to page console events for duration_ms. Returns collected messages.
    If duration_ms == 0, returns immediately with empty list (caller manages lifecycle).
    """
    if duration_ms == 0:
        return []

    messages: list[ConsoleMessage] = []
    history = _ensure_console_history(page)

    def record(message: ConsoleMessage) -> None:
        if _console_type(message) in types:
            messages.append(message)
            history.append(message)

    page.on("console", record)
    await asyncio.sleep(duration_ms / 1000)
    remove_listener = getattr(page, "remove_listener", None)
    if callable(remove_listener):
        _ = remove_listener("console", record)
    return messages


async def assert_no_console_errors(
    page: Page,
    *,
    filter_pattern: str | None = None,
    sample_limit: int = 5,
) -> None:
    """Check console errors accumulated so far. Raise ConsoleErrorExceeded if any (default) or > 0.
    `filter_pattern`: if provided, ignore errors whose text matches this regex (e.g., favicon 404s).
    Implementation: read page console history (the harness should have subscribed before this call).
    """
    messages = [message for message in _console_history(page) if _console_type(message) == "error"]
    if filter_pattern is not None:
        compiled_filter = re.compile(filter_pattern)
        messages = [
            message for message in messages if not compiled_filter.search(_console_text(message))
        ]

    if messages:
        raise ConsoleErrorExceeded(
            len(messages),
            0,
            [_console_text(message) for message in messages[:sample_limit]],
        )


async def assert_boundary_invariant(
    page: Page,
    invariant: BoundaryInvariant,
) -> None:
    """Evaluate a single BoundaryInvariant against current page state.
    Dispatch by `kind`:
      - `regex_present`: assert_dom_text_matches(pattern)
      - `regex_absent`: assert_dom_text_absent(pattern)
      - `exact`: read numeric/text value from page, assert equals `expect`
      - `range`: read numeric value, assert min <= v <= max
      - `upper_bound`: read numeric value, assert v <= expect
    Raise BoundaryViolation on failure with invariant.id, kind, expected, actual.
    Raise ValueError on unknown kind.
    """
    selector = invariant.filter or "body"

    kind = cast(str, invariant.kind)

    match kind:
        case "regex_present":
            pattern = _required_pattern(invariant)
            try:
                await assert_dom_text_matches(page, pattern, selector=selector)
            except DOMAssertionFailure as exc:
                raise BoundaryViolation(invariant.id, kind, pattern, str(exc)) from exc
        case "regex_absent":
            pattern = _required_pattern(invariant)
            try:
                await assert_dom_text_absent(page, pattern, selector=selector)
            except DOMAssertionFailure as exc:
                raise BoundaryViolation(invariant.id, kind, f"not {pattern}", str(exc)) from exc
        case "exact":
            actual = (await _read_boundary_text(page, selector)).strip()
            expected = _expected_text(invariant)
            if actual != expected:
                raise BoundaryViolation(invariant.id, kind, expected, actual)
        case "range":
            actual_text = (await _read_boundary_text(page, selector)).strip()
            value = _parse_boundary_number(invariant, actual_text)
            minimum, maximum = _required_range(invariant)
            if value < minimum or value > maximum:
                raise BoundaryViolation(
                    invariant.id,
                    kind,
                    f"{minimum}..{maximum}",
                    actual_text,
                )
        case "upper_bound":
            actual_text = (await _read_boundary_text(page, selector)).strip()
            value = _parse_boundary_number(invariant, actual_text)
            upper_bound = _parse_expected_number(invariant)
            if value > upper_bound:
                raise BoundaryViolation(
                    invariant.id,
                    kind,
                    f"<= {upper_bound:g}",
                    actual_text,
                )
        case _:
            raise ValueError(f"Unknown boundary invariant kind: {kind}")


async def assert_all_invariants(
    page: Page,
    invariants: list[BoundaryInvariant],
) -> list[AssertionFailure]:
    """Run all boundary invariants. Does NOT raise — returns list of failures.
    Caller decides whether to fail the charter or just log.
    """
    failures: list[AssertionFailure] = []
    for invariant in invariants:
        try:
            await assert_boundary_invariant(page, invariant)
        except AssertionFailure as exc:
            failures.append(exc)
    return failures


def _valid_next_status(from_status: ChargenStatus | None) -> ChargenStatus | None:
    if from_status is None:
        return STATUS_ORDER[0]
    return next_status(from_status)


def _playwright_timeout_types() -> tuple[type[BaseException], ...]:
    try:
        from playwright.async_api import TimeoutError as PlaywrightTimeoutError
    except ImportError:
        return (TimeoutError,)
    return (TimeoutError, PlaywrightTimeoutError)


def _ensure_console_history(page: Page) -> list[ConsoleMessage]:
    history = _console_history(page)
    if history:
        return history
    history: list[ConsoleMessage] = []
    _CONSOLE_HISTORIES[page] = history
    return history


def _console_history(page: Page) -> list[ConsoleMessage]:
    history = cast(object, getattr(page, "_agent_qa_console_messages", []))
    if isinstance(history, list):
        return cast("list[ConsoleMessage]", history)
    return _CONSOLE_HISTORIES.get(page, [])


def _console_text(message: ConsoleMessage) -> str:
    text = cast(object, getattr(message, "text", ""))
    if callable(text):
        text = text()
    return str(text)


def _console_type(message: ConsoleMessage) -> str:
    message_type = cast(object, getattr(message, "type", ""))
    if callable(message_type):
        message_type = message_type()
    return str(message_type)


def _required_pattern(invariant: BoundaryInvariant) -> str:
    if invariant.pattern is None:
        raise BoundaryViolation(invariant.id, cast(str, invariant.kind), "regex pattern", "None")
    return invariant.pattern


def _expected_text(invariant: BoundaryInvariant) -> str:
    return str(cast(object, invariant.expect))


async def _read_boundary_text(page: Page, selector: str) -> str:
    locator: _TextLocator = page.locator(selector)
    return await locator.inner_text(timeout=3000)


def _parse_boundary_number(invariant: BoundaryInvariant, actual_text: str) -> float:
    try:
        return float(actual_text)
    except ValueError as exc:
        raise BoundaryViolation(invariant.id, invariant.kind, "numeric value", actual_text) from exc


def _parse_expected_number(invariant: BoundaryInvariant) -> float:
    expected = cast(object, invariant.expect)
    try:
        return _to_float(expected)
    except (TypeError, ValueError) as exc:
        raise BoundaryViolation(
            invariant.id,
            cast(str, invariant.kind),
            "numeric expect",
            str(expected),
        ) from exc


def _to_float(value: object) -> float:
    if isinstance(value, str | int | float):
        return float(value)
    raise TypeError(f"unsupported numeric value: {value!r}")


def _required_range(invariant: BoundaryInvariant) -> tuple[int, int]:
    if invariant.min is None or invariant.max is None:
        raise BoundaryViolation(invariant.id, invariant.kind, "min and max", "missing bound")
    return invariant.min, invariant.max
