from pathlib import Path

import pytest
import yaml
from agent_qa.charters import loader as charter_loader
from agent_qa.personas import loader as persona_loader


def test_s0_loads_via_charter_loader() -> None:
    charter = charter_loader.load_charter("S0")

    assert charter.id == "S0"
    assert charter.title == "Harness smoke test"
    assert charter.budget.max_steps == 8
    assert charter.login is not None
    assert charter.login.user_role == "player1"


def test_charter_load_all_includes_s0() -> None:
    charters = charter_loader.load_all()

    assert [charter.id for charter in charters] == ["S0"]


def test_persona_loader_loads_all_three_personas() -> None:
    personas = persona_loader.load_all()

    assert {persona.id for persona in personas} == {"player", "gm", "ui-critic"}


def test_missing_charter_file_raises() -> None:
    with pytest.raises(FileNotFoundError):
        charter_loader.load_charter("missing")


def test_missing_persona_file_raises() -> None:
    with pytest.raises(FileNotFoundError):
        persona_loader.load_persona("missing")


def test_charter_id_mismatch_raises(monkeypatch, tmp_path: Path) -> None:
    data = {
        "id": "wrong",
        "title": "Mismatch",
        "mission": "Explore mismatch with tests to discover loader validation.",
        "persona": {"primary": "player"},
        "preconditions": {
            "services_required": ["web"],
            "services_optional": [],
            "services_prohibited": [],
        },
        "success_criteria": {"required": ["loaded"]},
    }
    (tmp_path / "right.yaml").write_text(yaml.safe_dump(data), encoding="utf-8")
    monkeypatch.setattr(charter_loader, "DATA_DIR", tmp_path)

    with pytest.raises(ValueError) as error:
        charter_loader.load_charter("right")

    assert "does not match filename" in str(error.value)


def test_persona_id_mismatch_raises(monkeypatch, tmp_path: Path) -> None:
    data = {
        "id": "wrong",
        "role": "player",
        "model": {"planner": "claude-haiku-4-5", "driver": "claude-sonnet-4-5"},
    }
    (tmp_path / "right.yaml").write_text(yaml.safe_dump(data), encoding="utf-8")
    monkeypatch.setattr(persona_loader, "DATA_DIR", tmp_path)

    with pytest.raises(ValueError) as error:
        persona_loader.load_persona("right")

    assert "does not match filename" in str(error.value)
