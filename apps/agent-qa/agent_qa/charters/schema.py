from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

STATUS_ORDER = ("background", "career_selection", "term_resolution", "mustering_out", "finalized")
SERVICES = {"web", "hocuspocus", "fastify", "postgres", "rag", "ollama"}


class PersonaRef(BaseModel):
    primary: str | None = None
    secondary: str | None = None
    critic: str | None = None


class PlayerRole(BaseModel):
    persona_id: str
    user_role: str
    mission: str
    max_steps: int = Field(default=15, gt=0)


class PlayersConfig(BaseModel):
    mode: Literal["sequential", "concurrent"] = "sequential"
    roles: list[PlayerRole] = Field(default_factory=list)


class Preconditions(BaseModel):
    services_required: list[str]
    services_optional: list[str]
    services_prohibited: list[str]
    seed_data: dict[str, Any] = Field(default_factory=dict)
    session_config: dict[str, Any] = Field(default_factory=dict)

    @field_validator("services_required", "services_optional", "services_prohibited")
    @classmethod
    def validate_services(cls, value: list[str]) -> list[str]:
        unknown = set(value) - SERVICES
        if unknown:
            raise ValueError(f"unknown services: {sorted(unknown)}")
        return value

    @model_validator(mode="after")
    def validate_service_sets(self) -> "Preconditions":
        service_sets = [
            ("required", set(self.services_required)),
            ("optional", set(self.services_optional)),
            ("prohibited", set(self.services_prohibited)),
        ]
        for index, (left_name, left) in enumerate(service_sets):
            for right_name, right in service_sets[index + 1 :]:
                overlap = left & right
                if overlap:
                    raise ValueError(
                        f"services cannot be both {left_name} and {right_name}: {sorted(overlap)}"
                    )
        return self


class FSMExpectation(BaseModel):
    transition: tuple[str, str]
    trigger: str
    assert_within_ms: int = Field(default=3000, gt=0)
    require_substates: list[str] = Field(default_factory=list)

    @field_validator("transition", mode="before")
    @classmethod
    def validate_transition_shape(cls, value: object) -> object:
        if not isinstance(value, (list, tuple)) or len(value) != 2:
            raise ValueError("transition must contain exactly two statuses")
        return value

    @model_validator(mode="after")
    def validate_transition_order(self) -> "FSMExpectation":
        from_status, to_status = self.transition
        if from_status not in STATUS_ORDER or to_status not in STATUS_ORDER:
            raise ValueError(f"transition statuses must be in {list(STATUS_ORDER)}")
        if STATUS_ORDER.index(to_status) <= STATUS_ORDER.index(from_status):
            raise ValueError("transition must move forward through the chargen FSM")
        return self


class BoundaryInvariant(BaseModel):
    id: str
    kind: Literal[
        "exact",
        "range",
        "upper_bound",
        "regex_present",
        "regex_absent",
        "element_visible",
        "element_has_text",
        "fsm_state_is",
        "url_matches",
    ]
    expect: Any = None
    min: int | None = None
    max: int | None = None
    pattern: str | None = None
    filter: str | None = None
    description: str | None = None
    target: str | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, value: object) -> object:
        if not isinstance(value, dict):
            return value
        normalized = dict(value)
        if "expected" in normalized and "expect" not in normalized:
            normalized["expect"] = normalized["expected"]
        if "expected" in normalized and "pattern" not in normalized:
            normalized["pattern"] = str(normalized["expected"])
        if "selector" in normalized and "filter" not in normalized:
            normalized["filter"] = normalized["selector"]
        return normalized

    @model_validator(mode="after")
    def validate_kind_requirements(self) -> "BoundaryInvariant":
        if self.kind in {"regex_present", "regex_absent"} and not self.pattern:
            raise ValueError("regex invariants require pattern")
        if self.kind == "url_matches" and not self.pattern:
            raise ValueError("url_matches invariants require pattern")
        if self.kind == "element_visible" and not self.filter:
            raise ValueError("element_visible invariants require filter selector")
        if self.kind == "element_has_text" and (not self.filter or self.expect is None):
            raise ValueError("element_has_text invariants require filter selector and expect text")
        if self.kind == "fsm_state_is" and self.expect is None:
            raise ValueError("fsm_state_is invariants require expect")
        if self.kind == "range":
            if self.min is None or self.max is None:
                raise ValueError("range invariants require min and max")
            if self.min > self.max:
                raise ValueError("range invariant min cannot exceed max")
        if self.kind == "upper_bound" and self.expect is None:
            raise ValueError("upper_bound invariants require expect")
        return self


class BehavioralCheck(BaseModel):
    id: str
    kind: Literal["llm_judge", "tape_contains", "dom_text_matches"]
    model: str | None = None
    prompt_template: str | None = None
    actions: list[str] | None = None
    pattern: str | None = None

    @model_validator(mode="after")
    def validate_kind_requirements(self) -> "BehavioralCheck":
        if self.kind == "llm_judge" and not self.prompt_template:
            raise ValueError("llm_judge checks require prompt_template")
        if self.kind == "tape_contains" and not self.actions:
            raise ValueError("tape_contains checks require actions")
        if self.kind == "dom_text_matches" and not self.pattern:
            raise ValueError("dom_text_matches checks require pattern")
        return self


class SuccessCriteria(BaseModel):
    required: list[str] = Field(min_length=1)
    preferred: list[str] = Field(default_factory=list)
    budget_aware: dict[str, bool] = Field(default_factory=dict)


class Budget(BaseModel):
    max_steps: int = Field(default=50, gt=0)
    max_tokens_per_step: int = Field(default=2000, gt=0)
    max_total_tokens: int = Field(default=100000, gt=0)
    max_wall_clock_s: int = Field(default=600, gt=0)
    retry_on_infra_failure: int = Field(default=1, ge=0)


class EvidenceConfig(BaseModel):
    screenshots: Literal["off", "per_step", "on_failure"] = "per_step"
    action_tape: Literal["jsonl"] = "jsonl"
    dom_snapshots: Literal["off", "per_step", "on_assertion_failure"] = "on_assertion_failure"
    video: Literal["off", "on", "on_failure"] = "off"


class LoginConfig(BaseModel):
    required: bool = False
    user_role: str = "player1"


class Charter(BaseModel):
    id: str
    title: str
    version: int = 1
    enabled: bool = True
    tags: list[str] = Field(default_factory=list)
    areas: list[str] = Field(default_factory=list)
    timebox_minutes: int = Field(default=90, gt=0)
    mission: str
    persona: PersonaRef
    personas: PlayersConfig | None = None
    preconditions: Preconditions
    fsm_expectations: list[FSMExpectation] = Field(default_factory=list)
    boundary_invariants: list[BoundaryInvariant] = Field(default_factory=list)
    behavioral_checks: list[BehavioralCheck] = Field(default_factory=list)
    success_criteria: SuccessCriteria
    login: LoginConfig | None = None
    budget: Budget = Field(default_factory=Budget)
    evidence: EvidenceConfig = Field(default_factory=EvidenceConfig)
    known_failure_modes: list[str] = Field(default_factory=list)
    xfail: bool = False

    @field_validator("id", "title", "mission")
    @classmethod
    def validate_non_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value

    @field_validator("mission")
    @classmethod
    def validate_mission_template(cls, value: str) -> str:
        return value
