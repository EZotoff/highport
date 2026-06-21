from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from agent_qa.charters.schema import Charter
from agent_qa.reporting.evidence import EvidenceDir


@dataclass
class DesignFinding:
    severity: str
    dimension: str
    title: str
    description: str
    recommendation: str
    screenshot_ref: str | None = None
    element_selector: str | None = None


@dataclass
class DimensionScore:
    dimension: str
    score: int
    rationale: str


@dataclass
class CritiqueReport:
    charter_id: str
    overall_score: float
    scores: list[DimensionScore]
    findings: list[DesignFinding]
    summary: str
    screenshots: list[Path]


DIMENSION_LABELS = {
    "readability": "Readability",
    "hierarchy": "Visual Hierarchy",
    "layout": "Layout & Spacing",
    "color": "Color & Mood",
    "interaction": "Interaction Design",
    "accessibility": "Accessibility",
}
DIMENSION_ALIASES = {
    "readability": "readability",
    "visual hierarchy": "hierarchy",
    "hierarchy": "hierarchy",
    "layout & spacing": "layout",
    "layout and spacing": "layout",
    "layout": "layout",
    "spacing": "layout",
    "color & mood": "color",
    "color and mood": "color",
    "colour & mood": "color",
    "colour and mood": "color",
    "color": "color",
    "colour": "color",
    "interaction design": "interaction",
    "interaction": "interaction",
    "accessibility": "accessibility",
}
SEVERITIES = ("P0", "P1", "P2", "P3")
DASH_PATTERN = r"\u2014\u2013-"


def generate_critique_report(
    charter: Charter,
    driver_result: object,
    evidence_dir: EvidenceDir,
    *,
    critique_text: str | None = None,
) -> Path:
    """Write a markdown UI critique report to {evidence_dir.reports}/critique.md."""
    evidence_dir.reports.mkdir(parents=True, exist_ok=True)
    path = evidence_dir.reports / "critique.md"
    raw_text = critique_text if critique_text is not None else _driver_final_result(driver_result)
    scores, findings = parse_llm_critique(raw_text)
    screenshots = sorted(evidence_dir.screenshots.glob("*.png"))
    overall_score = compute_overall_score(scores)
    report = CritiqueReport(
        charter_id=charter.id,
        overall_score=overall_score,
        scores=scores,
        findings=findings,
        summary=_extract_summary(raw_text, scores, findings),
        screenshots=screenshots,
    )
    content = "\n".join(
        [
            f"# UI Critique: {charter.title}",
            "",
            f"## Overall Score: {report.overall_score:.1f}/100",
            "",
            "## Summary",
            "",
            report.summary,
            "",
            "## Dimension Scores",
            "",
            _dimension_scores_table(report.scores),
            "",
            "## Findings by Severity",
            "",
            _findings_by_severity(report.findings),
            "",
            "## Screenshots",
            "",
            _screenshots_gallery(report.screenshots),
            "",
            "## Raw Agent Output",
            "",
            "```text",
            raw_text or "No raw agent output was captured.",
            "```",
            "",
        ]
    )
    _ = path.write_text(content, encoding="utf-8")
    return path


def parse_llm_critique(text: str) -> tuple[list[DimensionScore], list[DesignFinding]]:
    """Best-effort parse of structured LLM critique text into scores and findings."""
    if not text.strip():
        return [], []
    scores = _parse_dimension_scores(text)
    findings = _parse_findings(text)
    return scores, findings


def compute_overall_score(scores: list[DimensionScore]) -> float:
    """Average of dimension scores * 20 → 0-100 scale."""
    if not scores:
        return 0.0
    bounded = [min(5, max(0, score.score)) for score in scores]
    return sum(bounded) / len(bounded) * 20


