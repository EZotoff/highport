from datetime import UTC, datetime
from pathlib import Path
from typing import ClassVar

import pytest
from agent_qa.auth import TestUser
from agent_qa.charters.loader import load_charter
from agent_qa.config import Settings
from agent_qa.reporting.evidence import EvidenceDir
from agent_qa.runtime import multiplayer
from agent_qa.runtime.driver import DriverResult, StepCapture


class FakePage:
    def __init__(self, text: str) -> None:
        self.text = text
        self.url = "http://localhost:18120/chargen"

    async def evaluate(self, script: str) -> str:
        _ = script
        return self.text


class FakeDriver:
    results_by_role: ClassVar[dict[str, DriverResult]] = {}
    pages_by_role: ClassVar[dict[str, FakePage]] = {}
    raised_roles: ClassVar[set[str]] = set()
    instances: ClassVar[list["FakeDriver"]] = []
    run_order: ClassVar[list[str]] = []

    def __init__(self, *args: object, **kwargs: object) -> None:
        self.args = args
        self.kwargs = kwargs
        login_user = kwargs["login_user"]
        assert isinstance(login_user, TestUser)
        self.role = login_user.role
        self.last_page = self.pages_by_role.get(self.role, FakePage("Character Gen"))
        self.closed = False
        self.instances.append(self)

    async def run(self) -> DriverResult:
        self.run_order.append(self.role)
        if self.role in self.raised_roles:
            raise RuntimeError(f"boom {self.role}")
        return self.results_by_role.get(self.role, driver_result(self.role))

    async def close(self) -> None:
        self.closed = True


def reset_fake_driver() -> None:
    FakeDriver.results_by_role = {}
    FakeDriver.pages_by_role = {}
    FakeDriver.raised_roles = set()
    FakeDriver.instances = []
    FakeDriver.run_order = []


def driver_result(
    role: str,
    *,
    success: bool = True,
    termination_reason: str = "done",
    steps: int = 1,
) -> DriverResult:
    captures = [
        StepCapture(
            step_index=index,
            timestamp=datetime.now(UTC),
            url="http://localhost:18120/chargen",
            title=f"Highport {role}",
            next_goal="done",
            actions=[],
            screenshot_b64=None,
            fsm_state_observed=None,
            tokens_used=10,
        )
        for index in range(1, steps + 1)
    ]
    return DriverResult(
        success=success,
        steps=captures,
        final_url="http://localhost:18120/chargen",
        final_result=f"{role} complete",
        errors=[] if success else [termination_reason],
        total_tokens=10 * steps,
        wall_clock_s=1.0,
        budget_snapshot={
            "steps_used": steps,
            "tokens_used": 10 * steps,
            "wall_clock_s": 1.0,
            "last_step_tokens": 10,
        },
        termination_reason=termination_reason,
        login_completed=True,
    )


def evidence(tmp_path: Path, charter_id: str = "A1") -> EvidenceDir:
    return EvidenceDir.create(tmp_path, charter_id)


def player_specs() -> list[multiplayer.PlayerSpec]:
    persona = load_charter("A1")
    assert persona.personas is not None
    return multiplayer.build_players_from_charter(persona, Settings())


def test_constructs_with_execution_mode(tmp_path: Path) -> None:
    charter = load_charter("A1")

    orchestrator = multiplayer.MultiPlayerOrchestrator(
        charter, player_specs(), evidence(tmp_path), execution_mode="sequential"
    )

    assert orchestrator.execution_mode == "sequential"
    with pytest.raises(ValueError, match="execution_mode"):
        multiplayer.MultiPlayerOrchestrator(
            charter, player_specs(), evidence(tmp_path), execution_mode="bad"
        )


@pytest.mark.asyncio
async def test_runs_players_sequentially(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    reset_fake_driver()
    monkeypatch.setattr(multiplayer, "CharterDriver", FakeDriver)
    FakeDriver.pages_by_role = {
        "player1": FakePage("player1 ready"),
        "player2": FakePage("Agent QA player1 visible"),
    }

    result = await multiplayer.MultiPlayerOrchestrator(
        load_charter("A1"), player_specs(), evidence(tmp_path)
    ).run()

    assert result.success is True
    assert FakeDriver.run_order == ["player1", "player2"]
    assert all(driver.closed for driver in FakeDriver.instances)


@pytest.mark.asyncio
async def test_cross_player_assertion_targets_player2(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    reset_fake_driver()
    monkeypatch.setattr(multiplayer, "CharterDriver", FakeDriver)
    FakeDriver.pages_by_role = {
        "player1": FakePage("only player1"),
        "player2": FakePage("Session Participants Agent QA player1"),
    }

    result = await multiplayer.MultiPlayerOrchestrator(
        load_charter("A1"), player_specs(), evidence(tmp_path)
    ).run()

    targeted = [
        row for row in result.cross_player_assertions if row["id"] == "player2_sees_player1"
    ]
    assert targeted[0]["target"] == "player2"
    assert targeted[0]["passed"] is True


@pytest.mark.asyncio
async def test_cross_player_assertion_failure_fails_run(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    reset_fake_driver()
    monkeypatch.setattr(multiplayer, "CharterDriver", FakeDriver)
    FakeDriver.pages_by_role = {"player2": FakePage("Session Participants nobody else")}

    result = await multiplayer.MultiPlayerOrchestrator(
        load_charter("A1"), player_specs(), evidence(tmp_path)
    ).run()

    assert result.success is False
    assert result.termination_reason == "cross_player_assertions_failed"


@pytest.mark.asyncio
async def test_player_exception_is_captured(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    reset_fake_driver()
    monkeypatch.setattr(multiplayer, "CharterDriver", FakeDriver)
    FakeDriver.raised_roles = {"player2"}

    result = await multiplayer.MultiPlayerOrchestrator(
        load_charter("A1"), player_specs(), evidence(tmp_path)
    ).run()

    assert result.success is False
    assert result.players[1].driver_result.errors == ["RuntimeError: boom player2"]


@pytest.mark.asyncio
async def test_stopped_player_fails_orchestration(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    reset_fake_driver()
    monkeypatch.setattr(multiplayer, "CharterDriver", FakeDriver)
    FakeDriver.results_by_role = {
        "player1": driver_result("player1"),
        "player2": driver_result("player2", success=False, termination_reason="stopped"),
    }

    result = await multiplayer.MultiPlayerOrchestrator(
        load_charter("A1"), player_specs(), evidence(tmp_path)
    ).run()

    assert result.success is False
    assert result.termination_reason == "stopped"


@pytest.mark.asyncio
async def test_total_budget_is_enforced(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    reset_fake_driver()
    monkeypatch.setattr(multiplayer, "CharterDriver", FakeDriver)
    charter = load_charter("A1").model_copy(
        update={"budget": load_charter("A1").budget.model_copy(update={"max_steps": 1})}, deep=True
    )

    result = await multiplayer.MultiPlayerOrchestrator(
        charter, player_specs(), evidence(tmp_path)
    ).run()

    assert result.success is False
    assert result.termination_reason == "budget_exceeded"


def test_build_players_from_charter_maps_personas_and_users() -> None:
    charter = load_charter("A1")

    players = multiplayer.build_players_from_charter(charter, Settings())

    assert [player.role for player in players] == ["player1", "player2"]
    assert [player.user.email for player in players] == [
        "player1@agent-qa.test",
        "player2@agent-qa.test",
    ]
    assert players[0].persona.id == "player"
    assert "Sign in as player1" in players[0].mission
