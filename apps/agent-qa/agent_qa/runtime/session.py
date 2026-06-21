from __future__ import annotations

import asyncio
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from agent_qa.charters.loader import load_charter
from agent_qa.charters.schema import BoundaryInvariant, Charter
from agent_qa.config import Settings
from agent_qa.health.probes import ProbeResult, ServiceName
from agent_qa.personas.loader import load_persona
from agent_qa.reporting.evidence import EvidenceDir
from agent_qa.runtime.driver import CharterDriver, DriverResult
from agent_qa.stack import bootstrap_stack, probe_stack, teardown_stack


@dataclass
class BoundaryCheckResult:
    id: str
    kind: str
    expected: str
    observed: str
    passed: bool


@dataclass
class CharterRunResult:
    charter_id: str
    started_at: datetime
    completed_at: datetime
    precondition_status: dict[str, str]
    driver_result: DriverResult | None
    report_path: Path | None
    evidence_dir: EvidenceDir
    outcome: str
    summary: str
    boundary_results: list[BoundaryCheckResult] = field(default_factory=list)


async def run_charter(
    charter: Charter,
    settings: Settings | None = None,
    *,
    auto_bootstrap: bool = True,
    teardown_after: bool = False,
) -> CharterRunResult:
    """End-to-end charter execution."""
    started_at = datetime.now(UTC)
    active_settings = settings or Settings.from_env()
    evidence_dir = EvidenceDir.create(active_settings.evidence_root, charter.id, started_at)
    precondition_status: dict[str, str] = {}
    bootstrap_pids: list[int] = []
    driver_result: DriverResult | None = None
    report_path: Path | None = None
    boundary_results: list[BoundaryCheckResult] = []
    outcome = "error"
    summary = "run did not complete"

    try:
        required = {ServiceName(service) for service in charter.preconditions.services_required}
        probe = await probe_stack(_service_urls(active_settings))
        precondition_status = _status_map(probe.results)
        if not probe.all_required_up(required) and auto_bootstrap:
            bootstrap = await bootstrap_stack(_repo_root())
            bootstrap_pids = bootstrap.pids
            probe = await probe_stack(_service_urls(active_settings))
            precondition_status = _status_map(probe.results)

        if not probe.all_required_up(required):
            outcome = "skipped"
            missing = sorted(
                service.value
                for service in required
                if precondition_status.get(service.value) != "up"
            )
            summary = f"required services down: {', '.join(missing)}"
            completed_at = datetime.now(UTC)
            result = CharterRunResult(
                charter_id=charter.id,
                started_at=started_at,
                completed_at=completed_at,
                precondition_status=precondition_status,
                driver_result=None,
                report_path=None,
                evidence_dir=evidence_dir,
                outcome=outcome,
                summary=summary,
                boundary_results=[],
            )
            result.report_path = await _generate_report(charter, result, evidence_dir)
            return result

        persona_id = charter.persona.primary
        if persona_id is None:
            raise ValueError(f"charter {charter.id} has no primary persona")
        persona = load_persona(persona_id)
        driver = CharterDriver(charter, persona, evidence_dir)
        driver_result = await driver.run()
        boundary_results = _evaluate_boundary_invariants(charter.boundary_invariants, driver_result)
        invariants_pass = all(result.passed for result in boundary_results)
        if driver_result.success and invariants_pass:
            outcome = "pass"
            summary = "driver completed and invariants passed"
        elif charter.xfail:
            outcome = "xfail"
            summary = "expected failure reproduced"
        else:
            outcome = "fail"
            summary = _failure_summary(driver_result, boundary_results)

        completed_at = datetime.now(UTC)
        result = CharterRunResult(
            charter_id=charter.id,
            started_at=started_at,
            completed_at=completed_at,
            precondition_status=precondition_status,
            driver_result=driver_result,
            report_path=report_path,
            evidence_dir=evidence_dir,
            outcome=outcome,
            summary=summary,
            boundary_results=boundary_results,
        )
        result.report_path = await _generate_report(charter, result, evidence_dir)
        return result
    except Exception as exc:
        completed_at = datetime.now(UTC)
        summary = f"{type(exc).__name__}: {exc}"
        result = CharterRunResult(
            charter_id=charter.id,
            started_at=started_at,
            completed_at=completed_at,
            precondition_status=precondition_status,
            driver_result=driver_result,
            report_path=None,
            evidence_dir=evidence_dir,
            outcome="error",
            summary=summary,
            boundary_results=boundary_results,
        )
        try:
            result.report_path = await _generate_report(charter, result, evidence_dir)
        except OSError:
            result.report_path = None
        return result
    finally:
        if teardown_after and bootstrap_pids:
            await teardown_stack(bootstrap_pids)


