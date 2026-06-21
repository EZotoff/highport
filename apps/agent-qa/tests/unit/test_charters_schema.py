from copy import deepcopy

import pytest
from agent_qa.charters.schema import Budget, Charter
from pydantic import ValidationError


def valid_charter_data() -> dict[str, object]:
    return {
        "id": "A1",
        "title": "Forward-only chargen",
        "mission": "Explore chargen with a player to discover whether FSM transitions hold.",
        "persona": {"primary": "player", "secondary": None, "critic": None},
        "preconditions": {
            "services_required": ["web"],
            "services_optional": ["hocuspocus"],
            "services_prohibited": [],
        },
        "fsm_expectations": [
            {
                "transition": ["background", "career_selection"],
                "trigger": "continue from background",
            }
        ],
        "boundary_invariants": [
            {"id": "no_errors", "kind": "exact", "expect": 0},
            {"id": "title", "kind": "regex_present", "pattern": "Chargen"},
        ],
        "behavioral_checks": [
            {"id": "clicked_continue", "kind": "tape_contains", "actions": ["click_continue"]}
        ],
        "success_criteria": {"required": ["fsm_reached_career_selection"]},
    }


def test_valid_charter_passes() -> None:
    charter = Charter.model_validate(valid_charter_data())

    assert charter.id == "A1"
    assert charter.version == 1
    assert charter.fsm_expectations[0].transition == ("background", "career_selection")


def test_missing_required_field_fails() -> None:
    data = valid_charter_data()
    data.pop("mission")

    with pytest.raises(ValidationError) as error:
        Charter.model_validate(data)

    assert "mission" in str(error.value)


def test_invalid_service_enum_fails_with_specific_error() -> None:
    data = valid_charter_data()
    preconditions = deepcopy(data["preconditions"])
    assert isinstance(preconditions, dict)
    preconditions["services_required"] = ["web", "redis"]
    data["preconditions"] = preconditions

    with pytest.raises(ValidationError) as error:
        Charter.model_validate(data)

    assert "unknown services" in str(error.value)
    assert "redis" in str(error.value)


def test_invalid_backward_fsm_transition_fails() -> None:
    data = valid_charter_data()
    data["fsm_expectations"] = [
        {"transition": ["career_selection", "background"], "trigger": "go back"}
    ]

    with pytest.raises(ValidationError) as error:
        Charter.model_validate(data)

    assert "move forward" in str(error.value)


def test_budget_defaults_are_sensible() -> None:
    budget = Budget()

    assert budget.max_steps == 50
    assert budget.max_tokens_per_step == 2000
    assert budget.max_total_tokens == 100000
    assert budget.max_wall_clock_s == 600
    assert budget.retry_on_infra_failure == 1


def test_range_boundary_requires_ordered_min_and_max() -> None:
    data = valid_charter_data()
    data["boundary_invariants"] = [{"id": "latency", "kind": "range", "min": 10, "max": 5}]

    with pytest.raises(ValidationError) as error:
        Charter.model_validate(data)

    assert "min cannot exceed max" in str(error.value)
