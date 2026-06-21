from typing import Literal

from pydantic import BaseModel, Field, RootModel, field_validator, model_validator


class PersonaModel(BaseModel):
    planner: str
    driver: str | None = None
    critic: str | None = None
    temperature: float = Field(default=0.3, ge=0, le=2)


class BehavioralConstraints(RootModel[list[str]]):
    root: list[str] = Field(default_factory=list)


class UXPreferences(BaseModel):
    prefers_clear_labels: bool = True
    latency_tolerance_ms: int = Field(default=3000, gt=0)


class PersonaAccess(BaseModel):
    chargen: Literal["read_write", "read_only", "gm_controls_only"] = "read_write"
    graph: Literal["read_write", "read_only"] = "read_only"
    chat: bool = False


class ScoringConfig(BaseModel):
    scale: int = Field(default=5, ge=1, le=5)
    dimensions: list[str] = Field(
        default_factory=lambda: ["typography", "spacing", "copy_clarity", "cls", "contrast"]
    )
    pass_threshold: float = Field(default=3.5, ge=0)
    samples_per_state: int = Field(default=3, gt=0)
    aggregate: Literal["median", "mean", "min", "max"] = "median"

    @model_validator(mode="after")
    def validate_threshold_within_scale(self) -> "ScoringConfig":
        if self.pass_threshold > self.scale:
            raise ValueError("pass_threshold cannot exceed scale")
        return self


class Persona(BaseModel):
    id: str
    role: Literal["player", "gm", "ui-critic"]
    model: PersonaModel
    system_prompt_includes: list[str] = Field(default_factory=list)
    behavioral_constraints: list[str] = Field(default_factory=list)
    ux_preferences: UXPreferences = Field(default_factory=UXPreferences)
    access: PersonaAccess = Field(default_factory=PersonaAccess)
    scoring: ScoringConfig | None = None

    @field_validator("id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("id must not be empty")
        return value

    @model_validator(mode="after")
    def validate_role_model_contract(self) -> "Persona":
        if self.role == "ui-critic":
            if self.model.driver is not None:
                raise ValueError("ui-critic personas must not define a driver model")
            if self.model.critic is None:
                raise ValueError("ui-critic personas require a critic model")
            if self.scoring is None:
                raise ValueError("ui-critic personas require scoring")
        else:
            if self.model.driver is None:
                raise ValueError("interactive personas require a driver model")
            if self.scoring is not None:
                raise ValueError("scoring is only valid for ui-critic personas")
        return self
