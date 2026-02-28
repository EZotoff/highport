# /verify-app

Holistic application verification via Atlas orchestration with structured scenarios + exploratory testing.

## Usage

```
/verify-app                           # Full verification (all scenarios + exploration)
/verify-app --smoke-only              # Quick smoke tests only
/verify-app --skip-exploratory        # Structured scenarios only, skip exploration
/verify-app --plan=custom-plan.md     # Use custom verification plan
```

---

## Overview

This command triggers a comprehensive verification workflow:

1. **Prerequisites Check** - Static gates, unit tests, E2E tests
2. **Structured Scenarios** - Execute Gherkin-style acceptance scenarios
3. **Multi-User Sync Tests** - Two-context browser testing
4. **Exploratory Testing** - Agent-driven free exploration
5. **Report Generation** - Aggregate results with evidence

**Orchestration**: Atlas manages the execution loop, delegating browser interactions to agents with the `/playwright` skill.

---

## Workflow

### Phase 0: Setup TODO Tracking

```
TodoWrite([
  { id: "prerequisites", content: "Check prerequisites (services, static gates, tests)", status: "pending", priority: "high" },
  { id: "smoke-tests", content: "Execute smoke tests (app loads, pages render)", status: "pending", priority: "high" },
  { id: "feature-tests", content: "Execute feature tests (CRUD, interactions)", status: "pending", priority: "high" },
  { id: "persistence-tests", content: "Execute persistence tests (reload, session)", status: "pending", priority: "high" },
  { id: "sync-tests", content: "Execute multi-user sync tests", status: "pending", priority: "critical" },
  { id: "integration-tests", content: "Execute integration tests (user journeys)", status: "pending", priority: "high" },
  { id: "exploratory", content: "Perform exploratory testing (15 min)", status: "pending", priority: "medium" },
  { id: "report", content: "Generate verification report", status: "pending", priority: "high" }
])
```

---

### Phase 1: Prerequisites Check

**Mark "prerequisites" as in_progress.**

#### 1.1 Verify Services Running

```bash
# Check if services are running
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 2>/dev/null)
HOCUSPOCUS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 2>/dev/null)
FASTIFY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3012/health 2>/dev/null)

echo "Web (3010): $WEB_STATUS"
echo "Hocuspocus (3011): $HOCUSPOCUS_STATUS"
echo "Fastify (3012): $FASTIFY_STATUS"
```

**If services not running**:
```bash
# Start PostgreSQL
docker compose up -d

# Start all services
pnpm dev &
echo "turbo:$!" > /tmp/verify-app-server.info

# Wait for services to be ready
for i in {1..30}; do
  curl -s http://localhost:3010 > /dev/null && break
  sleep 1
done
```

#### 1.2 Run Static Gates

```bash
# Create evidence directory
mkdir -p .sisyphus/evidence/highport-holistic/prerequisites

# TypeCheck
pnpm typecheck > .sisyphus/evidence/highport-holistic/prerequisites/typecheck-output.txt 2>&1
TYPECHECK_EXIT=$?

# Build
pnpm build > .sisyphus/evidence/highport-holistic/prerequisites/build-output.txt 2>&1
BUILD_EXIT=$?

# Unit Tests
pnpm test > .sisyphus/evidence/highport-holistic/prerequisites/test-output.txt 2>&1
TEST_EXIT=$?

# E2E Tests
pnpm e2e > .sisyphus/evidence/highport-holistic/prerequisites/e2e-output.txt 2>&1
E2E_EXIT=$?

echo "TypeCheck: $TYPECHECK_EXIT, Build: $BUILD_EXIT, Test: $TEST_EXIT, E2E: $E2E_EXIT"
```

**STOP if any prerequisite fails. Fix before proceeding.**

**Mark "prerequisites" as completed (or failed).**

---

### Phase 2: Execute Structured Scenarios

Read the verification plan:
```
Read(".sisyphus/verification/highport-holistic.md")
```

For each scenario category, delegate to a subagent with playwright skill:

#### 2.1 Smoke Tests

**Mark "smoke-tests" as in_progress.**

```
delegate_task(
  category="quick",
  load_skills=["playwright"],
  prompt=`
## TASK
Execute Smoke Tests from verification plan.

## SCENARIOS
S1: Application Loads - Navigate to localhost:3010, verify no errors
S2: Graph Page Renders - Navigate to /graph, verify React Flow canvas
S3: Table Page Renders - Navigate to /reputation, verify table

