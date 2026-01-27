# PROJECT KNOWLEDGE BASE

> Generated: Tue Jan 27 2026
> Branch: master
> Overview: Real-time collaborative TTRPG campaign management platform (Mongoose Traveller 2e). Monorepo with Next.js frontend, Hocuspocus/Fastify backend, and Python RAG service.

## STRUCTURE

```
planeshift/
├── apps/
│   ├── web/            # Next.js 14 frontend (see apps/web/AGENTS.md)
│   ├── server/         # Fastify + Hocuspocus backend (see apps/server/AGENTS.md)
│   └── rag-service/    # Python FastAPI RAG (see apps/rag-service/AGENTS.md)
├── packages/
│   ├── shared/         # TypeScript types & utils
│   └── foundry-module/ # Foundry VTT integration (see packages/foundry-module/AGENTS.md)
├── .sisyphus/          # AI planning & notepads
└── docker-compose.yml  # PostgreSQL infrastructure
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new Yjs document type | `apps/web/lib/ydoc.ts` | Use existing pattern |
| Database schema changes | `apps/server/src/db/schema.ts` | Run db:generate after |
| Add API endpoint | `apps/server/src/api/index.ts` | Fastify routing |
| Shared types | `packages/shared/src/types/` | Export via package.json |
| Frontend components | `apps/web/` | Next.js App Router |
| RAG pipelines | `apps/rag-service/` | Python FastAPI |
| Sync Logic | `apps/web/lib/sync.ts` | Client-side sync logic |
| WebSocket Server | `apps/server/src/ws/hocuspocus.ts` | Hocuspocus server setup |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `GraphNode` | Interface | packages/shared/src/types/graph.ts | Core node schema |
| `GraphEdge` | Interface | packages/shared/src/types/graph.ts | Core edge schema |
| `createYDoc` | Function | apps/web/lib/ydoc.ts | Creates campaign Y.Doc |
| `HocuspocusServer` | Class | apps/server/src/ws/hocuspocus.ts | WebSocket sync server |
| `documents` | Table | apps/server/src/db/schema.ts | Drizzle schema |
| `YjsHelpers` | Module | apps/web/lib/yjs-helpers.ts | Helper functions for Yjs |

## CONVENTIONS

- **Package imports**: `@planeshift/shared/types`, `@planeshift/shared/utils/id`
- **Yjs patterns**: Nested Y.Map for entities, transact for multi-op changes. Use `doc.getMap('name')` for attached maps.
- **Testing**: Vitest, tests in `__tests__/` directories.
- **Database**: Drizzle ORM, migrations in `drizzle/`.

## ANTI-PATTERNS

- **Do NOT** modify Y.Map before attaching to Y.Doc (Critical Yjs behavior).
- **Do NOT** use pnpm without `--filter` for app-specific commands.
- **Do NOT** skip `docker compose up -d` before server tests (DB dependency).
- **Do NOT** import from packages/shared internal paths (use subpath exports).

## COMMANDS

```bash
# Development
pnpm dev              # All services via Turbo
docker compose up -d  # PostgreSQL (required)

# Testing
pnpm test             # All tests via Turbo
pnpm --filter server test
pnpm --filter web test
pnpm e2e              # Playwright E2E tests

