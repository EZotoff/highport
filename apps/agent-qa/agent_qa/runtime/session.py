from __future__ import annotations

import asyncio
import dataclasses
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any, cast

from agent_qa.auth import TestUser, ensure_test_users, test_user_by_role, verify_user
from agent_qa.charters.loader import load_charter
from agent_qa.charters.schema import BoundaryInvariant, Charter
from agent_qa.config import Settings
from agent_qa.health.probes import ProbeResult, ServiceName
from agent_qa.personas.loader import load_persona
from agent_qa.reporting.assertions import assert_boundary_invariant_dom
from agent_qa.reporting.evidence import EvidenceDir
from agent_qa.runtime.driver import CharterDriver, DriverResult
from agent_qa.stack import bootstrap_stack, probe_stack, teardown_stack

if TYPE_CHECKING:
    from playwright.async_api import Page

    from agent_qa.runtime.multiplayer import MultiPlayerResult


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
    driver: CharterDriver | None = None
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

        if _is_multiplayer_charter(charter):
            mp_result = await _run_multiplayer_charter(charter, active_settings, evidence_dir)
            driver_result = _aggregate_multiplayer_driver_result(mp_result)
            boundary_results = _multiplayer_boundary_results(mp_result)
            if mp_result.success:
                outcome = "pass"
                summary = "all players completed and cross-player assertions passed"
            elif charter.xfail:
                outcome = "xfail"
                summary = "expected failure reproduced"
            else:
                outcome = "fail"
                summary = mp_result.termination_reason

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

        persona_id = charter.persona.primary
        if persona_id is None:
            raise ValueError(f"charter {charter.id} has no primary persona")
        persona = load_persona(persona_id)
        login_user = await _login_user_for_charter(charter, active_settings)
        user_data_dir = _browser_user_data_dir(active_settings, evidence_dir, charter, login_user)
        driver = CharterDriver(
            charter,
            persona,
            evidence_dir,
            user_data_dir=user_data_dir,
            login_user=login_user,
            close_browser_on_finish=False,
        )
        driver_result = await driver.run()
        boundary_results = await _evaluate_boundary_invariants(
            charter.boundary_invariants, driver_result, driver.last_page
        )
        invariants_pass = all(result.passed for result in boundary_results)
        ui_critique_completed = _ui_critique_completed(charter, driver_result)
        if (driver_result.success or ui_critique_completed) and invariants_pass:
            outcome = "pass"
            summary = (
                "ui critique completed and invariants passed"
                if ui_critique_completed and not driver_result.success
                else "driver completed and invariants passed"
            )
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
        if driver is not None:
            await driver.close()
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


