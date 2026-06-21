from dataclasses import dataclass
from itertools import pairwise
from unittest.mock import AsyncMock, Mock

import pytest
from agent_qa.charters.schema import BoundaryInvariant
from agent_qa.reporting.assertions import (
    AssertionResult,
    BoundaryViolation,
    ConsoleErrorExceeded,
    DOMAssertionFailure,
    FSMViolation,
    assert_all_invariants,
    assert_boundary_invariant,
    assert_boundary_invariant_dom,
    assert_dom_text_absent,
    assert_dom_text_matches,
    assert_fsm_transition,
    assert_no_console_errors,
    assert_status_advances,
    read_current_status_from_dom,
)
from agent_qa.runtime.fsm import STATUS_ORDER, ChargenStatus


@dataclass
class FakeConsoleMessage:
    type: str
    text: str


@pytest.mark.parametrize(
    ("from_status", "to_status"),
    list(pairwise(STATUS_ORDER)),
)
def test_assert_fsm_transition_allows_four_forward_transitions(
    from_status: ChargenStatus, to_status: ChargenStatus
) -> None:
    assert_fsm_transition(from_status, to_status)


@pytest.mark.parametrize(
    ("from_status", "to_status"),
    [
        (ChargenStatus.BACKGROUND, ChargenStatus.TERM_RESOLUTION),
        (ChargenStatus.TERM_RESOLUTION, ChargenStatus.CAREER_SELECTION),
        (ChargenStatus.BACKGROUND, ChargenStatus.BACKGROUND),
    ],
)
def test_assert_fsm_transition_rejects_skip_reverse_and_loop(
    from_status: ChargenStatus, to_status: ChargenStatus
) -> None:
    with pytest.raises(FSMViolation) as exc_info:
        assert_fsm_transition(from_status, to_status)

    message = str(exc_info.value)
    assert "Illegal transition" in message
    assert "Valid next" in message


def test_assert_fsm_transition_allows_initial_background() -> None:
    assert_fsm_transition(None, ChargenStatus.BACKGROUND)


def test_assert_fsm_transition_rejects_initial_career_selection() -> None:
    with pytest.raises(FSMViolation) as exc_info:
        assert_fsm_transition(None, ChargenStatus.CAREER_SELECTION)

    assert str(exc_info.value) == (
        "Illegal transition: None -> career_selection. Valid next: background"
    )


def test_assert_status_advances_requires_forward_by_one() -> None:
    assert_status_advances(ChargenStatus.BACKGROUND, ChargenStatus.CAREER_SELECTION)

    with pytest.raises(FSMViolation):
        assert_status_advances(ChargenStatus.BACKGROUND, ChargenStatus.TERM_RESOLUTION)

    with pytest.raises(FSMViolation):
        assert_status_advances(ChargenStatus.CAREER_SELECTION, ChargenStatus.BACKGROUND)


async def test_assert_dom_text_matches_passes_when_pattern_found() -> None:
    page = AsyncMock()
    wait_for_function = AsyncMock(return_value=True)
    page.wait_for_function = wait_for_function

    await assert_dom_text_matches(page, "Chargen", selector="main", timeout_ms=123)

    wait_for_function.assert_awaited_once()


async def test_assert_dom_text_matches_raises_on_timeout() -> None:
    page = AsyncMock()
    page.wait_for_function = AsyncMock(side_effect=TimeoutError)

    with pytest.raises(DOMAssertionFailure) as exc_info:
        await assert_dom_text_matches(page, "Missing", selector="main", timeout_ms=10)

    assert str(exc_info.value) == "Pattern 'Missing' not found in 'main' within 10ms"


async def test_assert_dom_text_absent_passes_when_pattern_times_out() -> None:
    page = AsyncMock()
    page.wait_for_function = AsyncMock(side_effect=TimeoutError)

    await assert_dom_text_absent(page, "Error", selector="body", timeout_ms=10)


