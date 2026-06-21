import pytest
from agent_qa.runtime.fsm import (
    STATUS_ORDER,
    ChargenStatus,
    InvalidTransitionError,
    assert_valid_transition,
    is_forward_transition,
    is_valid_transition,
    next_status,
    parse_status,
    transition_distance,
)


def test_exhaustive_transition_matrix() -> None:
    valid_count = 0
    invalid_count = 0

    for from_status in STATUS_ORDER:
        for to_status in STATUS_ORDER:
            expected = next_status(from_status) == to_status
            actual = is_valid_transition(from_status, to_status)
            assert actual is expected
            if actual:
                valid_count += 1
            else:
                invalid_count += 1

    assert valid_count == 4
    assert invalid_count == 21


@pytest.mark.parametrize(
    ("from_status", "to_status"),
    [
        (ChargenStatus.BACKGROUND, ChargenStatus.CAREER_SELECTION),
        (ChargenStatus.CAREER_SELECTION, ChargenStatus.TERM_RESOLUTION),
        (ChargenStatus.TERM_RESOLUTION, ChargenStatus.MUSTERING_OUT),
        (ChargenStatus.MUSTERING_OUT, ChargenStatus.FINALIZED),
    ],
)
def test_assert_valid_transition_allows_immediate_forward(
    from_status: ChargenStatus, to_status: ChargenStatus
) -> None:
    assert_valid_transition(from_status, to_status)


def test_assert_valid_transition_rejects_skip_with_helpful_message() -> None:
    with pytest.raises(InvalidTransitionError) as exc_info:
        assert_valid_transition(ChargenStatus.BACKGROUND, ChargenStatus.TERM_RESOLUTION)

    message = str(exc_info.value)
    assert "background" in message
    assert "term_resolution" in message
    assert "career_selection" in message


def test_terminal_self_loop_is_invalid() -> None:
    assert not is_valid_transition(ChargenStatus.FINALIZED, ChargenStatus.FINALIZED)
    assert next_status(ChargenStatus.FINALIZED) is None


def test_distance_and_forward_transition_helpers() -> None:
    assert transition_distance(ChargenStatus.BACKGROUND, ChargenStatus.BACKGROUND) == 0
    assert transition_distance(ChargenStatus.BACKGROUND, ChargenStatus.MUSTERING_OUT) == 3
    assert transition_distance(ChargenStatus.MUSTERING_OUT, ChargenStatus.BACKGROUND) == -3
    assert is_forward_transition(ChargenStatus.BACKGROUND, ChargenStatus.FINALIZED)
    assert not is_forward_transition(ChargenStatus.FINALIZED, ChargenStatus.BACKGROUND)
    assert not is_forward_transition(ChargenStatus.FINALIZED, ChargenStatus.FINALIZED)


def test_parse_status_is_case_sensitive_and_lists_valid_values() -> None:
    assert parse_status("background") is ChargenStatus.BACKGROUND

    with pytest.raises(ValueError) as case_exc_info:
        _ = parse_status("Background")
    assert "background" in str(case_exc_info.value)

    with pytest.raises(ValueError) as unknown_exc_info:
        _ = parse_status("unknown")
    message = str(unknown_exc_info.value)
    for status in STATUS_ORDER:
        assert status.value in message
