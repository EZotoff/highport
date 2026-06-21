import asyncio
import os
import signal
import subprocess
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from agent_qa.health.probes import ProbeResult, ServiceName, ServiceStatus, probe_all

DEFAULT_SERVICE_URLS: dict[ServiceName, str] = {
    ServiceName.WEB: "http://localhost:18120",
    ServiceName.HOCUSPOCUS: "http://localhost:18121",
    ServiceName.FASTIFY: "http://localhost:18122",
    ServiceName.POSTGRES: "postgresql://highport:highport_dev@localhost:18123/highport_test",
    ServiceName.RAG: "http://localhost:18124",
    ServiceName.OLLAMA: "http://localhost:11434",
}


@dataclass
class StackReport:
    results: dict[ServiceName, ProbeResult]
    all_required_up: Callable[[set[ServiceName]], bool]

    def summary(self) -> str:
        lines = ["Service health:"]
        for service in ServiceName:
            result = self.results.get(service)
            if result is None:
                lines.append(f"- {service.value}: unknown")
                continue
            latency = "n/a" if result.latency_ms is None else f"{result.latency_ms:.1f}ms"
            lines.append(f"- {service.value}: {result.status.value} ({latency}) {result.detail}")
        return "\n".join(lines)


@dataclass
class BootstrapReport:
    started_at: datetime
    completed_at: datetime
    actions: list[str]
    results: dict[ServiceName, ProbeResult]
    success: bool
    error: str | None
    pids: list[int]


async def probe_stack(urls: Mapping[ServiceName, str] | None = None) -> StackReport:
    service_urls = dict(DEFAULT_SERVICE_URLS if urls is None else urls)
    results = await probe_all(service_urls)

    def all_required_up(required: set[ServiceName]) -> bool:
        return all(
            results.get(service) and results[service].status is ServiceStatus.UP
            for service in required
        )

    return StackReport(results=results, all_required_up=all_required_up)


async def bootstrap_stack(
    repo_root: Path,
    timeout_s: int = 60,
    start_dev: bool = True,
    start_rag: bool = True,
    start_postgres: bool = True,
) -> BootstrapReport:
    started_at = datetime.now(UTC)
    actions: list[str] = []
    pids: list[int] = []
    error: str | None = None
    latest = await probe_stack()

    try:
        if start_postgres and not _is_up(latest, ServiceName.POSTGRES):
            _ = await asyncio.to_thread(
                subprocess.run,
                ["docker", "compose", "up", "-d", "postgres"],
                cwd=repo_root,
                check=True,
            )
            actions.append("docker compose up -d postgres")

        dev_services = {ServiceName.WEB, ServiceName.HOCUSPOCUS, ServiceName.FASTIFY}
        if start_dev and not latest.all_required_up(dev_services):
            process = await asyncio.to_thread(
                subprocess.Popen,
                ["pnpm", "dev"],
                cwd=repo_root,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            pids.append(process.pid)
            actions.append(f"pnpm dev (pid {process.pid})")

        if start_rag and not _is_up(latest, ServiceName.RAG):
            process = await asyncio.to_thread(
                subprocess.Popen,
                ["uvicorn", "main:app", "--port", "18124"],
                cwd=repo_root / "apps" / "rag-service",
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            pids.append(process.pid)
            actions.append(f"uvicorn main:app --port 18124 (pid {process.pid})")

        latest = await _poll_stack(timeout_s)
    except (OSError, subprocess.SubprocessError) as exc:
        error = str(exc)
        latest = await probe_stack()

    completed_at = datetime.now(UTC)
    success = error is None and all(
        result.status is ServiceStatus.UP for result in latest.results.values()
    )
    return BootstrapReport(
        started_at=started_at,
        completed_at=completed_at,
        actions=actions,
        results=latest.results,
        success=success,
        error=error,
        pids=pids,
    )


async def teardown_stack(pids: list[int]) -> None:
    for pid in pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            continue
    await asyncio.sleep(0)


async def _poll_stack(timeout_s: int) -> StackReport:
    deadline = asyncio.get_running_loop().time() + timeout_s
    delay_s = 0.05
    latest = await probe_stack()
    while not _all_up(latest) and asyncio.get_running_loop().time() < deadline:
        await asyncio.sleep(delay_s)
        delay_s = min(delay_s * 2, 0.5)
        latest = await probe_stack()
    return latest


def _is_up(report: StackReport, service: ServiceName) -> bool:
    result = report.results.get(service)
    return result is not None and result.status is ServiceStatus.UP


def _all_up(report: StackReport) -> bool:
    return all(result.status is ServiceStatus.UP for result in report.results.values())
