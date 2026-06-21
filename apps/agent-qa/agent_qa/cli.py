from __future__ import annotations

import asyncio
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from agent_qa.charters.loader import load_all
from agent_qa.charters.schema import Charter
from agent_qa.config import Settings
from agent_qa.health.probes import ServiceName
from agent_qa.reporting.report import format_summary_line
from agent_qa.runtime.session import run_many
from agent_qa.stack import bootstrap_stack, probe_stack

app = typer.Typer(help="Highport Agent-QA harness.")
console = Console()


@app.command()
def probe() -> None:
    """Check Highport service health."""
    report = asyncio.run(probe_stack())
    table = Table("service", "status", "latency", "detail")
    for service, result in report.results.items():
        latency = "n/a" if result.latency_ms is None else f"{result.latency_ms:.1f}ms"
        table.add_row(service.value, result.status.value, latency, result.detail)
    console.print(table)
    if not report.all_required_up({ServiceName.WEB}):
        raise typer.Exit(1)


@app.command()
def bootstrap() -> None:
    """Start missing local stack services."""
    report = asyncio.run(bootstrap_stack(_repo_root()))
    table = Table("field", "value")
    table.add_row("success", str(report.success))
    table.add_row("actions", ", ".join(report.actions) or "none")
    table.add_row("pids", ", ".join(str(pid) for pid in report.pids) or "none")
    table.add_row("error", report.error or "none")
    console.print(table)
    if not report.success:
        raise typer.Exit(1)


@app.command()
def run(
    charter: str = typer.Option("all", "--charter", "-c", help="Charter id or 'all'."),
    only: str | None = typer.Option(None, "--only", help="Filter by persona role."),
) -> None:
    """Run one or more enabled charters."""
    if only is not None and only not in {"player", "gm", "ui-critic"}:
        raise typer.BadParameter("only must be one of: player, gm, ui-critic")
    charters = [item for item in load_all() if item.enabled]
    if charter != "all":
        charters = [item for item in charters if item.id == charter]
    if only is not None:
        charters = [item for item in charters if _charter_role(item) == only]
    if not charters:
        console.print("[red]No matching enabled charters.[/red]")
        raise typer.Exit(1)
    results = asyncio.run(run_many([item.id for item in charters]))
    table = Table("charter", "outcome", "summary", "report")
    for result in results:
        table.add_row(
            result.charter_id, result.outcome, result.summary, str(result.report_path or "")
        )
        console.print(format_summary_line(result))
    console.print(table)
    if any(result.outcome not in {"pass", "xfail"} for result in results):
        raise typer.Exit(1)


@app.command("list")
def list_charters() -> None:
    """List available charters."""
    table = Table("id", "title", "tags", "enabled")
    for charter in load_all():
        table.add_row(charter.id, charter.title, ", ".join(charter.tags), str(charter.enabled))
    console.print(table)


@app.command()
def report(
    latest: bool = typer.Option(False, "--latest", help="Show most recent report path."),
) -> None:
    """List generated reports."""
    settings = Settings.from_env()
    reports = sorted(settings.evidence_root.glob("*/*/reports/report.md"))
    if latest:
        console.print(reports[-1] if reports else "No reports found.")
        return
    table = Table("report")
    for path in reports:
        table.add_row(str(path))
    console.print(table)


def _charter_role(charter: Charter) -> str | None:
    primary = charter.persona.primary
    if primary in {"player", "gm", "ui-critic"}:
        return str(primary)
    return None


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]
