from datetime import UTC, datetime
from pathlib import Path

from agent_qa.charters.loader import load_charter
from agent_qa.reporting.critique import (
    DesignFinding,
    DimensionScore,
    compute_overall_score,
    generate_critique_report,
    parse_llm_critique,
)
from agent_qa.reporting.evidence import EvidenceDir
from agent_qa.runtime.driver import DriverResult, StepCapture

VALID_CRITIQUE = """
## Design Quality Score: 73/100

## Summary
The chargen shell is readable and mostly coherent, but important controls need clearer explanations.
Spacing is generally consistent, while side panels need stronger hierarchy.

## Dimension Scores
- Readability: 4/5 — Body text is legible with good contrast.
- Visual Hierarchy: 3/5 — Primary actions are visible but side panels compete for attention.
- Layout & Spacing: 4/5 — The shell uses a stable grid and comfortable spacing.
- Color & Mood: 3/5 — Palette fits sci-fi but semantic color is limited.
- Interaction Design: 2/5 — AI Assistance options lack explanation and feedback states.
- Accessibility: 3/5 — Discernible labels exist, but focus affordances are hard to verify.

## Findings
### P0 Critical
None
### P1 Major
- **Interaction controls are under-explained** — The AI Assistance verbosity selector does not explain Minimal/Structured/Rich. Recommendation: Add helper text under the selector.
### P2 Minor
- **Layout spacing drifts in sidebars** — Participant and entity panels use tighter spacing than the main step. Recommendation: Align sidebar padding to the main 16px rhythm.
### P3 Nit
- **Color mood could be richer** — The sci-fi theme would benefit from a slightly stronger accent color.
"""


def driver_result(final_result: str | None = VALID_CRITIQUE) -> DriverResult:
    return DriverResult(
        success=True,
        steps=[
            StepCapture(
                1,
                datetime.now(UTC),
                "http://localhost:18120/chargen",
                "Highport Chargen",
                "done",
                [],
                None,
                None,
            )
        ],
        final_url="http://localhost:18120/chargen",
        final_result=final_result,
        errors=[],
        total_tokens=10,
        wall_clock_s=1.0,
        budget_snapshot={
            "steps_used": 1,
            "tokens_used": 10,
            "wall_clock_s": 1.0,
            "last_step_tokens": 10,
        },
        termination_reason="done",
    )


def test_compute_overall_score_averages_dimensions() -> None:
    scores = [
        DimensionScore("readability", 5, "excellent"),
        DimensionScore("layout", 3, "adequate"),
        DimensionScore("accessibility", 4, "good"),
    ]

    assert compute_overall_score(scores) == 80.0


def test_compute_overall_score_empty_scores_returns_zero() -> None:
    assert compute_overall_score([]) == 0.0


def test_parse_valid_llm_critique_extracts_dimension_scores() -> None:
    scores, _findings = parse_llm_critique(VALID_CRITIQUE)

    assert [score.dimension for score in scores] == [
        "readability",
        "hierarchy",
        "layout",
        "color",
        "interaction",
        "accessibility",
    ]
    assert [score.score for score in scores] == [4, 3, 4, 3, 2, 3]


def test_parse_valid_llm_critique_classifies_findings_by_severity() -> None:
    _scores, findings = parse_llm_critique(VALID_CRITIQUE)

    assert [finding.severity for finding in findings] == ["P1", "P2", "P3"]
    assert findings[0].dimension == "interaction"
    assert findings[0].recommendation == "Add helper text under the selector."


def test_parse_empty_llm_critique_returns_empty_lists() -> None:
    assert parse_llm_critique("\n  \n") == ([], [])


def test_parse_malformed_llm_critique_returns_empty_lists() -> None:
    assert parse_llm_critique("This is narrative prose without rubric markers.") == ([], [])


def test_generate_critique_report_writes_expected_sections(tmp_path: Path) -> None:
    charter = load_charter("U1")
    evidence = EvidenceDir.create(tmp_path, "U1", datetime(2026, 6, 21, tzinfo=UTC))
    screenshot = evidence.screenshots / "step_001.png"
    _ = screenshot.write_bytes(b"png")

    path = generate_critique_report(charter, driver_result(), evidence)
    content = path.read_text(encoding="utf-8")

    assert path.name == "critique.md"
    assert "# UI Critique: UI critique — chargen wizard design quality" in content
    assert "## Overall Score: 63.3/100" in content
    assert "## Dimension Scores" in content
    assert "## Findings by Severity" in content
    assert "step_001.png" in content
    assert "## Raw Agent Output" in content


def test_generate_critique_report_falls_back_to_raw_output(tmp_path: Path) -> None:
    charter = load_charter("U1")
    evidence = EvidenceDir.create(tmp_path, "U1", datetime(2026, 6, 21, tzinfo=UTC))

    content = generate_critique_report(
        charter, driver_result("unstructured critique text"), evidence
    ).read_text(encoding="utf-8")

    assert "No structured dimension scores parsed" in content
    assert "unstructured critique text" in content


def test_report_orders_findings_from_p0_to_p3(tmp_path: Path) -> None:
    charter = load_charter("U1")
    evidence = EvidenceDir.create(tmp_path, "U1", datetime(2026, 6, 21, tzinfo=UTC))
    text = """
## Findings
### P3 Nit
- **Nit title** — color preference.
### P0 Critical
- **Critical title** — accessibility blocks use.
"""

    content = generate_critique_report(charter, driver_result(text), evidence).read_text(
        encoding="utf-8"
    )

    assert content.index("### P0 Critical") < content.index("### P3 Nit")
    assert "Critical title" in content
    assert "Nit title" in content


def test_design_finding_keeps_optional_references() -> None:
    finding = DesignFinding(
        "P2",
        "layout",
        "Crowded sidebar",
        "The sidebar feels crowded.",
        "Increase padding.",
        screenshot_ref="screenshots/sidebar.png",
        element_selector="aside",
    )

    assert finding.screenshot_ref == "screenshots/sidebar.png"
    assert finding.element_selector == "aside"