# Database
pnpm --filter server db:generate  # After schema changes
pnpm --filter server db:migrate
pnpm --filter server db:studio    # GUI
```

## TESTING

| Type | Framework | Location | Notes |
|------|-----------|----------|-------|
| Unit/Integration | Vitest | `apps/*/__tests__/` | Requires Docker for server |
| E2E | Playwright | `apps/web/e2e/` | 28 tests covering critical flows |

---

# VERIFICATION SYSTEM

## The Core Problem

**"Done" is NOT just when hardcoded tests pass.**

Hardcoded tests (unit, integration, E2E) verify *known* scenarios. They cannot discover:
- Bugs in untested interaction paths
- Visual glitches not covered by assertions
- Edge cases nobody thought to test
- Integration failures between services
- Race conditions in multi-user flows

**Solution: Multi-level verification with agentic exploratory testing.**

---

## VERIFICATION HIERARCHY

```
┌─────────────────────────────────────────────────────────────────┐
│  VERIFICATION LEVELS (ALL MUST PASS)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LEVEL 1: STATIC GATES (automated, fast, always run)            │
│  ├─ pnpm typecheck → Exit 0                                     │
│  ├─ pnpm build → Exit 0                                         │
│  └─ pnpm lint → No blocking errors                              │
│                                                                 │
│  LEVEL 2: UNIT/INTEGRATION TESTS (automated)                    │
│  ├─ pnpm test → All 135+ tests pass                             │
│  └─ Verifies: Component logic, API handlers, CRDT operations    │
│                                                                 │
│  LEVEL 3: E2E TESTS (automated, known scenarios)                │
│  ├─ pnpm e2e → All Playwright tests pass                        │
│  └─ Verifies: Critical user flows, basic sync                   │
│                                                                 │
│  LEVEL 4: AGENTIC MANUAL TESTING (exploratory)                  │
│  ├─ Agent-driven browser interaction via Playwright MCP         │
│  ├─ Prometheus-defined acceptance scenarios                     │
│  ├─ Multi-step user flow verification                           │
│  ├─ Edge case exploration                                       │
│  └─ Verifies: Real functionality works as intended              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### When Each Level is Required

| Task Type | L1 Static | L2 Unit | L3 E2E | L4 Agentic |
|-----------|-----------|---------|--------|------------|
| **Any code change** | ✅ Always | ✅ Always | - | - |
| **UI Component** | ✅ | ✅ | Optional | ✅ Visual + Interaction |
| **API Endpoint** | ✅ | ✅ | Optional | ✅ curl + edge cases |
| **CRDT/Sync Logic** | ✅ | ✅ | ✅ Required | ✅ Multi-user flows |
| **Full-Stack Feature** | ✅ | ✅ | ✅ Required | ✅ All acceptance scenarios |
| **Bug Fix** | ✅ | ✅ + regression | Regression | ✅ Reproduce + variants |
| **Foundry Integration** | ✅ | ✅ | N/A | ✅ Manual (requires Foundry) |

---

## LEVEL 4: AGENTIC MANUAL TESTING PROTOCOL

**This is the key difference from basic verification.**

Agentic testing means an AI agent interactively explores the application via browser automation, executing test scenarios that go beyond hardcoded assertions.

### Why Agentic Testing is Required

1. **Hardcoded tests are blind spots** - They only test what developers anticipated
2. **Visual bugs escape assertions** - "Button visible" passes, but button is clipped
3. **Integration is emergent** - Frontend + Backend + Sync + DB = unpredictable
4. **Edge cases multiply** - 5 features × 10 states = 50 combinations to explore

### Agentic Testing Execution

```python
# AGENTIC TESTING LOOP
# Executed by Atlas after L1-L3 pass, for complex features

# 1. Read acceptance scenarios from task definition
scenarios = task.acceptance_scenarios  # Defined by Prometheus

# 2. For each scenario:
for scenario in scenarios:
    # a. Set up preconditions
    setup_state(scenario.given)
    
    # b. Execute actions via Playwright MCP
    for action in scenario.when:
        skill_mcp(mcp_name="playwright", tool_name=action.tool, 
                  arguments=action.args)
        wait_for_settlement()
    
    # c. Verify outcomes
    for expectation in scenario.then:
        result = verify_expectation(expectation)
        if not result.passed:
            # Capture evidence
            take_screenshot(f"FAIL-{scenario.name}.png")
            get_console_errors()
            # Report failure with context
            fail(f"{scenario.name}: {expectation} - {result.error}")
    
    # d. Capture success evidence
    take_screenshot(f"PASS-{scenario.name}.png")

# 3. Explore edge cases
for edge_case in task.edge_cases:
    explore_and_document(edge_case)
```

### Evidence Requirements

All agentic testing MUST produce evidence:

```
.sisyphus/evidence/{task-id}/
├── PASS-scenario-1.png      # Screenshot after successful scenario
├── PASS-scenario-2.png
├── interaction-log.md       # Actions taken, outcomes observed
├── console-errors.txt       # Any console errors (should be empty)
└── report.md                # Summary: scenarios passed/failed, edge cases found
```

---

## PROMETHEUS INTEGRATION: ACCEPTANCE SCENARIO FORMAT

When Prometheus creates task plans, each task MUST include **Acceptance Scenarios** that define what "working" means for agentic testing.

### Task Definition Format

```markdown
## Task: [Task Title]

### Implementation Requirements
- [Technical requirement 1]
- [Technical requirement 2]

### Acceptance Scenarios

**Scenario 1: [Name]**
```gherkin
GIVEN [precondition - initial state]
AND [additional precondition if needed]
WHEN [user action via UI]
AND [additional action if needed]
THEN [expected outcome - what user sees]
AND [additional expectation if needed]
```

**Scenario 2: [Name]**
```gherkin
GIVEN ...
WHEN ...
THEN ...
```

### Edge Cases to Explore
- [Edge case 1 - what happens if...?]
- [Edge case 2 - what happens if...?]
- [Error condition - how should it fail gracefully?]

### Done When
- [ ] All acceptance scenarios pass via agentic testing
- [ ] No console errors during any scenario
- [ ] Edge cases documented with observed behavior
- [ ] Evidence saved to .sisyphus/evidence/{task-id}/
```

### Example: Real-Time Graph Sync Task

```markdown
## Task: Implement Real-Time Graph Sync

### Implementation Requirements
- User A creates a node, User B sees it within 500ms
- Node positions sync when dragged
- Nodes persist after all users disconnect

### Acceptance Scenarios

**Scenario 1: Basic Node Creation Sync**
```gherkin
GIVEN User A is on /graph in Browser Context 1
AND User B is on /graph in Browser Context 2
AND both contexts show empty graph (0 nodes)
WHEN User A clicks "Add Node" button
THEN User B sees a new node appear within 500ms
AND the node has the same ID in both contexts
AND the node has correct styling (not broken/missing)
```

**Scenario 2: Node Drag Sync**
```gherkin
GIVEN User A and User B are viewing a graph with 1 node
AND the node is at position (100, 100)
WHEN User A drags the node to position (300, 200)
THEN User B sees the node move to approximately (300, 200)
AND the movement is smooth (no teleporting)
```

**Scenario 3: Persistence After Disconnect**
```gherkin
GIVEN User A creates 3 nodes on /graph
WHEN User A closes their browser
AND User A reopens /graph in a new session
THEN all 3 nodes are still visible
AND node positions are preserved
```

### Edge Cases to Explore
- What happens if WebSocket disconnects mid-drag?
- What if both users drag the same node simultaneously?
- What if a user deletes a node another user is dragging?
- What happens with 100 nodes? (performance)

### Done When
- [ ] All 3 acceptance scenarios pass via agentic testing
- [ ] No console errors during any scenario
- [ ] Edge case behaviors documented
- [ ] Evidence saved to .sisyphus/evidence/graph-sync/
```

---

## TASK TYPE VERIFICATION PROTOCOLS

### Frontend (UI) Tasks

See `apps/web/AGENTS.md` for detailed protocol.

**Quick Reference:**
1. L1-L3 gates pass
2. Navigate to affected route via Playwright MCP
3. Check console for errors
4. Execute all acceptance scenarios
5. Take screenshots as evidence
6. Verify visual correctness via `look_at` analysis

### Backend (API) Tasks

See `apps/server/AGENTS.md` for detailed protocol.

**Quick Reference:**
1. L1-L3 gates pass
2. Start server if not running
3. Test happy path via curl/fetch
4. Test error cases (400, 401, 404, 500)
5. Test from frontend context (integration)
6. Document response schemas

### CRDT/Sync Tasks

**Quick Reference:**
1. L1-L3 gates pass (unit tests verify CRDT logic)
2. E2E sync tests pass
3. **Agentic multi-context testing:**
   - Open two browser contexts
   - Perform action in Context A
   - Verify sync in Context B within latency budget (500ms)
   - Test conflict scenarios
   - Test offline/reconnect

### Full-Stack Features

**Quick Reference:**
1. L1-L3 gates pass
2. All component tests pass
3. **Agentic end-to-end flow:**
   - Start from user perspective
   - Execute complete user journey
   - Verify data flows through all services
   - Check database state if needed
   - Test error handling at each layer

### RAG/AI Tasks

See `apps/rag-service/AGENTS.md` for detailed protocol.

**Quick Reference:**
1. Python tests pass
2. API endpoints respond correctly
3. **Agentic testing:**
   - Send queries via chat UI
   - Verify responses are scoped correctly
   - Test permission boundaries
   - Verify streaming works

### Foundry Integration Tasks

See `packages/foundry-module/AGENTS.md` for detailed protocol.

**Quick Reference:**
1. L1-L2 gates pass
2. **Manual testing required** (Foundry VTT must be running)
3. Verify bidirectional sync
4. Test conflict resolution
5. Document with screenshots

---

## DEV SERVER MANAGEMENT

**ALWAYS check server status before any browser-based verification.**

### Service Architecture

| Service | Command | Port | Purpose |
|---------|---------|------|---------|
| **Next.js** | `pnpm dev --filter web` | 3000 | Frontend UI |
| **Hocuspocus** | `pnpm dev --filter server` | 3001 | WebSocket sync |
| **Fastify** | `pnpm dev --filter server` | 3002 | REST API |
| **RAG Service** | `cd apps/rag-service && uvicorn main:app --reload` | 8000 | Python RAG |
| **PostgreSQL** | `docker compose up -d` | 5432 | Database |

### Detect Server State

```bash
WEB_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
HOCUSPOCUS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null)
FASTIFY_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health 2>/dev/null)
RAG_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null)

echo "Web (3000): $WEB_HTTP"
echo "Hocuspocus (3001): $HOCUSPOCUS_HTTP"
echo "Fastify (3002): $FASTIFY_HTTP"
echo "RAG (8000): $RAG_HTTP"
```

### Required Services by Task Type

| Task Type | Required Services |
|-----------|------------------|
| UI-only testing | Web (3000) |
| Real-time sync testing | Web (3000) + Server (3001, 3002) + Postgres |
| RAG/Chat testing | Web (3000) + Server (3002) + RAG (8000) |
| Full E2E testing | All services |

### Start Services

```bash
# Start PostgreSQL first (required for server)
docker compose up -d

# Start ALL services via Turbo (recommended)
pnpm dev &
echo "turbo:$!" > /tmp/dev-server.info

# Wait for services to be ready
for i in {1..30}; do
  curl -s http://localhost:3000 > /dev/null && break
  sleep 1
done
```

### Stop Services After Testing

```bash
# Only stop if WE started them
if [ -f /tmp/dev-server.info ]; then
  SERVER_INFO=$(cat /tmp/dev-server.info)
  SERVER_PID=$(echo $SERVER_INFO | cut -d: -f2)
  kill $SERVER_PID 2>/dev/null
  rm /tmp/dev-server.info
  echo "Stopped server (PID: $SERVER_PID)"
else
  echo "Server was user-started, leaving it running"
fi
```

### Auto-Management Rule

```
┌─────────────────────────────────────────────────────────────────┐
│  IF agent started the server → agent MUST stop it when done    │
│  IF user started the server → agent must NOT stop it           │
│  DETECTION: /tmp/dev-server.info exists = agent started it     │
└─────────────────────────────────────────────────────────────────┘
```

---

## MULTI-USER SYNC TESTING PROTOCOL

PlaneShift is a **real-time collaborative** application. Multi-user sync verification is critical.

### Two-Context Testing Pattern

```python
# 1. Create two isolated browser contexts
context_a = browser.new_context()  # User A (Actor)
context_b = browser.new_context()  # User B (Observer)

page_a = context_a.new_page()
page_b = context_b.new_page()

# 2. Clear IndexedDB to ensure clean state
await page_a.evaluate("indexedDB.deleteDatabase('planeshift-graph')")

# 3. Navigate both to same view
await page_a.goto("/graph")
await page_b.goto("/graph")

# 4. Wait for WebSocket sync establishment
await page_a.wait_for_timeout(3000)

# 5. Count initial state
initial_nodes_b = await page_b.locator(".react-flow__node").count()

# 6. Perform action in Context A
await page_a.click("button:has-text('Add Node')")

# 7. Verify sync in Context B within latency budget
start_time = time.now()
await page_b.wait_for_function(
    f"document.querySelectorAll('.react-flow__node').length > {initial_nodes_b}",
    timeout=500  # 500ms latency requirement
)
sync_latency = time.now() - start_time

# 8. Assert latency requirement
assert sync_latency < 500, f"Sync took {sync_latency}ms, exceeds 500ms budget"

# 9. Screenshot both contexts as evidence
await page_a.screenshot(path=".sisyphus/evidence/sync-actor.png")
await page_b.screenshot(path=".sisyphus/evidence/sync-observer.png")

# 10. Clean up
await context_a.close()
await context_b.close()
```

### Sync Scenarios to Test

| Scenario | Actor Action | Observer Expectation | Latency |
|----------|--------------|---------------------|---------|
| Node creation | Click "Add Node" | Node appears | <500ms |
| Node drag | Drag node to new position | Node moves | <500ms |
| Node deletion | Right-click → Delete | Node disappears | <500ms |
| Table edit | Edit faction name | Name updates | <500ms |
| Presence cursor | Move mouse | Cursor indicator moves | <200ms |

---

## ATLAS INTEGRATION: ORCHESTRATION RULES

When Atlas orchestrates tasks, it MUST follow this verification protocol:

### After Each Delegation

1. **Run L1-L3 gates** (static, unit, E2E)
2. **If task has acceptance scenarios**: Run agentic testing
3. **Capture evidence** for all verification steps
4. **On FAIL**: Resume subagent session with specific error
5. **On PASS**: Mark task complete with evidence path

### Never Trust Claims

Subagents frequently claim "done" when:
- Tests are not actually passing
- Visual bugs exist
- Integration is broken
- Edge cases cause errors

**Atlas MUST verify independently using its own tool calls.**

### Verification Checklist (Atlas)

```
[ ] pnpm typecheck → Exit 0
[ ] pnpm test → All pass
[ ] pnpm build → Exit 0
[ ] (If UI) Console errors → None
[ ] (If UI) Visual Gate → PASS
[ ] (If sync) Multi-context test → Sync works
[ ] (If API) Endpoint responds → Correct status/body
[ ] Acceptance scenarios → All pass
[ ] Evidence saved → .sisyphus/evidence/{task-id}/
```

---

## QUICK REFERENCE

```
┌─────────────────────────────────────────────────────────────────┐
│  TASK COMPLETION FLOW (NON-NEGOTIABLE)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Implementation complete                                     │
│                                                                 │
│  2. LEVEL 1: Static gates                                       │
│     pnpm typecheck → exit 0                                     │
│     pnpm build → exit 0                                         │
│                                                                 │
│  3. LEVEL 2: Unit/Integration tests                             │
│     pnpm test → all pass                                        │
│                                                                 │
│  4. LEVEL 3: E2E tests (if applicable)                          │
│     pnpm e2e → all pass                                         │
│                                                                 │
│  5. LEVEL 4: Agentic testing (for complex features)             │
│     Execute acceptance scenarios via Playwright MCP             │
│     Verify all THEN expectations                                │
│     Explore edge cases                                          │
│     Save evidence to .sisyphus/evidence/                        │
│                                                                 │
│  6. ONLY THEN: Mark task complete                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  FAIL at any level → Fix → Re-verify (loop until all PASS)      │
└─────────────────────────────────────────────────────────────────┘
```

### Service Ports

| Service | Port |
|---------|------|
| Web (Next.js) | 3000 |
| Hocuspocus | 3001 |
| Fastify API | 3002 |
| RAG Service | 8000 |
| PostgreSQL | 5432 |

### Key Files

| Purpose | Location |
|---------|----------|
| CRDT helpers | `apps/web/lib/yjs-helpers.ts` |
| Sync provider | `apps/web/lib/sync.ts` |
| WebSocket server | `apps/server/src/ws/hocuspocus.ts` |
| DB schema | `apps/server/src/db/schema.ts` |
| Shared types | `packages/shared/src/types/` |

### NOTES

- **Yjs behavior**: Y.Map must be attached to Y.Doc before read/write operations.
- **Package managers**: Use pnpm, NOT npm or yarn.
- **Hot reloading**: Turbo handles cross-package rebuilds.
- **Docker**: Must run `docker compose up -d` before server tests.
- **Evidence**: All verification evidence goes to `.sisyphus/evidence/`.