def _parse_dimension_scores(text: str) -> list[DimensionScore]:
    pattern = re.compile(
        rf"^\s*[-*]?\s*(?P<name>[A-Za-z][A-Za-z &]+?)\s*:\s*(?P<score>[0-5])\s*(?:/\s*5)?\s*(?:[{DASH_PATTERN}]\s*)?(?P<rationale>.*)$",
        re.IGNORECASE,
    )
    scores_by_dimension: dict[str, DimensionScore] = {}
    for line in text.splitlines():
        match = pattern.match(line)
        if not match:
            continue
        dimension = _normalize_dimension(match.group("name"))
        if dimension is None:
            continue
        scores_by_dimension[dimension] = DimensionScore(
            dimension=dimension,
            score=int(match.group("score")),
            rationale=match.group("rationale").strip() or "No rationale provided.",
        )
    return [
        score for dimension in DIMENSION_LABELS if (score := scores_by_dimension.get(dimension))
    ]


def _parse_findings(text: str) -> list[DesignFinding]:
    findings: list[DesignFinding] = []
    current_severity: str | None = None
    in_findings = False
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r"^#{1,3}\s*findings\b", stripped, re.IGNORECASE):
            in_findings = True
            continue
        heading_severity = _severity_from_text(stripped)
        if stripped.startswith("#") and heading_severity is not None:
            current_severity = heading_severity
            in_findings = True
            continue
        if stripped.startswith("##") and "finding" not in stripped.lower():
            in_findings = False
            continue
        if not in_findings and heading_severity is None:
            continue
        if _is_none_line(stripped):
            continue
        if _looks_like_finding_item(stripped):
            severity = heading_severity or current_severity
            if severity is None:
                continue
            findings.append(_finding_from_line(stripped, severity))
    return findings


def _finding_from_line(line: str, severity: str) -> DesignFinding:
    clean = re.sub(r"^[-*]\s*", "", line).strip()
    clean = re.sub(
        rf"^P[0-3]\s*(?:Critical|Major|Minor|Nit)?\s*[:{DASH_PATTERN}]?\s*", "", clean
    ).strip()
    recommendation = _extract_recommendation(clean)
    title, description = _split_title_description(clean)
    return DesignFinding(
        severity=severity,
        dimension=_infer_dimension(clean),
        title=title,
        description=description,
        recommendation=recommendation,
        screenshot_ref=_extract_screenshot_ref(clean),
        element_selector=_extract_selector(clean),
    )


def _extract_summary(text: str, scores: list[DimensionScore], findings: list[DesignFinding]) -> str:
    summary = _section_body(text, "Summary")
    if summary:
        return summary
    if scores:
        finding_count = len(findings)
        return (
            f"The UI critique produced {len(scores)} dimension scores and "
            f"{finding_count} design findings. Review the raw agent output for narrative detail."
        )
    return "The agent output could not be parsed into a structured summary. Review raw output and screenshots."


def _dimension_scores_table(scores: list[DimensionScore]) -> str:
    rows = ["| dimension | score | rationale |", "|---|---:|---|"]
    if not scores:
        rows.append("| - | - | No structured dimension scores parsed |")
        return "\n".join(rows)
    for score in scores:
        label = _cell(DIMENSION_LABELS.get(score.dimension, score.dimension))
        rows.append(f"| {label} | {score.score}/5 | {_cell(score.rationale)} |")
    return "\n".join(rows)


def _findings_by_severity(findings: list[DesignFinding]) -> str:
    blocks: list[str] = []
    for severity in SEVERITIES:
        label = {
            "P0": "P0 Critical",
            "P1": "P1 Major",
            "P2": "P2 Minor",
            "P3": "P3 Nit",
        }[severity]
        blocks.append(f"### {label}")
        severity_findings = [finding for finding in findings if finding.severity == severity]
        if not severity_findings:
            blocks.append("None")
            blocks.append("")
            continue
        for finding in severity_findings:
            blocks.extend(
                [
                    f"- **{_cell(finding.title)}** ({_cell(finding.dimension)})",
                    f"  - Description: {_cell(finding.description)}",
                    f"  - Recommendation: {_cell(finding.recommendation)}",
                ]
            )
            if finding.screenshot_ref is not None:
                blocks.append(f"  - Screenshot: `{finding.screenshot_ref}`")
            if finding.element_selector is not None:
                blocks.append(f"  - Element: `{finding.element_selector}`")
        blocks.append("")
    return "\n".join(blocks).rstrip()