## EVIDENCE REQUIREMENTS
- Screenshot each scenario: .sisyphus/evidence/highport-holistic/smoke/smoke-0X-*.png
- Log console errors to: .sisyphus/evidence/highport-holistic/console-errors.txt
- Return: { passed: number, failed: number, errors: string[] }

## MUST DO
- Use skill_mcp(mcp_name="playwright", tool_name="browser_navigate", ...)
- Use skill_mcp(mcp_name="playwright", tool_name="browser_console_messages", ...)
- Use skill_mcp(mcp_name="playwright", tool_name="browser_take_screenshot", ...)

## MUST NOT DO
- Do NOT skip any scenario
- Do NOT continue if app fails to load
`
)
```

**Mark "smoke-tests" as completed.**

#### 2.2 Feature Tests

**Mark "feature-tests" as in_progress.**

```
delegate_task(
  category="quick",
  load_skills=["playwright"],
  prompt=`
## TASK
Execute Feature Tests from verification plan.

## SCENARIOS
F1: Create Graph Node - Add node via button
F2: Select Graph Node - Click to select
F3: Delete Graph Node - Right-click context menu
F4: Drag Graph Node - Drag to new position
F5: Edit Table Cell - Edit faction name
F6: Add Table Row - Add faction button

## EVIDENCE REQUIREMENTS
- Screenshot each: .sisyphus/evidence/highport-holistic/feature/feature-0X-*.png
- Return: { passed: number, failed: number, details: [...] }

## IMPORTANT
- Clear IndexedDB before graph tests: page.evaluate(() => indexedDB.deleteDatabase('highport-graph'))
- Wait for elements before interacting
- Take before/after screenshots for mutations
`
)
```

**Mark "feature-tests" as completed.**

#### 2.3 Persistence Tests

**Mark "persistence-tests" as in_progress.**

```
delegate_task(
  category="quick", 
  load_skills=["playwright"],
  prompt=`
## TASK
Execute Persistence Tests.

## SCENARIOS
P1: Graph persists after reload - Create nodes, reload, verify
P2: Graph persists after browser close - New context, verify data
P3: Table persists after reload - Edit data, reload, verify

## EVIDENCE
- .sisyphus/evidence/highport-holistic/persist/persist-0X-*.png
`
)
```

**Mark "persistence-tests" as completed.**

---

### Phase 3: Multi-User Sync Tests

**Mark "sync-tests" as in_progress.**

This requires two browser contexts. Special handling needed.

```
delegate_task(
  category="unspecified-high",
  load_skills=["playwright"],
  prompt=`
## TASK
Execute Multi-User Sync Tests using TWO browser contexts.

## CRITICAL SETUP
You must use browser_run_code to create two contexts:

\`\`\`javascript
async (page) => {
  const browser = page.context().browser();
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  
  // Navigate both to /graph
  await pageA.goto('http://localhost:3010/graph');
  await pageB.goto('http://localhost:3010/graph');
  
  // Wait for sync establishment
  await pageA.waitForTimeout(3000);
  
  // ... test scenarios
}
\`\`\`

## SCENARIOS
M1: Node Creation Syncs - A creates, B sees within 500ms
M2: Node Drag Syncs - A drags, B sees movement
M3: Node Deletion Syncs - A deletes, B sees removal
M4: Conflict Resolution - Both edit simultaneously

## MEASUREMENTS
- Measure sync latency for each operation
- Save to: .sisyphus/evidence/highport-holistic/sync/sync-latency-measurements.json

## EVIDENCE
- Screenshot both contexts: sync-0X-*-A.png, sync-0X-*-B.png

## SUCCESS CRITERIA
- Sync latency < 500ms for M1, M2, M3
- M4: Both users end up with same state (CRDT merge)
`
)
```

**Mark "sync-tests" as completed.**

---

### Phase 4: Integration Tests

**Mark "integration-tests" as in_progress.**

```
delegate_task(
  category="quick",
  load_skills=["playwright"],
  prompt=`
## TASK
Execute Integration Tests (user journeys).

## SCENARIOS
I1: Full Graph Journey - Create 3 nodes, position, delete 1, reload, verify 2 remain
I2: Navigation Flow - Graph → Reputation → Resources → Home → Graph

## EVIDENCE
- .sisyphus/evidence/highport-holistic/integration/integration-0X-*.png
`
)
```

**Mark "integration-tests" as completed.**

---

### Phase 5: Exploratory Testing

**Mark "exploratory" as in_progress.**

```
delegate_task(
  category="unspecified-high",
  load_skills=["playwright"],
  prompt=`
## TASK
Perform 15 minutes of exploratory testing.

## GOAL
Find bugs, edge cases, and UX issues NOT covered by structured tests.

## EXPLORATION PROMPTS
1. Click "Add Node" 20 times rapidly - does it handle burst?
2. Create 50+ nodes - performance?
3. Try special characters, emoji in text fields
4. With two contexts, edit same field simultaneously
5. Rapidly switch pages while sync active
6. Zoom in/out, resize window, mobile viewport
7. Try Ctrl+Z - is there undo?
8. Delete all nodes - empty state?
9. Simulate slow network
10. Watch console for any warnings

## EVIDENCE REQUIREMENTS
- Create: .sisyphus/evidence/highport-holistic/exploratory/exploration-log.md
- Screenshot any issues found: finding-XX-description.png
- Document:
  - What you tried
  - What happened
  - Severity (Critical/High/Medium/Low)
  - Reproduction steps

## TIME BUDGET
- Spend at least 15 minutes exploring
- Focus on: Graph interactions, multi-user sync, edge cases

## OUTPUT FORMAT
Return a structured list of findings:
{
  "explorationTime": "15 minutes",
  "areasExplored": [...],
  "findings": [
    { "id": 1, "title": "...", "severity": "...", "steps": "...", "screenshot": "..." }
  ]
}
`
)
```

**Mark "exploratory" as completed.**

---

### Phase 6: Generate Report

**Mark "report" as in_progress.**

Aggregate all results and generate REPORT.md:

```markdown
# Verification Report: highport-holistic

