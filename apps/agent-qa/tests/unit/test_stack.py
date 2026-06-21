import os
import signal
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from subprocess import CalledProcessError

import pytest
from agent_qa import stack
from agent_qa.health.probes import ProbeResult, ServiceName, ServiceStatus


def result(service: ServiceName, status: ServiceStatus) -> ProbeResult:
    return ProbeResult(
        service=service,
        status=status,
        latency_ms=1.0,
        detail=status.value,
        checked_at=datetime.now(UTC),
    )


def report(statuses: dict[ServiceName, ServiceStatus]) -> stack.StackReport:
    results = {service: result(service, status) for service, status in statuses.items()}

    def all_required_up(required: set[ServiceName]) -> bool:
        return all(results[service].status is ServiceStatus.UP for service in required)

    return stack.StackReport(results=results, all_required_up=all_required_up)


def full_status(status: ServiceStatus) -> dict[ServiceName, ServiceStatus]:
    return dict.fromkeys(ServiceName, status)


@pytest.mark.asyncio
async def test_probe_stack_builds_required_checker(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_probe_all(_urls: object) -> dict[ServiceName, ProbeResult]:
        return {
            ServiceName.WEB: result(ServiceName.WEB, ServiceStatus.UP),
            ServiceName.RAG: result(ServiceName.RAG, ServiceStatus.DOWN),
        }

    monkeypatch.setattr(stack, "probe_all", fake_probe_all)

    stack_report = await stack.probe_stack(
        {ServiceName.WEB: "http://web", ServiceName.RAG: "http://rag"}
    )

    assert stack_report.all_required_up({ServiceName.WEB}) is True
    assert stack_report.all_required_up({ServiceName.WEB, ServiceName.RAG}) is False
    assert "web: up" in stack_report.summary()


@pytest.mark.asyncio
async def test_bootstrap_starts_missing_services(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    runs: list[list[str]] = []
    popens: list[tuple[list[str], Path]] = []

    class Process:
        pid: int

        def __init__(self, pid: int) -> None:
            self.pid = pid

    def fake_run(command: list[str], cwd: Path, check: bool) -> None:
        runs.append(command)
        assert cwd == tmp_path
        assert check is True

    def fake_popen(command: list[str], cwd: Path, stdout: object, stderr: object) -> Process:
        _ = stdout, stderr
        popens.append((command, cwd))
        return Process(9000 + len(popens))

    async def fake_probe_stack(_urls: object = None) -> stack.StackReport:
        return report(full_status(ServiceStatus.DOWN))

    async def fake_poll_stack(timeout_s: int) -> stack.StackReport:
        assert timeout_s == 60
        return report(full_status(ServiceStatus.UP))

    monkeypatch.setattr(stack, "probe_stack", fake_probe_stack)
    monkeypatch.setattr(stack, "_poll_stack", fake_poll_stack)
    monkeypatch.setattr(subprocess, "run", fake_run)
    monkeypatch.setattr(subprocess, "Popen", fake_popen)

    bootstrap_report = await stack.bootstrap_stack(tmp_path)

    assert bootstrap_report.success is True
    assert runs == [["docker", "compose", "up", "-d", "postgres"]]
    assert popens == [
        (["pnpm", "dev"], tmp_path),
        (["uvicorn", "main:app", "--port", "18124"], tmp_path / "apps" / "rag-service"),
    ]
    assert bootstrap_report.pids == [9001, 9002]


@pytest.mark.asyncio
async def test_bootstrap_skips_already_running_services(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    async def fake_probe_stack(_urls: object = None) -> stack.StackReport:
        return report(full_status(ServiceStatus.UP))

    async def fake_poll_stack(_timeout_s: int) -> stack.StackReport:
        return report(full_status(ServiceStatus.UP))

    def fail_run(command: object, cwd: object = None, check: object = None) -> None:
        pytest.fail(f"unexpected run: {command} {cwd} {check}")

    def fail_popen(
        command: object, cwd: object = None, stdout: object = None, stderr: object = None
    ) -> None:
        pytest.fail(f"unexpected Popen: {command} {cwd} {stdout} {stderr}")

    monkeypatch.setattr(stack, "probe_stack", fake_probe_stack)
    monkeypatch.setattr(stack, "_poll_stack", fake_poll_stack)
    monkeypatch.setattr(subprocess, "run", fail_run)
    monkeypatch.setattr(subprocess, "Popen", fail_popen)

    bootstrap_report = await stack.bootstrap_stack(tmp_path)

    assert bootstrap_report.success is True
    assert bootstrap_report.actions == []
    assert bootstrap_report.pids == []


@pytest.mark.asyncio
async def test_bootstrap_reports_subprocess_error(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    def fake_run(command: list[str], cwd: Path, check: bool) -> None:
        _ = cwd, check
        raise CalledProcessError(returncode=1, cmd=command)

    async def fake_probe_stack(_urls: object = None) -> stack.StackReport:
        return report(full_status(ServiceStatus.DOWN))

    monkeypatch.setattr(stack, "probe_stack", fake_probe_stack)
    monkeypatch.setattr(subprocess, "run", fake_run)

    bootstrap_report = await stack.bootstrap_stack(tmp_path, start_dev=False, start_rag=False)

    assert bootstrap_report.success is False
    assert bootstrap_report.error is not None
    assert bootstrap_report.pids == []


@pytest.mark.asyncio
async def test_teardown_stack_sends_sigterm(monkeypatch: pytest.MonkeyPatch) -> None:
    killed: list[tuple[int, int]] = []

    def fake_kill(pid: int, sig: int) -> None:
        killed.append((pid, sig))
        if pid == 2:
            raise ProcessLookupError

    monkeypatch.setattr(os, "kill", fake_kill)

    await stack.teardown_stack([1, 2])

    assert killed == [(1, signal.SIGTERM), (2, signal.SIGTERM)]
