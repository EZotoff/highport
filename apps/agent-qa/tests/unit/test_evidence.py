from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path

from agent_qa.reporting.evidence import EvidenceDir


def test_create_builds_expected_layout(tmp_path: Path) -> None:
    timestamp = datetime(2026, 6, 21, 14, 30, 45, tzinfo=UTC)

    evidence = EvidenceDir.create(tmp_path, "S0", timestamp)

    assert evidence.root == tmp_path / "2026-06-21T14-30-45Z"
    assert evidence.screenshots == evidence.root / "S0" / "screenshots"
    assert evidence.tape == evidence.root / "S0" / "tape.jsonl"
    assert evidence.dom == evidence.root / "S0" / "dom"
    assert evidence.reports == evidence.root / "S0" / "reports"


def test_create_makes_directories_but_not_tape_file(tmp_path: Path) -> None:
    evidence = EvidenceDir.create(tmp_path, "A1", datetime(2026, 6, 21, tzinfo=UTC))

    assert evidence.screenshots.is_dir()
    assert evidence.dom.is_dir()
    assert evidence.reports.is_dir()
    assert not evidence.tape.exists()


def test_create_is_idempotent_and_deterministic(tmp_path: Path) -> None:
    timestamp = datetime(2026, 6, 21, 14, 30, 45, tzinfo=UTC)

    first = EvidenceDir.create(tmp_path, "B1", timestamp)
    second = EvidenceDir.create(tmp_path, "B1", timestamp)

    assert first == second
    assert first.screenshots.is_dir()


def test_timestamp_is_utc_safe_for_filenames(tmp_path: Path) -> None:
    offset = timezone(timedelta(hours=-4))
    timestamp = datetime(2026, 6, 21, 10, 30, 45, tzinfo=offset)

    evidence = EvidenceDir.create(tmp_path, "C1", timestamp)

    assert evidence.root.name == "2026-06-21T14-30-45Z"
    assert ":" not in evidence.root.name


def test_naive_timestamp_is_treated_as_utc(tmp_path: Path) -> None:
    timestamp = datetime(2026, 6, 21, 14, 30, 45)

    evidence = EvidenceDir.create(tmp_path, "GM-D", timestamp)

    assert evidence.root.name == "2026-06-21T14-30-45Z"
