from datetime import UTC, datetime
from pathlib import Path

from agent_qa.charters.loader import load_charter
from agent_qa.reporting.evidence import EvidenceDir
from agent_qa.reporting.report import format_summary_line, generate_report
from agent_qa.runtime.driver import DriverResult, StepCapture
from agent_qa.runtime.session import BoundaryCheckResult, CharterRunResult
from agent_qa.runtime.tape import StepKind, StepRecord, Tape


def run_result(tmp_path: Path, outcome: str = "pass") -> CharterRunResult:
    evidence = EvidenceDir.create(tmp_path, "S0", datetime(2026, 6, 21, tzinfo=UTC))
    driver_result = DriverResult(
        success=outcome == "pass",
        steps=[StepCapture(1, datetime.now(UTC), "url", "Highport", "done", [], None, None)],
        final_url="url",
        final_result="done",
        errors=[] if outcome == "pass" else ["boom"],
        total_tokens=22,
        wall_clock_s=2.0,
        budget_snapshot={
            "steps_used": 1,
            "tokens_used": 22,
            "wall_clock_s": 2.0,
            "last_step_tokens": 22,
        },
        termination_reason="done",
    )
    return CharterRunResult(
        charter_id="S0",
        started_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
        precondition_status={"web": "up"},
        driver_result=driver_result,
        report_path=None,
        evidence_dir=evidence,
        outcome=outcome,
        summary="driver completed and invariants passed",
        boundary_results=[
            BoundaryCheckResult("page_title_present", "regex_present", "Highport", "Highport", True)
        ],
    )


def test_generate_report_writes_file(tmp_path: Path) -> None:
    charter = load_charter("S0")
    result = run_result(tmp_path)

    path = generate_report(charter, result, result.evidence_dir)

    assert path.exists()
    assert path.name == "report.md"


def test_report_contains_required_sections(tmp_path: Path) -> None:
    charter = load_charter("S0")
    result = run_result(tmp_path)

    content = generate_report(charter, result, result.evidence_dir).read_text(encoding="utf-8")

    for section in [
        "# Charter S0: Harness smoke test",
        "## Outcome: pass",
        "## Mission",
        "## Preconditions",
        "## Timeline",
        "## Boundary Invariants",
        "## Budget",
        "## Errors",
        "## Artifacts",
        "## Charter Metadata",
    ]:
        assert section in content


def test_timeline_uses_tape_records(tmp_path: Path) -> None:
    charter = load_charter("S0")
    result = run_result(tmp_path)
    Tape(result.evidence_dir.tape).write_step(
        StepRecord(index=1, kind=StepKind.ACT, action="click", result="loaded")
    )

    content = generate_report(charter, result, result.evidence_dir).read_text(encoding="utf-8")

    assert "click" in content
    assert "loaded" in content


def test_boundary_and_budget_tables_render(tmp_path: Path) -> None:
    charter = load_charter("S0")
    result = run_result(tmp_path)

    content = generate_report(charter, result, result.evidence_dir).read_text(encoding="utf-8")

    assert "page_title_present" in content
    assert "| steps | 1.00 | 5 | 20.0% |" in content
    assert "| tokens | 22.00 | 5000 | 0.4% |" in content


def test_errors_render_when_present(tmp_path: Path) -> None:
    charter = load_charter("S0")
    result = run_result(tmp_path, "fail")

    content = generate_report(charter, result, result.evidence_dir).read_text(encoding="utf-8")

    assert "- boom" in content


def test_artifacts_include_screenshot_paths(tmp_path: Path) -> None:
    charter = load_charter("S0")
    result = run_result(tmp_path)
    screenshot = result.evidence_dir.screenshots / "step_001.png"
    screenshot.write_bytes(b"png")

    content = generate_report(charter, result, result.evidence_dir).read_text(encoding="utf-8")

    assert "step_001.png" in content


def test_format_summary_line(tmp_path: Path) -> None:
    result = run_result(tmp_path)

    assert format_summary_line(result) == "[pass] S0: driver completed and invariants passed"
