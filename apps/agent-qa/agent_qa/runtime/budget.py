import time
from dataclasses import dataclass


@dataclass(frozen=True)
class BudgetConfig:
    max_steps: int = 50
    max_tokens_per_step: int = 2000
    max_total_tokens: int = 100_000
    max_wall_clock_s: int = 600
    retry_on_infra_failure: int = 1


class BudgetExceeded(RuntimeError):
    """Raised when a hard budget cap is exceeded."""

    def __init__(self, dimension: str, used: int | float, limit: int | float) -> None:
        self.dimension: str = dimension
        self.used: int | float = used
        self.limit: int | float = limit
        super().__init__(f"Budget exceeded: {dimension} used={used}, limit={limit}")


@dataclass
class BudgetSnapshot:
    steps_used: int = 0
    tokens_used: int = 0
    wall_clock_s: float = 0.0
    last_step_tokens: int = 0
    started_at: float | None = None


class BudgetGuard:
    """Hard-enforces budget caps. NOT retryable: exceeding a cap = charter FAIL."""

    def __init__(self, config: BudgetConfig) -> None:
        self.config: BudgetConfig = config
        self._snapshot: BudgetSnapshot = BudgetSnapshot()

    def start(self) -> None:
        if self._snapshot.started_at is not None:
            raise RuntimeError("BudgetGuard.start() called twice")
        self._snapshot.started_at = time.monotonic()
        self._snapshot.wall_clock_s = 0.0

    def record_step(self, tokens: int) -> None:
        self._snapshot.steps_used += 1
        self._snapshot.tokens_used += tokens
        self._snapshot.last_step_tokens = tokens

        if self._snapshot.steps_used > self.config.max_steps:
            raise BudgetExceeded("steps", self._snapshot.steps_used, self.config.max_steps)
        if tokens > self.config.max_tokens_per_step:
            raise BudgetExceeded("tokens_per_step", tokens, self.config.max_tokens_per_step)
        if self._snapshot.tokens_used > self.config.max_total_tokens:
            raise BudgetExceeded(
                "total_tokens", self._snapshot.tokens_used, self.config.max_total_tokens
            )

        self._refresh_wall_clock()
        if self._snapshot.wall_clock_s > self.config.max_wall_clock_s:
            raise BudgetExceeded(
                "wall_clock", self._snapshot.wall_clock_s, self.config.max_wall_clock_s
            )

    def check_time(self) -> None:
        self._refresh_wall_clock()
        if self._snapshot.wall_clock_s > self.config.max_wall_clock_s:
            raise BudgetExceeded(
                "wall_clock", self._snapshot.wall_clock_s, self.config.max_wall_clock_s
            )

    def snapshot(self) -> BudgetSnapshot:
        self._refresh_wall_clock()
        return BudgetSnapshot(
            steps_used=self._snapshot.steps_used,
            tokens_used=self._snapshot.tokens_used,
            wall_clock_s=self._snapshot.wall_clock_s,
            last_step_tokens=self._snapshot.last_step_tokens,
            started_at=self._snapshot.started_at,
        )

    def remaining(self, dimension: str) -> int | float:
        self._refresh_wall_clock()
        if dimension == "steps":
            return self.config.max_steps - self._snapshot.steps_used
        if dimension == "tokens":
            return self.config.max_total_tokens - self._snapshot.tokens_used
        if dimension == "wall_clock":
            return self.config.max_wall_clock_s - self._snapshot.wall_clock_s
        raise ValueError("Unknown budget dimension; expected steps, tokens, or wall_clock")

    def _refresh_wall_clock(self) -> None:
        if self._snapshot.started_at is None:
            return
        self._snapshot.wall_clock_s = time.monotonic() - self._snapshot.started_at