async def test_assert_dom_text_absent_raises_when_pattern_present() -> None:
    page = AsyncMock()
    page.wait_for_function = AsyncMock(return_value=True)

    with pytest.raises(DOMAssertionFailure) as exc_info:
        await assert_dom_text_absent(page, "Error", selector="body", timeout_ms=10)

    assert "unexpectedly found" in str(exc_info.value)


async def test_read_current_status_from_dom_reads_attribute_and_rejects_invalid() -> None:
    page = AsyncMock()
    element = AsyncMock()
    element.get_attribute = AsyncMock(return_value="career_selection")
    page.wait_for_selector = AsyncMock(return_value=element)

    assert await read_current_status_from_dom(page) is ChargenStatus.CAREER_SELECTION

    element.get_attribute = AsyncMock(return_value="not_a_status")
    with pytest.raises(ValueError):
        _ = await read_current_status_from_dom(page)


async def test_read_current_status_from_dom_falls_back_to_visible_text() -> None:
    page = AsyncMock()
    element = AsyncMock()
    element.get_attribute = AsyncMock(return_value=None)
    element.inner_text = AsyncMock(return_value="term_resolution")
    page.wait_for_selector = AsyncMock(return_value=element)

    assert await read_current_status_from_dom(page) is ChargenStatus.TERM_RESOLUTION


async def test_assert_no_console_errors_passes_with_zero_errors() -> None:
    page = AsyncMock()
    page._agent_qa_console_messages = [FakeConsoleMessage("warning", "heads up")]

    await assert_no_console_errors(page)


async def test_assert_no_console_errors_raises_for_accumulated_errors() -> None:
    page = AsyncMock()
    page._agent_qa_console_messages = [
        FakeConsoleMessage("error", "boom"),
        FakeConsoleMessage("error", "favicon 404"),
    ]

    with pytest.raises(ConsoleErrorExceeded) as exc_info:
        await assert_no_console_errors(page, filter_pattern="favicon", sample_limit=5)

    assert exc_info.value.count == 1
    assert exc_info.value.limit == 0
    assert exc_info.value.sample_messages == ["boom"]
    assert str(exc_info.value) == "Console errors: 1 (limit 0). Sample: ['boom']"


async def test_assert_boundary_invariant_regex_present_and_absent() -> None:
    present_page = AsyncMock()
    present_page.wait_for_function = AsyncMock(return_value=True)

    await assert_boundary_invariant(
        present_page, BoundaryInvariant(id="title", kind="regex_present", pattern="Chargen")
    )

    absent_page = AsyncMock()
    absent_page.wait_for_function = AsyncMock(side_effect=TimeoutError)

    await assert_boundary_invariant(
        absent_page, BoundaryInvariant(id="no_crash", kind="regex_absent", pattern="Crash")
    )


async def test_assert_boundary_invariant_dom_regex_uses_body_inner_text() -> None:
    page = AsyncMock()
    page.evaluate = AsyncMock(return_value="Character Gen Background")

    result = await assert_boundary_invariant_dom(
        BoundaryInvariant(id="shell", kind="regex_present", pattern="Background"), page, "fallback"
    )

    assert result == AssertionResult(True, "Character Gen Background", None)
    page.evaluate.assert_awaited_once_with("(...args) => document.body.innerText")


async def test_assert_boundary_invariant_dom_element_visible_waits_for_selector() -> None:
    locator = AsyncMock()
    page = AsyncMock()
    page.locator = Mock(return_value=locator)

    result = await assert_boundary_invariant_dom(
        BoundaryInvariant(id="create", kind="element_visible", filter='button:has-text("Create")'),
        page,
        "",
    )

    assert result.passed is True
    locator.wait_for.assert_awaited_once_with(timeout=2000)


async def test_assert_boundary_invariant_dom_element_has_text_counts_matches() -> None:
    filtered = AsyncMock()
    filtered.count = AsyncMock(return_value=1)
    locator = Mock()
    locator.filter = Mock(return_value=filtered)
    page = AsyncMock()
    page.locator = Mock(return_value=locator)

    result = await assert_boundary_invariant_dom(
        BoundaryInvariant(id="step", kind="element_has_text", filter="nav", expect="Step 1"),
        page,
        "",
    )

    assert result.passed is True
    locator.filter.assert_called_once_with(has_text="Step 1")


