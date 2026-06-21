import pytest
from agent_qa.runtime.budget import BudgetConfig, BudgetExceeded, BudgetGuard


def test_steps_exceed_raises_on_51st_call() -> None:
    guard = BudgetGuard(BudgetConfig())

    for _ in range(50):
        guard.record_step(0)

    with pytest.raises(BudgetExceeded) as exc_info:
        guard.record_step(0)

    assert exc_info.value.dimension == "steps"
    assert exc_info.value.used == 51
    assert exc_info.value.limit == 50
    assert str(exc_info.value) == "Budget exceeded: steps used=51, limit=50"


def test_tokens_per_step_exceed_raises() -> None:
    guard = BudgetGuard(BudgetConfig(max_tokens_per_step=10))

    guard.record_step(10)

    with pytest.raises(BudgetExceeded) as exc_info:
        guard.record_step(11)

    assert exc_info.value.dimension == "tokens_per_step"
    assert exc_info.value.used == 11
    assert exc_info.value.limit == 10
    assert guard.snapshot().last_step_tokens == 11


def test_total_tokens_exceed_raises_when_cumulative_exceeds_cap() -> None:
    guard = BudgetGuard(BudgetConfig(max_total_tokens=10, max_tokens_per_step=10))

    guard.record_step(6)
    guard.record_step(4)

    with pytest.raises(BudgetExceeded) as exc_info:
        guard.record_step(1)

    assert exc_info.value.dimension == "total_tokens"
    assert exc_info.value.used == 11
    assert exc_info.value.limit == 10


def test_wall_clock_exceed_raises_with_monotonic_time(monkeypatch: pytest.MonkeyPatch) -> None:
    current_time = {"value": 100.0}
    monkeypatch.setattr("agent_qa.runtime.budget.time.monotonic", lambda: current_time["value"])
    guard = BudgetGuard(BudgetConfig(max_wall_clock_s=10))
    guard.start()

    current_time["value"] = 110.0
    guard.check_time()
    current_time["value"] = 110.1

    with pytest.raises(BudgetExceeded) as exc_info:
        guard.check_time()

    assert exc_info.value.dimension == "wall_clock"
    assert exc_info.value.used == pytest.approx(10.1)
    assert exc_info.value.limit == 10


def test_start_called_twice_raises_runtime_error() -> None:
    guard = BudgetGuard(BudgetConfig())
    guard.start()

    with pytest.raises(RuntimeError, match="called twice"):
        guard.start()


def test_record_step_zero_is_valid_and_counts_step() -> None:
    guard = BudgetGuard(BudgetConfig())
    guard.record_step(0)

    snapshot = guard.snapshot()
    assert snapshot.steps_used == 1
    assert snapshot.tokens_used == 0
    assert snapshot.last_step_tokens == 0


def test_snapshot_reflects_state_after_each_operation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    current_time = {"value": 1_000.0}
    monkeypatch.setattr("agent_qa.runtime.budget.time.monotonic", lambda: current_time["value"])
    guard = BudgetGuard(BudgetConfig(max_steps=5, max_total_tokens=100, max_wall_clock_s=20))

    initial = guard.snapshot()
    assert initial.steps_used == 0
    assert initial.tokens_used == 0
    assert initial.started_at is None

    guard.start()
    started = guard.snapshot()
    assert started.started_at == 1_000.0
    assert started.wall_clock_s == 0.0

    current_time["value"] = 1_003.5
    guard.record_step(7)
    after_step = guard.snapshot()
    assert after_step.steps_used == 1
    assert after_step.tokens_used == 7
    assert after_step.last_step_tokens == 7
    assert after_step.wall_clock_s == 3.5
    assert guard.remaining("steps") == 4
    assert guard.remaining("tokens") == 93
    assert guard.remaining("wall_clock") == 16.5

    after_step.steps_used = 99
    assert guard.snapshot().steps_used == 1


def test_off_by_one_exact_cap_allowed_cap_plus_one_raises() -> None:
    step_guard = BudgetGuard(BudgetConfig(max_steps=2))
    step_guard.record_step(0)
    step_guard.record_step(0)
    with pytest.raises(BudgetExceeded) as step_exc_info:
        step_guard.record_step(0)
    assert step_exc_info.value.dimension == "steps"

    token_guard = BudgetGuard(BudgetConfig(max_tokens_per_step=2, max_total_tokens=3))
    token_guard.record_step(2)
    token_guard.record_step(1)
    with pytest.raises(BudgetExceeded) as token_exc_info:
        token_guard.record_step(1)
    assert token_exc_info.value.dimension == "total_tokens"


def test_unknown_remaining_dimension_raises() -> None:
    guard = BudgetGuard(BudgetConfig())

    with pytest.raises(ValueError, match="Unknown budget dimension"):
        _ = guard.remaining("retry")