**Date**: {timestamp}
**Duration**: {total time}
**Executor**: Atlas + Sisyphus agents

## Summary

| Category | Passed | Failed | Total |
|----------|--------|--------|-------|
| Smoke Tests | X | Y | 3 |
| Feature Tests | X | Y | 6 |
| Persistence Tests | X | Y | 3 |
| Sync Tests | X | Y | 4 |
| Integration Tests | X | Y | 2 |
| **Total Structured** | X | Y | 18 |

**Exploratory Findings**: N issues (C critical, H high, M medium, L low)
**Console Errors**: N

**Overall Status**: PASS / FAIL / PARTIAL

## Detailed Results
...

## Exploratory Findings
...

## Recommendations
...
```

Write to: `.sisyphus/evidence/highport-holistic/REPORT.md`

**Mark "report" as completed.**

---

### Phase 7: Cleanup

If we started the dev server:
```bash
if [ -f /tmp/verify-app-server.info ]; then
  SERVER_INFO=$(cat /tmp/verify-app-server.info)
  SERVER_PID=$(echo $SERVER_INFO | cut -d: -f2)
  kill $SERVER_PID 2>/dev/null
  rm /tmp/verify-app-server.info
  echo "Stopped server started by verify-app"
fi
```

---

## Final Output

```
=== /verify-app Complete ===

Plan: highport-holistic
Duration: {time}

Results:
  Smoke Tests:       3/3 PASS
  Feature Tests:     6/6 PASS
  Persistence Tests: 3/3 PASS
  Sync Tests:        3/4 PASS (M4 flaky)
  Integration Tests: 2/2 PASS
  
  Structured Total:  17/18 PASS (94%)

Exploratory:
  Time: 15 minutes
  Findings: 2 issues
    - [Medium] Rapid node creation causes brief lag
    - [Low] Empty state message could be clearer

Console Errors: 0

Evidence: .sisyphus/evidence/highport-holistic/
Report: .sisyphus/evidence/highport-holistic/REPORT.md

OVERALL: PASS ✓
```

---

## Quick Reference

### Files
- **Plan Template**: `.sisyphus/verification/TEMPLATE.md`
- **Highport Plan**: `.sisyphus/verification/highport-holistic.md`
- **Evidence Directory**: `.sisyphus/evidence/highport-holistic/`
- **Final Report**: `.sisyphus/evidence/highport-holistic/REPORT.md`

### Service Ports
| Service | Port |
|---------|------|
| Web (Next.js) | 3010 |
| Hocuspocus | 3011 |
| Fastify API | 3012 |
| PostgreSQL | 5432 |

### Success Criteria
- All smoke/feature/persistence tests: PASS
- Sync tests: ≥75% PASS
- No Critical issues from exploration
- No console errors
