from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any, cast

from agent_qa.auth import TestUser, test_user_by_role
from agent_qa.charters.schema import BoundaryInvariant, Charter
from agent_qa.config import Settings
from agent_qa.personas.loader import load_persona
from agent_qa.personas.schema import Persona
from agent_qa.reporting.assertions import assert_boundary_invariant_dom
from agent_qa.reporting.evidence import EvidenceDir
from agent_qa.runtime.budget import BudgetConfig, BudgetExceeded, BudgetGuard, BudgetSnapshot
from agent_qa.runtime.driver import CharterDriver, DriverResult

if TYPE_CHECKING:
    from playwright.async_api import Page


@dataclass
class PlayerSpec:
    """One player in a multi-player charter."""

    persona: Persona
    user: TestUser
    role: str
    mission: str
    max_steps: int = 15
    headless: bool = True


@dataclass
class PlayerResult:
    role: str
    driver_result: DriverResult
    screenshots: list[Path] = field(default_factory=list)


@dataclass
class MultiPlayerResult:
    success: bool
    players: list[PlayerResult]
    cross_player_assertions: list[dict[str, Any]]
    total_wall_clock_s: float
    termination_reason: str


class MultiPlayerOrchestrator:
    """Coordinates multiple browser agents in the same chargen session."""

    def __init__(
        self,
        charter: Charter,
        players: list[PlayerSpec],
        evidence_dir: EvidenceDir,
        *,
        execution_mode: str = "sequential",
    ):
        if execution_mode not in {"sequential", "concurrent"}:
            raise ValueError("execution_mode must be sequential or concurrent")
        self.charter = charter
        self.players = players
        self.evidence_dir = evidence_dir
        self.execution_mode = execution_mode
        self._drivers: dict[str, CharterDriver] = {}
        self._budget = BudgetGuard(
            BudgetConfig(
                max_steps=charter.budget.max_steps,
                max_tokens_per_step=charter.budget.max_tokens_per_step,
                max_total_tokens=charter.budget.max_total_tokens,
                max_wall_clock_s=charter.budget.max_wall_clock_s,
                retry_on_infra_failure=charter.budget.retry_on_infra_failure,
            )
        )

    async def run(self) -> MultiPlayerResult:
        """Run all players and then evaluate cross-player assertions."""
        started = time.monotonic()
        self._budget.start()
        player_results: list[PlayerResult] = []
        assertion_results: list[dict[str, Any]] = []
        termination_reason = "done"

        try:
            if self.execution_mode == "concurrent":
                player_results = await self._run_concurrent()
            else:
                player_results = await self._run_sequential()
            self._record_budget(player_results)
            assertion_results = await self._evaluate_cross_player_assertions(player_results)
        except BudgetExceeded as exc:
            termination_reason = "budget_exceeded"
            assertion_results.append(_assertion_error("budget", str(exc)))
        except Exception as exc:
            termination_reason = "error"
            assertion_results.append(
                _assertion_error("orchestrator", f"{type(exc).__name__}: {exc}")
            )
        finally:
            await self._close_drivers()

        players_ok = bool(player_results) and all(
            result.driver_result.success for result in player_results
        )
        assertions_ok = all(bool(result.get("passed")) for result in assertion_results)
        if termination_reason == "done":
            failed = [
                result.driver_result.termination_reason
                for result in player_results
                if not result.driver_result.success
            ]
            if failed:
                termination_reason = ", ".join(failed)
            elif not assertions_ok:
                termination_reason = "cross_player_assertions_failed"
        return MultiPlayerResult(
            success=termination_reason == "done" and players_ok and assertions_ok,
            players=player_results,
            cross_player_assertions=assertion_results,
            total_wall_clock_s=time.monotonic() - started,
            termination_reason=termination_reason,
        )

    async def _run_sequential(self) -> list[PlayerResult]:
        results: list[PlayerResult] = []
        for player in self.players:
            results.append(await self._run_player(player))
        return results

    async def _run_concurrent(self) -> list[PlayerResult]:
        return list(await asyncio.gather(*(self._run_player(player) for player in self.players)))

    async def _run_player(self, player: PlayerSpec) -> PlayerResult:
        evidence_dir = EvidenceDir(self.evidence_dir.root, f"{self.charter.id}/{player.role}")
        evidence_dir.screenshots.mkdir(parents=True, exist_ok=True)
        evidence_dir.dom.mkdir(parents=True, exist_ok=True)
        evidence_dir.reports.mkdir(parents=True, exist_ok=True)
        player_charter = _player_charter(self.charter, player)
        user_data_dir = _player_user_data_dir(evidence_dir, player)
        driver = CharterDriver(
            player_charter,
            player.persona,
            evidence_dir,
            headless=player.headless,
            user_data_dir=user_data_dir,
            login_user=player.user,
            close_browser_on_finish=False,
        )
        self._drivers[player.role] = driver
        try:
            result = await driver.run()
        except Exception as exc:
            result = _failed_driver_result(f"{type(exc).__name__}: {exc}")
        screenshots = sorted(evidence_dir.screenshots.glob("*.png"))
        return PlayerResult(role=player.role, driver_result=result, screenshots=screenshots)

    def _record_budget(self, player_results: list[PlayerResult]) -> None:
        for player_result in player_results:
            for step in player_result.driver_result.steps:
                self._budget.record_step(step.tokens_used)
        self._budget.check_time()

    async def _evaluate_cross_player_assertions(
        self, player_results: list[PlayerResult]
    ) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for invariant in self.charter.boundary_invariants:
            targets = self._targets_for(invariant)
            for target in targets:
                player_result = _player_result_by_role(player_results, target)
                driver = self._drivers.get(target)
                page = cast("Page | None", driver.last_page if driver is not None else None)
                fallback = (
                    _fallback_text(invariant, player_result.driver_result) if player_result else ""
                )
                assertion = await assert_boundary_invariant_dom(invariant, page, fallback)
                results.append(
                    {
                        "id": invariant.id if invariant.target else f"{invariant.id}:{target}",
                        "kind": str(invariant.kind),
                        "target": target,
                        "expected": _expected(invariant),
                        "observed": assertion.observed,
                        "passed": assertion.passed,
                        "error": assertion.error,
                    }
                )
        return results

    def _targets_for(self, invariant: BoundaryInvariant) -> list[str]:
        if invariant.target:
            return [invariant.target]
        return [player.role for player in self.players]

    async def _close_drivers(self) -> None:
        for driver in self._drivers.values():
            await driver.close()


