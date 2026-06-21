from pathlib import Path
from typing import Any

import yaml

from .schema import Persona

DATA_DIR = Path(__file__).parent / "data"


def _read_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        data = yaml.safe_load(file)
    if not isinstance(data, dict):
        raise ValueError(f"persona file must contain a mapping: {path}")
    return data


def load_persona(id: str) -> Persona:
    path = DATA_DIR / f"{id}.yaml"
    if not path.exists():
        raise FileNotFoundError(path)
    persona = Persona.model_validate(_read_yaml(path))
    if persona.id != path.stem:
        raise ValueError(f"persona id {persona.id!r} does not match filename {path.stem!r}")
    return persona


def load_all() -> list[Persona]:
    return [load_persona(path.stem) for path in sorted(DATA_DIR.glob("*.yaml"))]