async def test_assert_boundary_invariant_dom_reads_fsm_state_attribute() -> None:
    page = AsyncMock()
    page.evaluate = AsyncMock(return_value="background")

    result = await assert_boundary_invariant_dom(
        BoundaryInvariant(id="status", kind="fsm_state_is", expect="background"), page, ""
    )

    assert result.passed is True
    assert result.observed == "background"


async def test_assert_boundary_invariant_dom_url_matches_page_url() -> None:
    page = AsyncMock()
    page.url = "http://localhost:18120/chargen"

    result = await assert_boundary_invariant_dom(
        BoundaryInvariant(id="url", kind="url_matches", pattern="/chargen"), page, ""
    )

    assert result.passed is True
    assert result.observed == "http://localhost:18120/chargen"


async def test_assert_boundary_invariant_dom_falls_back_without_page() -> None:
    result = await assert_boundary_invariant_dom(
        BoundaryInvariant(id="url", kind="url_matches", pattern="/chargen"),
        None,
        "http://localhost:18120/chargen",
    )

    assert result.passed is True


@pytest.mark.parametrize(
    ("invariant", "text"),
    [
        (BoundaryInvariant(id="errors", kind="exact", expect=0, filter="#errors"), "0"),
        (BoundaryInvariant(id="latency", kind="range", min=10, max=20, filter="#latency"), "15"),
        (BoundaryInvariant(id="noise", kind="upper_bound", expect=3, filter="#errors"), "2"),
    ],
)
async def test_assert_boundary_invariant_value_kinds_pass(
    invariant: BoundaryInvariant, text: str
) -> None:
    page = AsyncMock()
    locator = AsyncMock()
    locator.inner_text = AsyncMock(return_value=text)
    locator_factory = Mock(return_value=locator)
    page.locator = locator_factory

    await assert_boundary_invariant(page, invariant)

    locator_factory.assert_called_once_with(invariant.filter)


@pytest.mark.parametrize(
    ("invariant", "text"),
    [
        (BoundaryInvariant(id="errors", kind="exact", expect=0, filter="#errors"), "1"),
        (BoundaryInvariant(id="latency", kind="range", min=10, max=20, filter="#latency"), "25"),
        (BoundaryInvariant(id="noise", kind="upper_bound", expect=3, filter="#errors"), "4"),
    ],
)
async def test_assert_boundary_invariant_value_kinds_raise_boundary_violation(
    invariant: BoundaryInvariant, text: str
) -> None:
    page = AsyncMock()
    locator = AsyncMock()
    locator.inner_text = AsyncMock(return_value=text)
    page.locator = Mock(return_value=locator)

    with pytest.raises(BoundaryViolation):
        await assert_boundary_invariant(page, invariant)


async def test_assert_boundary_invariant_unknown_kind_raises_value_error() -> None:
    page = AsyncMock()
    invariant = BoundaryInvariant.model_construct(id="unknown", kind="mystery")

    with pytest.raises(ValueError) as exc_info:
        await assert_boundary_invariant(page, invariant)

    assert str(exc_info.value) == "Unknown boundary invariant kind: mystery"


async def test_assert_all_invariants_returns_failures_without_raising() -> None:
    page = AsyncMock()
    locator = AsyncMock()
    locator.inner_text = AsyncMock(return_value="5")
    page.locator = Mock(return_value=locator)

    failures = await assert_all_invariants(
        page,
        [
            BoundaryInvariant(id="ok", kind="exact", expect=5, filter="#value"),
            BoundaryInvariant(id="bad", kind="upper_bound", expect=3, filter="#value"),
        ],
    )

    assert len(failures) == 1
    assert isinstance(failures[0], BoundaryViolation)
