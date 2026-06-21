from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from agent_qa.charters.loader import load_charter
from agent_qa.config import Settings
from agent_qa.health.probes import ProbeResult, ServiceName, ServiceStatus
from agent_qa.reporting.evidence import EvidenceDir
from agent_qa.runtime import session
from agent_qa.runtime.driver import DriverResult, StepCapture


def settings(tmp_path: Path) -> Settings:
    return Settings(evidence_root=tmp_path)


def probe_result(service: ServiceName, status: ServiceStatus) -> ProbeResult:
    return ProbeResult(service, status, 1.0, status.value, datetime.now(UTC))


class StackReport:
    def __init__(self, status: ServiceStatus) -> None:
        self.results = {service: probe_result(service, status) for service in ServiceName}

    def all_required_up(self, required: set[ServiceName]) -> bool:
        return all(self.results[service].status is ServiceStatus.UP for service in required)


class FakeLocator:
    async def wait_for(self, *, timeout: int) -> None:
        _ = timeout


class FakePage:
    url = "http://localhost:18120/chargen"

    async def evaluate(self, script: str) -> str:
        _ = script
        return "Character Gen Background Create New Character"

    def locator(self, selector: str) -> FakeLocator:
        _ = selector
        return FakeLocator()


def driver_result(success: bool = True, errors: list[str] | None = None) -> DriverResult:
    return DriverResult(
        success=success,
        steps=[
            StepCapture(
                step_index=1,
                timestamp=datetime.now(UTC),
                url="http://localhost:18120/chargen",
                title="Highport Chargen",
                next_goal="loaded",
                actions=[],
                screenshot_b64=None,
                fsm_state_observed=None,
            )
        ],
        final_url="http://localhost:18120/chargen",
        final_result="Highport Chargen loaded",
        errors=errors or [],
        total_tokens=12,
        wall_clock_s=1.0,
        budget_snapshot={
            "steps_used": 1,
            "tokens_used": 12,
            "wall_clock_s": 1.0,
            "last_step_tokens": 12,
        },
        termination_reason="done" if success else "error",
    )


class FakeDriver:
    result = driver_result()
    last_page = FakePage()

    def __init__(self, *args: object, **kwargs: object) -> None:
        self.args = args
        self.kwargs = kwargs

    async def run(self) -> DriverResult:
        return self.result

    async def close(self) -> None:
        return None


@pytest.mark.asyncio
async def test_skip_when_required_service_down(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(
        session, "probe_stack", AsyncMock(return_value=StackReport(ServiceStatus.DOWN))
    )
    monkeypatch.setattr(session, "_generate_report", AsyncMock(return_value=tmp_path / "report.md"))

    result = await session.run_charter(load_charter("S0"), settings(tmp_path), auto_bootstrap=False)

    assert result.outcome == "skipped"
    assert result.driver_result is None
    assert "required services down" in result.summary


@pytest.mark.asyncio
async def test_bootstrap_then_happy_path(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    probes = [StackReport(ServiceStatus.DOWN), StackReport(ServiceStatus.UP)]
    monkeypatch.setattr(session, "probe_stack", AsyncMock(side_effect=probes))
    monkeypatch.setattr(
        session, "bootstrap_stack", AsyncMock(return_value=type("Bootstrap", (), {"pids": [1]})())
    )
    monkeypatch.setattr(session, "CharterDriver", FakeDriver)
    monkeypatch.setattr(session, "_login_user_for_charter", AsyncMock(return_value=None))
    monkeypatch.setattr(session, "_generate_report", AsyncMock(return_value=tmp_path / "report.md"))

    result = await session.run_charter(load_charter("S0"), settings(tmp_path))

    assert result.outcome == "pass"
    assert result.report_path == tmp_path / "report.md"


@pytest.mark.asyncio
async def test_happy_path_evaluates_boundaries(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    FakeDriver.result = driver_result()
    monkeypatch.setattr(
        session, "probe_stack", AsyncMock(return_value=StackReport(ServiceStatus.UP))
    )
    monkeypatch.setattr(session, "CharterDriver", FakeDriver)
    monkeypatch.setattr(session, "_login_user_for_charter", AsyncMock(return_value=None))
    monkeypatch.setattr(session, "_generate_report", AsyncMock(return_value=tmp_path / "report.md"))

    result = await session.run_charter(load_charter("S0"), settings(tmp_path))

    assert result.outcome == "pass"
    assert {boundary.id for boundary in result.boundary_results} == {
        "chargen_shell_text",
        "wizard_shell_visible",
        "chargen_url",
        "no_uncaught_exception",
    }


@pytest.mark.asyncio
async def test_xfail_inverts_failed_driver(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    FakeDriver.result = driver_result(False, ["known failure"])
    charter = load_charter("S0").model_copy(update={"xfail": True})
    monkeypatch.setattr(
        session, "probe_stack", AsyncMock(return_value=StackReport(ServiceStatus.UP))
    )
    monkeypatch.setattr(session, "CharterDriver", FakeDriver)
    monkeypatch.setattr(session, "_login_user_for_charter", AsyncMock(return_value=None))
    monkeypatch.setattr(session, "_generate_report", AsyncMock(return_value=tmp_path / "report.md"))

    result = await session.run_charter(charter, settings(tmp_path))

    assert result.outcome == "xfail"
    assert result.summary == "expected failure reproduced"


@pytest.mark.asyncio
async def test_error_capture(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        session, "probe_stack", AsyncMock(return_value=StackReport(ServiceStatus.UP))
    )
    monkeypatch.setattr(
        session, "load_persona", lambda _id: (_ for _ in ()).throw(ValueError("bad persona"))
    )
    monkeypatch.setattr(session, "_generate_report", AsyncMock(return_value=tmp_path / "report.md"))

    result = await session.run_charter(load_charter("S0"), settings(tmp_path))

    assert result.outcome == "error"
    assert "bad persona" in result.summary


@pytest.mark.asyncio
async def test_run_many_fail_fast(monkeypatch: pytest.MonkeyPatch) -> None:
    first = session.CharterRunResult(
        "S0",
        datetime.now(UTC),
        datetime.now(UTC),
        {},
        None,
        None,
        EvidenceDir(Path("/tmp/evidence"), "S0"),
        "fail",
        "failed",
    )
    runner = AsyncMock(return_value=first)
    monkeypatch.setattr(session, "run_charter_by_id", runner)

    results = await session.run_many(["S0", "A1"], fail_fast=True)

    assert results == [first]
    assert runner.call_count == 1


@pytest.mark.asyncio
async def test_multiplayer_charter_routes_to_orchestrator(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    mp_result = SimpleNamespace(
        success=True,
        players=[SimpleNamespace(role="player1", driver_result=driver_result())],
        cross_player_assertions=[
            {
                "id": "player2_sees_player1",
                "kind": "regex_present",
                "expected": "player1",
                "observed": "Agent QA player1",
                "passed": True,
            }
        ],
        total_wall_clock_s=2.0,
        termination_reason="done",
    )
    runner = AsyncMock(return_value=mp_result)
    monkeypatch.setattr(
        session, "probe_stack", AsyncMock(return_value=StackReport(ServiceStatus.UP))
    )
    monkeypatch.setattr(session, "_run_multiplayer_charter", runner)
    monkeypatch.setattr(session, "_generate_report", AsyncMock(return_value=tmp_path / "report.md"))

    result = await session.run_charter(load_charter("A1"), settings(tmp_path))

    assert result.outcome == "pass"
    assert result.boundary_results[0].id == "player2_sees_player1"
    assert runner.await_count == 1
