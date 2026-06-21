# pyright: reportAny=false, reportExplicitAny=false

import json
import os
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from pathlib import Path
from typing import IO, Any, cast


class StepKind(str, Enum):  # noqa: UP042
    PLAN = "plan"
    ACT = "act"
    OBSERVE = "observe"
    ASSERT = "assert"
    ERROR = "error"
    META = "meta"


@dataclass
class StepRecord:
    index: int
    kind: StepKind
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    action: str | None = None
    selector: str | None = None
    result: str | None = None
    screenshot_path: str | None = None
    dom_path: str | None = None
    tokens_used: int | None = None
    duration_ms: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_jsonl(self) -> str:
        payload: dict[str, object] = {
            "index": self.index,
            "kind": self.kind.value,
            "timestamp": _as_utc(self.timestamp).isoformat(),
            "metadata": self.metadata,
        }
        optional_fields = {
            "action": self.action,
            "selector": self.selector,
            "result": self.result,
            "screenshot_path": self.screenshot_path,
            "dom_path": self.dom_path,
            "tokens_used": self.tokens_used,
            "duration_ms": self.duration_ms,
        }
        payload.update({key: value for key, value in optional_fields.items() if value is not None})
        return json.dumps(payload, separators=(",", ":"))

    @classmethod
    def from_jsonl(cls, line: str) -> "StepRecord":
        raw_payload = cast(object, json.loads(line.rstrip("\n")))
        if not isinstance(raw_payload, dict):
            raise ValueError("Tape line must be a JSON object")

        payload = cast(dict[object, object], raw_payload)
        index = _required_int(payload, "index")
        kind = StepKind(_required_str(payload, "kind"))
        timestamp = datetime.fromisoformat(_required_str(payload, "timestamp"))
        return cls(
            index=index,
            kind=kind,
            timestamp=_as_utc(timestamp),
            action=_optional_str(payload, "action"),
            selector=_optional_str(payload, "selector"),
            result=_optional_str(payload, "result"),
            screenshot_path=_optional_str(payload, "screenshot_path"),
            dom_path=_optional_str(payload, "dom_path"),
            tokens_used=_optional_int(payload, "tokens_used"),
            duration_ms=_optional_int(payload, "duration_ms"),
            metadata=_metadata(payload),
        )


class Tape:
    """Append-only JSONL tape."""

    def __init__(self, path: Path) -> None:
        self.path: Path = path

    def write_step(self, record: StepRecord) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as fh:
            _lock_exclusive(fh)
            try:
                _ = fh.write(record.to_jsonl())
                _ = fh.write("\n")
                fh.flush()
                os.fsync(fh.fileno())
            finally:
                _unlock(fh)

    def write_meta(self, **kwargs: Any) -> None:
        self.write_step(
            StepRecord(
                index=len(self.read_all()),
                kind=StepKind.META,
                metadata=kwargs,
            )
        )

    def read_all(self) -> list[StepRecord]:
        if not self.path.exists():
            return []

        records: list[StepRecord] = []
        with self.path.open("r", encoding="utf-8") as fh:
            for line_no, line in enumerate(fh, start=1):
                try:
                    records.append(StepRecord.from_jsonl(line))
                except Exception as exc:
                    raise TapeCorruptedError(line_no, line, exc) from exc
        return records

    def summary(self) -> dict[str, int | float]:
        records = self.read_all()
        non_meta = [record for record in records if record.kind is not StepKind.META]
        summary: dict[str, int | float] = {
            "total_steps": len(non_meta),
            "plan": 0,
            "act": 0,
            "observe": 0,
            "assert": 0,
            "error": 0,
            "errors": 0,
            "total_tokens": 0,
            "total_duration_ms": 0,
        }

        for record in non_meta:
            summary[record.kind.value] += 1
            if record.kind is StepKind.ERROR:
                summary["errors"] += 1
            if record.tokens_used is not None:
                summary["total_tokens"] += record.tokens_used
            if record.duration_ms is not None:
                summary["total_duration_ms"] += record.duration_ms

        return summary


class TapeCorruptedError(RuntimeError):
    """Raised when a tape JSONL line cannot be parsed."""

    def __init__(self, line_no: int, line: str, cause: Exception) -> None:
        message = f"Tape corrupted at line {line_no}: {cause}. Line: {line[:200]}"
        super().__init__(message)
        self.line_no: int = line_no
        self.line: str = line
        self.cause: Exception = cause


def _as_utc(timestamp: datetime) -> datetime:
    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        return timestamp.replace(tzinfo=UTC)
    return timestamp.astimezone(UTC)


def _required_str(payload: dict[object, object], key: str) -> str:
    value = payload[key]
    if not isinstance(value, str):
        raise TypeError(f"{key} must be a string")
    return value


def _required_int(payload: dict[object, object], key: str) -> int:
    value = payload[key]
    if not isinstance(value, int):
        raise TypeError(f"{key} must be an integer")
    return value


def _optional_str(payload: dict[object, object], key: str) -> str | None:
    value = payload.get(key)
    if value is None or isinstance(value, str):
        return value
    raise TypeError(f"{key} must be a string or null")


def _optional_int(payload: dict[object, object], key: str) -> int | None:
    value = payload.get(key)
    if value is None or isinstance(value, int):
        return value
    raise TypeError(f"{key} must be an integer or null")


def _metadata(payload: dict[object, object]) -> dict[str, object]:
    value = payload.get("metadata", {})
    if not isinstance(value, dict):
        raise TypeError("metadata must be an object")

    metadata: dict[str, object] = {}
    raw_metadata = cast(dict[object, object], value)
    for key, item in raw_metadata.items():
        if not isinstance(key, str):
            raise TypeError("metadata keys must be strings")
        metadata[key] = item
    return metadata


def _lock_exclusive(fh: IO[str]) -> None:
    if os.name != "posix":
        return
    import fcntl

    fcntl.flock(fh.fileno(), fcntl.LOCK_EX)


def _unlock(fh: IO[str]) -> None:
    if os.name != "posix":
        return
    import fcntl

    fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
