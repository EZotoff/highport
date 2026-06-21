from enum import Enum


class ChargenStatus(str, Enum):  # noqa: UP042
    BACKGROUND = "background"
    CAREER_SELECTION = "career_selection"
    TERM_RESOLUTION = "term_resolution"
    MUSTERING_OUT = "mustering_out"
    FINALIZED = "finalized"


STATUS_ORDER: tuple[ChargenStatus, ...] = (
    ChargenStatus.BACKGROUND,
    ChargenStatus.CAREER_SELECTION,
    ChargenStatus.TERM_RESOLUTION,
    ChargenStatus.MUSTERING_OUT,
    ChargenStatus.FINALIZED,
)

_STATUS_INDEX: dict[ChargenStatus, int] = {
    status: index for index, status in enumerate(STATUS_ORDER)
}


class InvalidTransitionError(ValueError):
    """Raised when a charter specifies or observes an illegal status transition."""


def is_valid_transition(from_status: ChargenStatus, to_status: ChargenStatus) -> bool:
    return transition_distance(from_status, to_status) == 1


def assert_valid_transition(from_status: ChargenStatus, to_status: ChargenStatus) -> None:
    if is_valid_transition(from_status, to_status):
        return

    valid_next = next_status(from_status)
    valid_next_value = valid_next.value if valid_next is not None else None
    message = (
        f"Invalid chargen status transition: {from_status.value} -> {to_status.value}; "
        f"valid next state is {valid_next_value}"
    )
    raise InvalidTransitionError(message)


def next_status(status: ChargenStatus) -> ChargenStatus | None:
    next_index = _STATUS_INDEX[status] + 1
    if next_index >= len(STATUS_ORDER):
        return None
    return STATUS_ORDER[next_index]


def transition_distance(from_status: ChargenStatus, to_status: ChargenStatus) -> int:
    return _STATUS_INDEX[to_status] - _STATUS_INDEX[from_status]


def is_forward_transition(from_status: ChargenStatus, to_status: ChargenStatus) -> bool:
    return transition_distance(from_status, to_status) > 0


def parse_status(s: str) -> ChargenStatus:
    try:
        return ChargenStatus(s)
    except ValueError as exc:
        valid_values = ", ".join(status.value for status in STATUS_ORDER)
        raise ValueError(f"Unknown chargen status {s!r}; valid values: {valid_values}") from exc
