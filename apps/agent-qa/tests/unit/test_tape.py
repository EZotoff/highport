import json
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from typing import cast

import pytest
from agent_qa.runtime.tape import StepKind, StepRecord, Tape, TapeCorruptedError


def utc_timestamp() -> datetime:
    return datetime(2026, 6, 21, 14, 30, 45, tzinfo=UTC)


def test_empty_tape_read_all_returns_empty_list(tmp_path: Path) -> None:
    path = tmp_path / "tape.jsonl"
    path.touch()

    assert Tape(path).read_all() == []


def test_tape_init_does_not_create_file(tmp_path: Path) -> None:
    path = tmp_path / "nested" / "tape.jsonl"

    _ = Tape(path)

    assert not path.exists()


def test_single_write_and_read_round_trip(tmp_path: Path) -> None:
    tape = Tape(tmp_path / "tape.jsonl")
    record = StepRecord(
        index=0,
        kind=StepKind.ACT,
        timestamp=utc_timestamp(),
        action="click: button.next-step",
        selector="button.next-step",
        result="ok",
        screenshot_path="screenshots/000.png",
        dom_path="dom/000.html",
        tokens_used=12,
        duration_ms=34,
        metadata={"phase": "background"},
    )

    tape.write_step(record)

    assert tape.read_all() == [record]


def test_multiple_writes_preserve_order(tmp_path: Path) -> None:
    tape = Tape(tmp_path / "tape.jsonl")
    records = [
        StepRecord(index=0, kind=StepKind.PLAN, timestamp=utc_timestamp(), action="plan"),
        StepRecord(index=1, kind=StepKind.ACT, timestamp=utc_timestamp(), action="act"),
        StepRecord(index=2, kind=StepKind.OBSERVE, timestamp=utc_timestamp(), action="observe"),
    ]

    for record in records:
        tape.write_step(record)

    assert tape.read_all() == records


@pytest.mark.parametrize("kind", list(StepKind))
def test_to_jsonl_from_jsonl_round_trips_all_step_kinds(kind: StepKind) -> None:
    record = StepRecord(
        index=3,
        kind=kind,
        timestamp=utc_timestamp(),
        action=f"{kind.value}: action",
        metadata={"kind": kind.value},
    )

    assert StepRecord.from_jsonl(record.to_jsonl()) == record
    assert StepRecord.from_jsonl(f"{record.to_jsonl()}\n") == record


def test_optional_none_fields_are_absent_from_json() -> None:
    record = StepRecord(index=0, kind=StepKind.PLAN, timestamp=utc_timestamp())

    payload = cast(dict[str, object], json.loads(record.to_jsonl()))

    assert "action" not in payload
    assert "selector" not in payload
    assert "result" not in payload
    assert "screenshot_path" not in payload
    assert "dom_path" not in payload
    assert "tokens_used" not in payload
    assert "duration_ms" not in payload


def test_summary_counts_mixed_record_types_excluding_meta(tmp_path: Path) -> None:
    tape = Tape(tmp_path / "tape.jsonl")
    for record in [
        StepRecord(index=0, kind=StepKind.META, timestamp=utc_timestamp()),
        StepRecord(index=1, kind=StepKind.PLAN, timestamp=utc_timestamp()),
        StepRecord(index=2, kind=StepKind.ACT, timestamp=utc_timestamp()),
        StepRecord(index=3, kind=StepKind.ACT, timestamp=utc_timestamp()),
        StepRecord(index=4, kind=StepKind.OBSERVE, timestamp=utc_timestamp()),
        StepRecord(index=5, kind=StepKind.ASSERT, timestamp=utc_timestamp()),
        StepRecord(index=6, kind=StepKind.ERROR, timestamp=utc_timestamp()),
    ]:
        tape.write_step(record)

    assert tape.summary() == {
        "total_steps": 6,
        "plan": 1,
        "act": 2,
        "observe": 1,
        "assert": 1,
        "error": 1,
        "errors": 1,
        "total_tokens": 0,
        "total_duration_ms": 0,
    }


def test_summary_tokens_and_duration_sum_non_meta_records(tmp_path: Path) -> None:
    tape = Tape(tmp_path / "tape.jsonl")
    for record in [
        StepRecord(
            index=0,
            kind=StepKind.META,
            timestamp=utc_timestamp(),
            tokens_used=100,
            duration_ms=200,
        ),
        StepRecord(index=1, kind=StepKind.PLAN, timestamp=utc_timestamp(), tokens_used=5),
        StepRecord(index=2, kind=StepKind.ACT, timestamp=utc_timestamp(), duration_ms=10),
        StepRecord(
            index=3,
            kind=StepKind.ERROR,
            timestamp=utc_timestamp(),
            tokens_used=7,
            duration_ms=11,
        ),
    ]:
        tape.write_step(record)

    summary = tape.summary()

    assert summary["total_tokens"] == 12
    assert summary["total_duration_ms"] == 21


def test_corrupted_line_raises_tape_corrupted_error_with_line_number(tmp_path: Path) -> None:
    tape = Tape(tmp_path / "tape.jsonl")
    tape.write_step(StepRecord(index=0, kind=StepKind.PLAN, timestamp=utc_timestamp()))
    _ = tape.path.write_text(f"{tape.path.read_text(encoding='utf-8')}not-json\n", encoding="utf-8")

    with pytest.raises(TapeCorruptedError) as exc_info:
        _ = tape.read_all()

    assert exc_info.value.line_no == 2
    assert "Tape corrupted at line 2" in str(exc_info.value)
    assert "not-json" in str(exc_info.value)


def test_write_meta_produces_meta_record(tmp_path: Path) -> None:
    tape = Tape(tmp_path / "tape.jsonl")

    tape.write_meta(charter_id="S0", status="start")

    records = tape.read_all()
    assert len(records) == 1
    assert records[0].index == 0
    assert records[0].kind is StepKind.META
    assert records[0].metadata == {"charter_id": "S0", "status": "start"}


def test_concurrent_writes_do_not_corrupt_file(tmp_path: Path) -> None:
    tape = Tape(tmp_path / "tape.jsonl")
    count = 40

    def write_record(index: int) -> None:
        tape.write_step(
            StepRecord(
                index=index,
                kind=StepKind.ACT,
                timestamp=utc_timestamp(),
                action=f"click-{index}",
            )
        )

    with ThreadPoolExecutor(max_workers=8) as executor:
        _ = list(executor.map(write_record, range(count)))

    records = tape.read_all()
    assert len(records) == count
    assert {record.index for record in records} == set(range(count))
    assert all(record.kind is StepKind.ACT for record in records)
