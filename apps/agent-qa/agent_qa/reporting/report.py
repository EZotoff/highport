from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
from typing import Protocol

from agent_qa.charters.schema import Charter
from agent_qa.reporting.evidence import EvidenceDir
from agent_qa.runtime.tape import Tape


class _RunResult(Protocol):
    @property
    def charter_id(self) -> str: ...

    @property
    def precondition_status(self) -> dict[str, str]: ...

    @property
    def driver_result(self) -> object | None: ...

    @property
    def outcome(self) -> str: ...

    @property
    def summary(self) -> str: ...

    @property
    def boundary_results(self) -> Sequence[_BoundaryResult]: ...


class _BoundaryResult(Protocol):
    @property
    def id(self) -> str: ...

    @property
    def kind(self) -> str: ...

    @property
    def expected(self) -> str: ...

    @property
    def observed(self) -> str: ...

    @property
    def passed(self) -> bool: ...


def generate_report(
    charter: Charter,
    run_result: _RunResult,
    evidence_dir: EvidenceDir,
) -> Path:
    """Write a SBTM-style markdown report to {evidence_dir.reports}/report.md."""
    evidence_dir.reports.mkdir(parents=True, exist_ok=True)
    path = evidence_dir.reports / "report.md"
    content = "\n".join(
        [
            f"# Charter {charter.id}: {charter.title}",
            "",
            f"## Outcome: {run_result.outcome}",
            "",
            "## Mission",
            "",
            f"> {charter.mission.strip()}",
            "",
            "## Preconditions",
            "",
            _preconditions_table(charter, run_result),
            "",
            "## Timeline",
            "",
            _timeline_table(evidence_dir),
            "",
            "## Boundary Invariants",
            "",
            _boundary_table(run_result),
            "",
            "## Budget",
            "",
            _budget_table(charter, run_result),
            "",
            "## Errors",
            "",
            _errors(run_result),
            "",
            "## Artifacts",
            "",
            _artifacts(evidence_dir),
            "",
            "## Charter Metadata",
            "",
            _metadata_table(charter),
            "",
        ]
    )
    _ = path.write_text(content, encoding="utf-8")
    return path


def format_summary_line(run_result: _RunResult) -> str:
    """One-line git-commit-style summary: '[{outcome}] {charter_id}: {summary}'"""
    return f"[{run_result.outcome}] {run_result.charter_id}: {run_result.summary}"


def _preconditions_table(charter: Charter, run_result: _RunResult) -> str:
    rows = ["| service | required | status |", "|---|---:|---|"]
    services = sorted(
        set(charter.preconditions.services_required)
        | set(charter.preconditions.services_optional)
        | set(charter.preconditions.services_prohibited)
    )
    for service in services:
        rows.append(
            f"| {_cell(service)} | {service in charter.preconditions.services_required} | "
            f"{_cell(run_result.precondition_status.get(service, 'unknown'))} |"
        )
    return "\n".join(rows)


def _timeline_table(evidence_dir: EvidenceDir) -> str:
    rows = ["| step | timestamp | action | result |", "|---:|---|---|---|"]
    records = Tape(evidence_dir.tape).read_all()
    if not records:
        rows.append("| - | - | No tape records | - |")
        return "\n".join(rows)
    for record in records:
        rows.append(
            f"| {record.index} | {_cell(record.timestamp.isoformat())} | "
            f"{_cell(record.action or record.kind.value)} | {_cell(record.result or '')} |"
        )
    return "\n".join(rows)


def _boundary_table(run_result: _RunResult) -> str:
    rows = ["| id | kind | expected | observed | pass? |", "|---|---|---|---|---:|"]
    if not run_result.boundary_results:
        rows.append("| - | - | - | No boundary invariants evaluated | - |")
        return "\n".join(rows)
    for result in run_result.boundary_results:
        observed = result.observed if len(result.observed) < 160 else f"{result.observed[:157]}..."
        rows.append(
            f"| {_cell(result.id)} | {_cell(result.kind)} | {_cell(result.expected)} | "
            f"{_cell(observed)} | {result.passed} |"
        )
    return "\n".join(rows)


def _budget_table(charter: Charter, run_result: _RunResult) -> str:
    snapshot = (
        getattr(run_result.driver_result, "budget_snapshot", {}) if run_result.driver_result else {}
    )
    rows = ["| dimension | used | limit | % |", "|---|---:|---:|---:|"]
    rows.append(_budget_row("steps", snapshot.get("steps_used", 0), charter.budget.max_steps))
    rows.append(
        _budget_row("tokens", snapshot.get("tokens_used", 0), charter.budget.max_total_tokens)
    )
    rows.append(
        _budget_row(
            "wall_clock_s", snapshot.get("wall_clock_s", 0), charter.budget.max_wall_clock_s
        )
    )
    return "\n".join(rows)


def _budget_row(dimension: str, used: object, limit: int | float) -> str:
    used_float = float(used) if isinstance(used, int | float) else 0.0
    percent = (used_float / limit * 100) if limit else 0.0
    return f"| {dimension} | {used_float:.2f} | {limit} | {percent:.1f}% |"


def _errors(run_result: _RunResult) -> str:
    errors = list(
        getattr(run_result.driver_result, "errors", []) if run_result.driver_result else []
    )
    if run_result.outcome == "error" and run_result.summary:
        errors.append(run_result.summary)
    if not errors:
        return "None"
    return "\n".join(f"- {_cell(error)}" for error in errors)


def _artifacts(evidence_dir: EvidenceDir) -> str:
    rows = [
        f"- Screenshots: `{evidence_dir.screenshots}`",
        f"- Tape: `{evidence_dir.tape}`",
        f"- DOM snapshots: `{evidence_dir.dom}`",
        f"- Reports: `{evidence_dir.reports}`",
    ]
    screenshots = sorted(evidence_dir.screenshots.glob("*.png"))
    if screenshots:
        rows.extend(f"  - `{path}`" for path in screenshots)
    return "\n".join(rows)


def _metadata_table(charter: Charter) -> str:
    persona = (
        charter.persona.primary or charter.persona.critic or charter.persona.secondary or "unknown"
    )
    rows = ["| key | value |", "|---|---|"]
    rows.append(f"| version | {charter.version} |")
    rows.append(f"| tags | {_cell(', '.join(charter.tags))} |")
    rows.append(f"| timebox_minutes | {charter.timebox_minutes} |")
    rows.append(f"| persona | {_cell(persona)} |")
    return "\n".join(rows)


def _cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", "<br>")
