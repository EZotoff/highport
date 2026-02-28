# Holistic Verification Plan Template

> This template is used by Prometheus to generate verification plans.
> Atlas executes these plans via the `/verify-app` command.

---

## Plan Metadata

```yaml
name: '{plan-name}'
version: '{semver}'
generated: '{ISO-8601 timestamp}'
trigger: '{what triggered this verification - release, PR, feature complete}'
scope: '{full | partial | regression}'
```

---

## Prerequisites Checklist

Before agentic verification begins, these MUST pass:

```markdown
## Prerequisites

- [ ] PostgreSQL running: `docker compose up -d`
- [ ] All services started: `pnpm dev` (or individually)
- [ ] Static gates pass:
  - [ ] `pnpm typecheck` → exit 0
  - [ ] `pnpm build` → exit 0
  - [ ] `pnpm lint` → no blocking errors
- [ ] Unit tests pass: `pnpm test` → all green
- [ ] E2E tests pass: `pnpm e2e` → all green (excluding skipped)
```

---

## Structured Test Scenarios

### Format: Gherkin-Style Acceptance Scenarios

Each scenario follows this format:

````markdown
### Scenario {N}: {Descriptive Name}

**Priority**: {Critical | High | Medium | Low}
**Component**: {Graph | Table | Sync | RAG | Foundry | Integration}
**Multi-User**: {Yes | No}

```gherkin
GIVEN {precondition - initial state}
AND {additional precondition if needed}
WHEN {user action via UI}
AND {additional action if needed}
THEN {expected outcome - what user sees}
AND {additional expectation if needed}
```
````

**Verification Steps**:

1. {Specific Playwright action}
2. {Assertion to make}
3. {Screenshot to capture}

**Evidence**: `{screenshot-name}.png`

````

### Scenario Categories

1. **Smoke Tests** (Critical) - App loads, no crashes
2. **Feature Tests** (High) - Each feature works in isolation
3. **Integration Tests** (High) - Features work together
4. **Multi-User Tests** (Critical) - Real-time sync works
5. **Persistence Tests** (High) - Data survives reload/reconnect
6. **Error Handling Tests** (Medium) - Graceful degradation

---

## Exploratory Testing Section

After structured scenarios, agents perform exploratory testing:

```markdown
## Exploratory Testing

### Exploration Goals
- [ ] Find edge cases not covered by structured tests
- [ ] Discover visual/UX issues
- [ ] Test unexpected user flows
- [ ] Stress test with unusual inputs

### Exploration Prompts
{List of open-ended prompts for the agent to explore}

1. "What happens if you rapidly click Add Node 20 times?"
2. "Can you break the sync by disconnecting network mid-operation?"
3. "What's the experience with 100+ nodes on the graph?"
4. "Try invalid inputs in every text field"
5. "Navigate away and back - does state persist?"

### Exploration Time Budget
- Minimum: 10 minutes of free exploration
- Focus areas: {list areas of recent change or known fragility}

### Exploration Evidence
- Document ALL unexpected behaviors
- Screenshot anything that looks wrong
- Record console errors
- Note performance issues
````

---

## Evidence Requirements

All verification MUST produce evidence in:

```
.sisyphus/evidence/{plan-name}/
├── prerequisites/
│   └── static-gates-output.txt
├── scenarios/
│   ├── scenario-01-{name}.png
│   ├── scenario-02-{name}.png
│   └── ...
├── exploratory/
│   ├── finding-01-{description}.png
│   ├── finding-02-{description}.png
│   └── exploration-log.md
├── console-errors.txt
├── sync-latency-measurements.json
└── REPORT.md
```

### REPORT.md Format

```markdown
# Verification Report: {plan-name}

**Date**: {timestamp}
**Duration**: {time taken}
**Agent**: {agent identifier}

## Summary

- **Structured Scenarios**: {X}/{Y} passed
- **Exploratory Findings**: {N} issues found
- **Console Errors**: {count}
- **Overall Status**: {PASS | FAIL | PARTIAL}

## Scenario Results

| #   | Scenario | Status    | Notes        |
| --- | -------- | --------- | ------------ |
| 1   | {name}   | PASS/FAIL | {brief note} |

## Exploratory Findings

### Finding 1: {Title}

- **Severity**: {Critical | High | Medium | Low}
- **Reproduction**: {steps}
- **Evidence**: `exploratory/finding-01-*.png`

## Recommendations

- {List any issues that need fixing}

## Appendix

- Full console log: console-errors.txt
- Sync measurements: sync-latency-measurements.json
```

---

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ VERIFICATION EXECUTION (Atlas Orchestration)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. PREREQUISITES CHECK (Sequential)                        │
│    ├─ Start services if not running                        │
│    ├─ Run static gates                                     │
│    ├─ Run unit tests                                       │
│    └─ Run E2E tests                                        │
│    [STOP if any fail - fix first]                          │
│                                                             │
│ 2. STRUCTURED SCENARIOS (Parallel where possible)          │
│    ├─ Group by component                                   │
│    ├─ Execute via Playwright MCP                           │
│    ├─ Capture evidence for each                            │
│    └─ Log pass/fail                                        │
│    [Continue even if some fail - document all]             │
│                                                             │
│ 3. MULTI-USER SCENARIOS (Sequential - needs 2 contexts)    │
│    ├─ Open Context A and Context B                         │
│    ├─ Execute sync scenarios                               │
│    ├─ Measure latency                                      │
│    └─ Document results                                     │
│                                                             │
│ 4. EXPLORATORY TESTING (Time-boxed)                        │
│    ├─ Agent explores freely                                │
│    ├─ Documents findings                                   │
│    └─ Captures evidence                                    │
│                                                             │
│ 5. REPORT GENERATION                                       │
│    ├─ Aggregate all results                                │
│    ├─ Generate REPORT.md                                   │
│    └─ Return summary to user                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Example Plan Instance

See `.sisyphus/verification/planeshift-holistic.md` for the PlaneShift-specific verification plan.
