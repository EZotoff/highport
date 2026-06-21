from pathlib import Path
from typing import Any

import yaml

from .schema import Charter

DATA_DIR = Path(__file__).parent / "data"


def _read_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        data = yaml.safe_load(file)
    if not isinstance(data, dict):
        raise ValueError(f"charter file must contain a mapping: {path}")
    return data


def load_charter(id: str) -> Charter:
    path = DATA_DIR / f"{id}.yaml"
    if not path.exists():
        raise FileNotFoundError(path)
    charter = Charter.model_validate(_read_yaml(path))
    if charter.id != path.stem:
        raise ValueError(f"charter id {charter.id!r} does not match filename {path.stem!r}")
    return charter


def load_all() -> list[Charter]:
    return [load_charter(path.stem) for path in sorted(DATA_DIR.glob("*.yaml"))]