async def _evaluate_boundary_invariants(
    invariants: list[BoundaryInvariant], driver_result: DriverResult, page: object | None = None
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
        fallback_text = _observed(invariant, driver_result, haystack)
        assertion = await assert_boundary_invariant_dom(
            invariant, cast("Page | None", page), fallback_text
        )
        observed = assertion.observed
        passed = assertion.passed
        if assertion.error:
            observed = f"{observed} ({assertion.error})" if observed else assertion.error
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
    if invariant.kind == "url_matches":
        return driver_result.final_url or haystack
    if "error" in invariant.id or "exception" in invariant.id:
        return str(len(driver_result.errors))
    return haystack


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


def _is_multiplayer_charter(charter: Charter) -> bool:
    return bool(charter.personas and len(charter.personas.roles) >= 2)


async def _run_multiplayer_charter(
    charter: Charter, settings: Settings, evidence_dir: EvidenceDir
) -> MultiPlayerResult:
    from agent_qa.runtime.multiplayer import MultiPlayerOrchestrator, build_players_from_charter

    players = build_players_from_charter(charter, settings)
    execution_mode = charter.personas.mode if charter.personas else "sequential"
    orchestrator = MultiPlayerOrchestrator(
        charter, players, evidence_dir, execution_mode=execution_mode
    )
    return await orchestrator.run()


def _aggregate_multiplayer_driver_result(mp_result: MultiPlayerResult) -> DriverResult:
    players = list(mp_result.players)
    driver_results = [player.driver_result for player in players]
    steps = [step for result in driver_results for step in result.steps]
    errors = [error for result in driver_results for error in result.errors]
    final_url = next(
        (result.final_url for result in reversed(driver_results) if result.final_url), None
    )
    final_result = next(
        (result.final_result for result in reversed(driver_results) if result.final_result), None
    )
    wall_clock_s = mp_result.total_wall_clock_s
    total_tokens = sum(result.total_tokens for result in driver_results)
    return DriverResult(
        success=mp_result.success,
        steps=steps,
        final_url=final_url,
        final_result=final_result,
        errors=errors,
        total_tokens=total_tokens,
        wall_clock_s=wall_clock_s,
        budget_snapshot={
            "steps_used": len(steps),
            "tokens_used": total_tokens,
            "wall_clock_s": wall_clock_s,
            "last_step_tokens": steps[-1].tokens_used if steps else 0,
        },
        termination_reason=mp_result.termination_reason,
        login_completed=all(result.login_completed for result in driver_results)
        if driver_results
        else False,
    )


def _multiplayer_boundary_results(mp_result: MultiPlayerResult) -> list[BoundaryCheckResult]:
    rows = mp_result.cross_player_assertions
    results: list[BoundaryCheckResult] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        observed = str(row.get("observed", ""))
        error = row.get("error")
        if error:
            observed = f"{observed} ({error})" if observed else str(error)
        results.append(
            BoundaryCheckResult(
                id=str(row.get("id", "unknown")),
                kind=str(row.get("kind", "unknown")),
                expected=str(row.get("expected", "")),
                observed=observed,
                passed=bool(row.get("passed", False)),
            )
        )
    return results


async def _login_user_for_charter(charter: Charter, settings: Settings) -> TestUser | None:
    if charter.login is None or not charter.login.required:
        return None
    ensure_result = await ensure_test_users(settings)
    role = charter.login.user_role
    user = test_user_by_role(role, settings)
    failed_roles = {failed_user.role: message for failed_user, message in ensure_result.failed}
    if role in failed_roles:
        raise RuntimeError(f"failed to ensure test user {role}: {failed_roles[role]}")
    user_id = await verify_user(user, settings)
    if user_id is None:
        raise RuntimeError(f"test user {role} could not be verified through Fastify auth")
    return dataclasses.replace(user, user_id=user_id)


def _browser_user_data_dir(
    settings: Settings, evidence_dir: EvidenceDir, charter: Charter, login_user: TestUser | None
) -> Path | None:
    root = settings.browser_user_data_root
    if root is None:
        return None
    role = login_user.role if login_user is not None else "anonymous"
    return root / evidence_dir.root.name / charter.id / role


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
    from agent_qa.reporting.critique import generate_critique_report
    from agent_qa.reporting.report import generate_report

    report_path = await asyncio_to_thread(generate_report, charter, result, evidence_dir)
    if _is_ui_critique_charter(charter):
        _ = await asyncio_to_thread(
            generate_critique_report,
            charter,
            result.driver_result,
            evidence_dir,
        )
    return report_path


def _is_ui_critique_charter(charter: Charter) -> bool:
    return charter.persona.primary == "ui-critic" or "ui-critique" in charter.tags


def _ui_critique_completed(charter: Charter, driver_result: DriverResult) -> bool:
    if not _is_ui_critique_charter(charter):
        return False
    final_result = driver_result.final_result or ""
    return bool(
        "## Dimension Scores" in final_result
        and "## Findings" in final_result
        and re.search(r"Readability\s*:\s*[0-5]\s*/\s*5", final_result, re.IGNORECASE)
    )


async def asyncio_to_thread(function: Callable[..., Path], *args: object) -> Path:
    return await asyncio.to_thread(function, *args)
