import pytest
from agent_qa.personas.schema import Persona, ScoringConfig
from pydantic import ValidationError


def valid_player_data() -> dict[str, object]:
    return {
        "id": "player",
        "role": "player",
        "model": {
            "planner": "claude-haiku-4-5",
            "driver": "claude-sonnet-4-5",
            "temperature": 0.3,
        },
        "behavioral_constraints": ["never_refresh_page"],
        "access": {"chargen": "read_write", "graph": "read_only", "chat": False},
    }


def valid_critic_data() -> dict[str, object]:
    return {
        "id": "ui-critic",
        "role": "ui-critic",
        "model": {
            "planner": "claude-haiku-4-5",
            "critic": "claude-sonnet-4-5",
            "temperature": 0.0,
        },
        "behavioral_constraints": ["never_click_buttons"],
        "scoring": {"scale": 5, "pass_threshold": 3.5},
    }


def test_valid_player_persona_passes() -> None:
    persona = Persona.model_validate(valid_player_data())

    assert persona.id == "player"
    assert persona.model.driver == "claude-sonnet-4-5"
    assert persona.ux_preferences.prefers_clear_labels is True


def test_missing_required_model_field_fails() -> None:
    data = valid_player_data()
    data["model"] = {"driver": "claude-sonnet-4-5"}

    with pytest.raises(ValidationError) as error:
        Persona.model_validate(data)

    assert "planner" in str(error.value)


def test_invalid_role_enum_fails() -> None:
    data = valid_player_data()
    data["role"] = "referee"

    with pytest.raises(ValidationError) as error:
        Persona.model_validate(data)

    assert "player" in str(error.value)
    assert "ui-critic" in str(error.value)


def test_invalid_access_enum_fails() -> None:
    data = valid_player_data()
    data["access"] = {"chargen": "admin", "graph": "read_only", "chat": False}

    with pytest.raises(ValidationError) as error:
        Persona.model_validate(data)

    assert "read_write" in str(error.value)
    assert "gm_controls_only" in str(error.value)


def test_ui_critic_requires_scoring() -> None:
    data = valid_critic_data()
    data.pop("scoring")

    with pytest.raises(ValidationError) as error:
        Persona.model_validate(data)

    assert "require scoring" in str(error.value)


def test_scoring_defaults_are_sensible() -> None:
    scoring = ScoringConfig()

    assert scoring.scale == 5
    assert scoring.dimensions == ["typography", "spacing", "copy_clarity", "cls", "contrast"]
    assert scoring.pass_threshold == 3.5
    assert scoring.samples_per_state == 3
    assert scoring.aggregate == "median"