def build_players_from_charter(charter: Charter, settings: Settings) -> list[PlayerSpec]:
    """Construct PlayerSpec list from charter.personas."""
    if charter.personas is None:
        return []
    return [
        PlayerSpec(
            persona=load_persona(role.persona_id),
            user=test_user_by_role(role.user_role, settings),
            role=role.user_role,
            mission=role.mission,
            max_steps=role.max_steps,
        )
        for role in charter.personas.roles
    ]


def _player_charter(charter: Charter, player: PlayerSpec) -> Charter:
    budget = charter.budget.model_copy(update={"max_steps": player.max_steps})
    mission = (
        f"{charter.mission.strip()}\n\nYour player-specific mission:\n{player.mission.strip()}"
    )
    return charter.model_copy(update={"mission": mission, "budget": budget}, deep=True)


def _player_user_data_dir(evidence_dir: EvidenceDir, player: PlayerSpec) -> Path | None:
    settings = Settings.from_env()
    if settings.browser_user_data_root is None:
        return None
    return (
        settings.browser_user_data_root
        / evidence_dir.root.name
        / evidence_dir.charter_id
        / player.role
    )


def _player_result_by_role(player_results: list[PlayerResult], role: str) -> PlayerResult | None:
    for player_result in player_results:
        if player_result.role == role:
            return player_result
    return None


def _fallback_text(invariant: BoundaryInvariant, driver_result: DriverResult) -> str:
    if "error" in invariant.id or "exception" in invariant.id:
        return str(len(driver_result.errors))
    return "\n".join(
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


def _expected(invariant: BoundaryInvariant) -> str:
    if invariant.kind in {"regex_present", "regex_absent", "url_matches"}:
        return invariant.pattern or ""
    if invariant.kind == "range":
        return f"{invariant.min}..{invariant.max}"
    if invariant.kind == "upper_bound":
        return f"<= {invariant.expect}"
    if invariant.kind == "element_visible":
        return invariant.filter or ""
    return str(invariant.expect)


def _assertion_error(assertion_id: str, error: str) -> dict[str, Any]:
    return {
        "id": assertion_id,
        "kind": "error",
        "target": "orchestrator",
        "expected": "success",
        "observed": error,
        "passed": False,
        "error": error,
    }


def _failed_driver_result(error: str) -> DriverResult:
    return DriverResult(
        success=False,
        steps=[],
        final_url=None,
        final_result=None,
        errors=[error],
        total_tokens=0,
        wall_clock_s=0.0,
        budget_snapshot=_snapshot_dict(BudgetSnapshot()),
        termination_reason="error",
    )


def _snapshot_dict(snapshot: BudgetSnapshot) -> dict[str, int | float]:
    return {
        "steps_used": snapshot.steps_used,
        "tokens_used": snapshot.tokens_used,
        "wall_clock_s": snapshot.wall_clock_s,
        "last_step_tokens": snapshot.last_step_tokens,
    }
