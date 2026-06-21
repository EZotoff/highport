from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path


@dataclass(frozen=True)
class EvidenceDir:
    root: Path
    charter_id: str

    @property
    def screenshots(self) -> Path:
        return self.root / self.charter_id / "screenshots"

    @property
    def tape(self) -> Path:
        return self.root / self.charter_id / "tape.jsonl"

    @property
    def dom(self) -> Path:
        return self.root / self.charter_id / "dom"

    @property
    def reports(self) -> Path:
        return self.root / self.charter_id / "reports"

    @classmethod
    def create(
        cls,
        evidence_root: Path,
        charter_id: str,
        timestamp: datetime | None = None,
    ) -> "EvidenceDir":
        stamp = _format_timestamp(timestamp or datetime.now(UTC))
        evidence_dir = cls(root=evidence_root / stamp, charter_id=charter_id)
        evidence_dir.screenshots.mkdir(parents=True, exist_ok=True)
        evidence_dir.dom.mkdir(parents=True, exist_ok=True)
        evidence_dir.reports.mkdir(parents=True, exist_ok=True)
        return evidence_dir


def _format_timestamp(timestamp: datetime) -> str:
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=UTC)
    timestamp = timestamp.astimezone(UTC)
    return timestamp.strftime("%Y-%m-%dT%H-%M-%SZ")
