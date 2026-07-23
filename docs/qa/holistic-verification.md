# Holistic Verification System

## Quick Start

To run a full holistic verification of Highport:

```
/verify-app
```

This starts an orchestrated verification process with:

1. Prerequisite checks for services, static gates, and tests
2. Structured scenarios using Gherkin acceptance tests
3. Multi-user sync tests in two browser contexts
4. Fifteen minutes of agent-driven exploratory testing
5. Report generation with supporting evidence

## Verification Files

| File                                          | Purpose                         |
| --------------------------------------------- | ------------------------------- |
| `.sisyphus/verification/TEMPLATE.md`          | Template for verification plans |
| `.sisyphus/verification/highport-holistic.md` | Highport-specific scenarios     |
| `.opencode/skills/verify-app.md`              | Slash command skill             |
| `.sisyphus/evidence/{plan-name}/`             | Evidence output directory       |

## Verification Plan Structure

Verification plans contain:

```
┌─────────────────────────────────────────────────────────────┐
│  VERIFICATION PLAN STRUCTURE                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PREREQUISITES                                              │
│  - Services running (Docker, pnpm dev)                      │
│  - Static gates pass (typecheck, build)                     │
│  - Tests pass (unit, E2E)                                   │
│                                                             │
│  STRUCTURED SCENARIOS (Gherkin format)                      │
│  - Smoke Tests (app loads, pages render)                    │
│  - Feature Tests (CRUD operations)                          │
│  - Persistence Tests (data survives reload)                 │
│  - Multi-User Sync Tests (real-time collaboration)          │
│  - Integration Tests (user journeys)                        │
│  - Error Handling Tests (graceful degradation)              │
│                                                             │
│  EXPLORATORY TESTING                                        │
│  - Time-boxed free exploration (15 min)                     │
│  - Edge case discovery                                      │
│  - Performance stress testing                               │
│  - Visual/UX issue hunting                                  │
│                                                             │
│  EVIDENCE REQUIREMENTS                                      │
│  - Screenshots for each scenario                            │
│  - Console error logs                                       │
│  - Sync latency measurements                                │
│  - REPORT.md summary                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

See the [Acceptance Scenario Format](file:///home/ezotoff/AI_projects/traveller/docs/qa/acceptance-scenarios.md) and [Multi-User Sync Testing Protocol](file:///home/ezotoff/AI_projects/traveller/docs/qa/sync-testing.md) for detailed patterns.

## Scenario Format (Gherkin)

````markdown
### Scenario {N}: {Name}

**Priority**: Critical | High | Medium | Low
**Component**: Graph | Table | Sync | RAG | Foundry
**Multi-User**: Yes | No

```gherkin
GIVEN {precondition}
AND {additional precondition}
WHEN {user action}
AND {additional action}
THEN {expected outcome}
AND {additional expectation}
```

**Evidence**: `{screenshot-name}.png`
````

## Execution Flow

The orchestrator runs verification in this order:

1. Check prerequisites sequentially. Confirm services are running, type checking passes, and tests pass.
2. Run smoke tests.
3. Run feature tests, in parallel where possible.
4. Run persistence tests.
5. Run multi-user sync tests in two browser contexts.
6. Run integration tests.
7. Perform fifteen minutes of exploratory testing.
8. Generate `REPORT.md` and mark verification complete.

## Evidence Directory Structure

```
.sisyphus/evidence/highport-holistic/
├── prerequisites/
│ ├── typecheck-output.txt
│ ├── test-output.txt
│ └── e2e-output.txt
├── smoke/
│ └── smoke-_.png
├── feature/
│ └── feature-_.png
├── persist/
│ └── persist-_.png
├── sync/
│ ├── sync-_-A.png
│ ├── sync-_-B.png
│ └── sync-latency-measurements.json
├── integration/
│ └── integration-_.png
├── exploratory/
│ ├── exploration-log.md
│ └── finding-*.png
├── console-errors.txt
└── REPORT.md
```

## Success Criteria

| Category          | Requirement        | Blocking |
| ----------------- | ------------------ | -------- |
| Smoke Tests       | 100% pass          | Yes      |
| Feature Tests     | 100% pass          | Yes      |
| Persistence Tests | 100% pass          | Yes      |
| Multi-User Sync   | ≥75% pass          | Yes      |
| Integration Tests | 100% pass          | Yes      |
| Error Handling    | ≥50% pass          | No       |
| Exploratory       | No Critical issues | Yes      |
| Console Errors    | 0 errors           | Yes      |

**PASS = All blocking requirements met**

## Manual Invocation

If you prefer to run verification manually instead of `/verify-app`:

```markdown
Run holistic verification of Highport.

1. Check services: localhost:18120, 18121, 18122
2. Run: pnpm typecheck && pnpm test && pnpm e2e
3. Load skill: /playwright
4. Execute scenarios from .sisyphus/verification/highport-holistic.md
5. Perform 15 min exploratory testing
6. Generate REPORT.md in .sisyphus/evidence/
```

## Creating Custom Verification Plans

To create a verification plan for a new feature or subsystem:

1. Copy `.sisyphus/verification/TEMPLATE.md`
2. Define prerequisites specific to the feature
3. Write Gherkin scenarios for all acceptance criteria
4. Add exploratory prompts for edge cases
5. Define evidence requirements
6. Run with: `/verify-app --plan=my-plan.md`