async def run_charter_by_id(charter_id: str, **kwargs: Any) -> CharterRunResult:
    """Convenience: load charter by ID, call run_charter."""
    return await run_charter(load_charter(charter_id), **kwargs)


async def run_many(
    charter_ids: list[str],
    *,
    fail_fast: bool = False,
    **kwargs: Any,
) -> list[CharterRunResult]:
    """Run multiple charters sequentially. If fail_fast, stop on first non-pass."""
    results: list[CharterRunResult] = []
    for charter_id in charter_ids:
        result = await run_charter_by_id(charter_id, **kwargs)
        results.append(result)
        if fail_fast and result.outcome != "pass":
            break
    return results


def _evaluate_boundary_invariants(
    invariants: list[BoundaryInvariant], driver_result: DriverResult
) -> list[BoundaryCheckResult]:
    haystack = "\n".join(
        value
        for value in [
            driver_result.final_url,
            driver_result.final_result,
            *(step.title for step in driver_result.steps),
            *(step.url for step in driver_result.steps),
            *(step.next_goal for step in driver_result.steps),
        ]
        if value
    )
    results: list[BoundaryCheckResult] = []
    for invariant in invariants:
        kind = str(invariant.kind)
        expected = _expected(invariant)
        observed = _observed(invariant, driver_result, haystack)
        passed = _boundary_passed(invariant, observed)
        results.append(
            BoundaryCheckResult(
                id=invariant.id,
                kind=kind,
                expected=expected,
                observed=observed,
                passed=passed,
            )
        )
    return results


def _expected(invariant: BoundaryInvariant) -> str:
    if invariant.kind in {"regex_present", "regex_absent"}:
        return invariant.pattern or ""
    if invariant.kind == "range":
        return f"{invariant.min}..{invariant.max}"
    if invariant.kind == "upper_bound":
        return f"<= {invariant.expect}"
    return str(invariant.expect)


def _observed(invariant: BoundaryInvariant, driver_result: DriverResult, haystack: str) -> str:
    if invariant.kind in {"regex_present", "regex_absent"}:
        return haystack
    if "error" in invariant.id or "exception" in invariant.id:
        return str(len(driver_result.errors))
    return ""


def _boundary_passed(invariant: BoundaryInvariant, observed: str) -> bool:
    if invariant.kind == "regex_present":
        return bool(invariant.pattern and re.search(invariant.pattern, observed, re.IGNORECASE))
    if invariant.kind == "regex_absent":
        return not bool(invariant.pattern and re.search(invariant.pattern, observed, re.IGNORECASE))
    if invariant.kind == "exact":
        return observed == str(invariant.expect)
    if invariant.kind == "range":
        try:
            value = float(observed)
        except ValueError:
            return False
        return (
            invariant.min is not None
            and invariant.max is not None
            and invariant.min <= value <= invariant.max
        )
    if invariant.kind == "upper_bound":
        try:
            return float(observed) <= float(str(invariant.expect))
        except ValueError:
            return False
    return False


def _failure_summary(
    driver_result: DriverResult, boundary_results: list[BoundaryCheckResult]
) -> str:
    failures = [result.id for result in boundary_results if not result.passed]
    if driver_result.errors:
        return driver_result.errors[0]
    if failures:
        return f"boundary invariants failed: {', '.join(failures)}"
    return f"driver terminated with {driver_result.termination_reason}"


def _service_urls(settings: Settings) -> dict[ServiceName, str]:
    return {
        ServiceName.WEB: settings.web_url,
        ServiceName.HOCUSPOCUS: settings.hocuspocus_url,
        ServiceName.FASTIFY: settings.fastify_url,
        ServiceName.POSTGRES: settings.postgres_dsn,
        ServiceName.RAG: settings.rag_url,
        ServiceName.OLLAMA: settings.ollama_url,
    }


def _status_map(results: dict[ServiceName, ProbeResult]) -> dict[str, str]:
    return {service.value: result.status.value for service, result in results.items()}


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


async def _generate_report(
    charter: Charter, result: CharterRunResult, evidence_dir: EvidenceDir
) -> Path:
    from agent_qa.reporting.report import generate_report

    return await asyncio_to_thread(generate_report, charter, result, evidence_dir)


async def asyncio_to_thread(function: Callable[..., Path], *args: object) -> Path:
    return await asyncio.to_thread(function, *args)