def _screenshots_gallery(screenshots: list[Path]) -> str:
    if not screenshots:
        return "No screenshots were captured."
    rows: list[str] = []
    for screenshot in screenshots:
        caption = screenshot.stem.replace("_", " ")
        rows.append(f"### {caption}")
        rows.append(f"![{caption}]({screenshot})")
        rows.append(f"`{screenshot}`")
        rows.append("")
    return "\n".join(rows).rstrip()


def _normalize_dimension(value: str) -> str | None:
    return DIMENSION_ALIASES.get(value.strip().lower())


def _infer_dimension(text: str) -> str:
    lowered = text.lower()
    for alias, dimension in DIMENSION_ALIASES.items():
        if alias in lowered:
            return dimension
    return "readability"


def _severity_from_text(text: str) -> str | None:
    match = re.search(r"\b(P[0-3])\b", text, re.IGNORECASE)
    return match.group(1).upper() if match else None


def _looks_like_finding_item(text: str) -> bool:
    return text.startswith(("- ", "* ")) or _severity_from_text(text) is not None


def _is_none_line(text: str) -> bool:
    cleaned = text.strip("-* ").lower()
    return cleaned in {"none", "none."}


def _extract_recommendation(text: str) -> str:
    match = re.search(r"\b(?:recommendation|recommend|fix)\s*:\s*(.+)$", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return "Review this element against the UI critique rubric and adjust the design accordingly."


def _split_title_description(text: str) -> tuple[str, str]:
    without_recommendation = re.split(
        r"\b(?:recommendation|recommend|fix)\s*:", text, maxsplit=1, flags=re.IGNORECASE
    )[0].strip()
    bold = re.match(
        rf"\*\*(?P<title>[^*]+)\*\*\s*[:{DASH_PATTERN}]?\s*(?P<body>.*)",
        without_recommendation,
    )
    if bold:
        title = bold.group("title").strip()
        description = bold.group("body").strip() or without_recommendation
        return title, description
    for separator in (" \u2014 ", " \u2013 ", ": ", " - "):
        if separator in without_recommendation:
            title, description = without_recommendation.split(separator, 1)
            return _short_title(title), description.strip() or without_recommendation
    return _short_title(without_recommendation), without_recommendation


def _short_title(text: str) -> str:
    title = text.strip().rstrip(".")
    if len(title) <= 80:
        return title
    return f"{title[:77].rstrip()}..."


def _extract_screenshot_ref(text: str) -> str | None:
    match = re.search(r"(?:screenshot|image)\s*[:#]?\s*`?([^`\s]+\.png)`?", text, re.IGNORECASE)
    return match.group(1) if match else None


def _extract_selector(text: str) -> str | None:
    match = re.search(r"(?:selector|element)\s*[:=]\s*`([^`]+)`", text, re.IGNORECASE)
    return match.group(1) if match else None


def _section_body(text: str, heading: str) -> str:
    pattern = re.compile(
        rf"^##\s+{re.escape(heading)}\s*$\n(?P<body>.*?)(?=^##\s+|\Z)",
        re.IGNORECASE | re.MULTILINE | re.DOTALL,
    )
    match = pattern.search(text)
    if match is None:
        return ""
    return match.group("body").strip()


def _driver_final_result(driver_result: object) -> str:
    final_result = getattr(driver_result, "final_result", None)
    return final_result if isinstance(final_result, str) else ""


def _cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", "<br>")
