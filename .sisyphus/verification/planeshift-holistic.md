# PlaneShift Holistic Verification Plan

> **Generated**: 2026-01-27
> **Scope**: Full application verification
> **Trigger**: Manual / Release candidate

---

## Prerequisites

- [ ] PostgreSQL running: `docker compose up -d`
- [ ] Dev servers running: `pnpm dev` (Web:3000, Hocuspocus:3001, Fastify:3002)
- [ ] Static gates pass:
  - [ ] `pnpm typecheck` → exit 0
  - [ ] `pnpm build` → exit 0
- [ ] Unit tests pass: `pnpm test` → all green
- [ ] E2E tests pass: `pnpm e2e` → all green (21 expected, 7 skipped)

---

## Smoke Tests (Critical)

### Scenario S1: Application Loads

**Priority**: Critical
**Component**: Core
**Multi-User**: No

```gherkin
GIVEN a fresh browser session
WHEN user navigates to http://localhost:3000
THEN the application loads without errors
AND the main navigation is visible
AND no console errors appear
```

**Verification Steps**:

1. Navigate to http://localhost:3000
2. Wait for page to fully load
3. Check console for errors
4. Verify navigation elements visible

**Evidence**: `smoke-01-app-loads.png`

---

### Scenario S2: Graph Page Renders

**Priority**: Critical
**Component**: Graph
**Multi-User**: No

```gherkin
GIVEN user is on the home page
WHEN user navigates to /graph
THEN the React Flow canvas renders
AND the controls panel is visible
AND the "Add Node" button is visible
AND no console errors appear
```

**Verification Steps**:

1. Navigate to /graph
2. Wait for `.react-flow` selector
3. Verify `.react-flow__controls` visible
4. Verify "Add Node" button visible

**Evidence**: `smoke-02-graph-renders.png`

---

### Scenario S3: Table Page Renders

**Priority**: Critical
**Component**: Table
**Multi-User**: No

```gherkin
GIVEN user is on the home page
WHEN user navigates to /reputation (or /factions)
THEN the reputation table renders
AND table headers are visible
AND no console errors appear
```

**Verification Steps**:

1. Navigate to /reputation
2. Wait for `table` selector
3. Verify headers visible

**Evidence**: `smoke-03-table-renders.png`

---

## Feature Tests (High Priority)

### Scenario F1: Create Graph Node

**Priority**: High
**Component**: Graph
**Multi-User**: No

```gherkin
GIVEN user is on /graph with empty canvas
WHEN user clicks "Add Node" button
THEN a new node appears on the canvas
AND the node count increases by 1
AND no console errors appear
```

**Verification Steps**:

1. Navigate to /graph
2. Clear IndexedDB: `indexedDB.deleteDatabase('planeshift-graph')`
3. Reload page
4. Count initial nodes
5. Click "Add Node"
6. Verify node count increased

**Evidence**: `feature-01-create-node.png`

---

### Scenario F2: Select Graph Node

**Priority**: High
**Component**: Graph
**Multi-User**: No

```gherkin
GIVEN a graph with at least one node
WHEN user clicks on a node
THEN the node shows selected state (visual indicator)
AND the node has 'selected' class
```

**Verification Steps**:

1. Ensure at least one node exists
2. Click on the node
3. Verify selected class applied

**Evidence**: `feature-02-select-node.png`

---

### Scenario F3: Delete Graph Node

**Priority**: High
**Component**: Graph
**Multi-User**: No

```gherkin
GIVEN a graph with at least one node
WHEN user right-clicks on a node
AND selects "Delete" from context menu
THEN the node is removed from canvas
AND the node count decreases by 1
```

**Verification Steps**:

1. Ensure at least one node exists
2. Right-click on node
3. Click "Delete" in context menu
4. Verify node removed

**Evidence**: `feature-03-delete-node.png`

---

### Scenario F4: Drag Graph Node

**Priority**: High
**Component**: Graph
**Multi-User**: No

```gherkin
GIVEN a graph with at least one node at position (X1, Y1)
WHEN user drags the node to position (X2, Y2)
THEN the node moves to the new position
AND the position change persists
```

**Verification Steps**:

1. Get initial node position
2. Drag node to new location
3. Verify position changed
4. Reload and verify position persisted

**Evidence**: `feature-04-drag-node.png`

---

### Scenario F5: Edit Table Cell

**Priority**: High
**Component**: Table
**Multi-User**: No

```gherkin
GIVEN user is on /reputation with at least one faction
WHEN user clicks on a faction name cell
AND types a new name
AND blurs the input
THEN the new name is saved
AND the change persists after reload
```

**Verification Steps**:

1. Navigate to /reputation
2. Click on faction name cell
3. Type new value
4. Blur input
5. Reload and verify value persisted

**Evidence**: `feature-05-edit-cell.png`

---

### Scenario F6: Add Table Row

**Priority**: High
**Component**: Table
**Multi-User**: No

```gherkin
GIVEN user is on /reputation
WHEN user clicks "Add Faction" button
THEN a new row appears in the table
AND the row is editable
```

**Verification Steps**:

1. Count initial rows
2. Click "Add Faction"
3. Verify row count increased
4. Verify new row is editable

**Evidence**: `feature-06-add-row.png`

---

## Persistence Tests (High Priority)

### Scenario P1: Graph Persists After Reload

**Priority**: High
**Component**: Graph
**Multi-User**: No

```gherkin
GIVEN user has created 3 nodes on /graph
WHEN user refreshes the page (F5)
THEN all 3 nodes are still visible
AND node positions are preserved
AND no data is lost
```

**Verification Steps**:

1. Create 3 nodes with distinct positions
2. Note node IDs and positions
3. Reload page
4. Verify all nodes present with same positions

**Evidence**: `persist-01-graph-reload.png`

---

### Scenario P2: Graph Persists After Browser Close

**Priority**: High
**Component**: Graph
**Multi-User**: No

```gherkin
GIVEN user has created nodes on /graph
WHEN user closes browser context
AND opens a new browser context
AND navigates to /graph
THEN all nodes are still visible (from server sync)
```

**Verification Steps**:

1. Create nodes in Context A
2. Close Context A
3. Open new Context B
4. Navigate to /graph
5. Verify nodes present

**Evidence**: `persist-02-graph-new-session.png`

---

### Scenario P3: Table Persists After Reload

**Priority**: High
**Component**: Table
**Multi-User**: No

```gherkin
GIVEN user has edited faction data
WHEN user refreshes the page
THEN all faction data is preserved
```

**Verification Steps**:

1. Edit faction data
2. Reload page
3. Verify data unchanged

**Evidence**: `persist-03-table-reload.png`

---

## Multi-User Sync Tests (Critical)

### Scenario M1: Node Creation Syncs

**Priority**: Critical
**Component**: Sync
**Multi-User**: Yes

```gherkin
GIVEN User A is on /graph in Browser Context 1
AND User B is on /graph in Browser Context 2
AND both contexts show the same initial state
WHEN User A clicks "Add Node"
THEN User B sees the new node appear within 500ms
AND the node has the same ID in both contexts
```

**Verification Steps**:

1. Open Context A, navigate to /graph
2. Open Context B, navigate to /graph
3. Wait 3s for WebSocket sync
4. Count nodes in Context B
5. User A: Click "Add Node"
6. User B: Wait for node count to increase
7. Measure sync latency
8. Verify latency < 500ms

**Evidence**: `sync-01-node-creation-A.png`, `sync-01-node-creation-B.png`

---

### Scenario M2: Node Drag Syncs

**Priority**: Critical
**Component**: Sync
**Multi-User**: Yes

```gherkin
GIVEN User A and User B are viewing a graph with 1 node
AND the node is at position (100, 100)
WHEN User A drags the node to position (300, 200)
THEN User B sees the node move to approximately (300, 200)
AND the movement appears within 500ms
```

**Verification Steps**:

1. Setup: Both contexts viewing same node
2. Get initial position in Context B
3. User A: Drag node
4. User B: Wait for position change
5. Measure sync latency

**Evidence**: `sync-02-node-drag-A.png`, `sync-02-node-drag-B.png`

---

### Scenario M3: Node Deletion Syncs

**Priority**: Critical
**Component**: Sync
**Multi-User**: Yes

```gherkin
GIVEN User A and User B are viewing a graph with nodes
WHEN User A deletes a node
THEN User B sees the node disappear within 500ms
```

**Verification Steps**:

1. Ensure both contexts see the same nodes
2. User A: Delete node via context menu
3. User B: Verify node disappears

**Evidence**: `sync-03-node-delete-B.png`

---

### Scenario M4: Conflict Resolution

**Priority**: High
**Component**: Sync
**Multi-User**: Yes

```gherkin
GIVEN User A and User B are viewing the same node
WHEN User A drags the node left
AND User B simultaneously drags the node right
THEN both operations are applied (CRDT merge)
AND both users eventually see the same final position
AND no data is lost
```

**Verification Steps**:

1. Both users select same node
2. Simultaneously drag in different directions
3. Wait for sync to settle
4. Compare final positions in both contexts
5. Verify positions match

**Evidence**: `sync-04-conflict-resolution.png`

---

## Integration Tests (High Priority)

### Scenario I1: Full User Journey - Graph

**Priority**: High
**Component**: Integration
**Multi-User**: No

```gherkin
GIVEN a fresh application state
WHEN user performs a complete workflow:
  1. Navigate to /graph
  2. Create 3 nodes
  3. Position them in a triangle
  4. Select each node
  5. Delete one node
  6. Reload page
THEN the remaining 2 nodes persist
AND all operations complete without errors
```

**Evidence**: `integration-01-graph-journey.png`

---

### Scenario I2: Navigation Flow

**Priority**: Medium
**Component**: Integration
**Multi-User**: No

```gherkin
GIVEN user is on /graph
WHEN user navigates: Graph → Reputation → Resources → Home → Graph
THEN all pages load correctly
AND no console errors occur
AND state is preserved on return to /graph
```

**Evidence**: `integration-02-navigation.png`

---

## Error Handling Tests (Medium Priority)

### Scenario E1: Offline Resilience

**Priority**: Medium
**Component**: Sync
**Multi-User**: No

```gherkin
GIVEN user is on /graph with active sync
WHEN network connection is interrupted (simulate offline)
AND user creates a new node
AND network connection is restored
THEN the node syncs to server once online
AND no data is lost
```

**Verification Steps**:

1. Navigate to /graph, verify sync active
2. Disable network (context.setOffline(true))
3. Create node (should work locally)
4. Enable network
5. Verify node synced to server

**Evidence**: `error-01-offline-resilience.png`

---

### Scenario E2: WebSocket Reconnection

**Priority**: Medium
**Component**: Sync
**Multi-User**: No

```gherkin
GIVEN user is on /graph with active WebSocket
WHEN WebSocket connection drops
THEN the application shows disconnected state
AND when connection restores, sync resumes
AND no data is lost
```

**Evidence**: `error-02-reconnection.png`

---

## Exploratory Testing

### Exploration Goals

- [ ] Find edge cases not covered by structured tests
- [ ] Discover visual/UX issues
- [ ] Test unexpected user flows
- [ ] Stress test with unusual inputs
- [ ] Find race conditions in sync

### Exploration Prompts

1. **Rapid Actions**: "Click 'Add Node' 20 times rapidly - does it handle the burst?"
2. **Large Graph**: "Create 50-100 nodes - how's the performance?"
3. **Invalid Inputs**: "Try special characters, emoji, very long strings in text fields"
4. **Concurrent Edits**: "With two users, both edit the same field simultaneously"
5. **Navigation Stress**: "Rapidly switch between pages while sync is active"
6. **Browser Extremes**: "Zoom in/out, resize window, use mobile viewport"
7. **Undo Expectations**: "Try Ctrl+Z - is there undo support? If not, is that clear?"
8. **Empty States**: "Delete all nodes - is the empty state handled gracefully?"
9. **Network Throttling**: "Use slow 3G network - does the app remain usable?"
10. **Console Hunting**: "Just use the app normally and watch for any console warnings"

### Exploration Time Budget

- **Minimum**: 15 minutes of free exploration
- **Focus Areas**:
  - Graph interactions (most complex)
  - Multi-user sync (most fragile)
  - Edge node counts (performance)

### Exploration Evidence

- Document ALL unexpected behaviors in `exploration-log.md`
- Screenshot anything that looks wrong
- Record console errors
- Note performance issues with approximate timings

---

## Evidence Directory Structure

```
.sisyphus/evidence/planeshift-holistic/
├── prerequisites/
│   ├── typecheck-output.txt
│   ├── test-output.txt
│   └── e2e-output.txt
├── smoke/
│   ├── smoke-01-app-loads.png
│   ├── smoke-02-graph-renders.png
│   └── smoke-03-table-renders.png
├── feature/
│   ├── feature-01-create-node.png
│   ├── feature-02-select-node.png
│   ├── feature-03-delete-node.png
│   ├── feature-04-drag-node.png
│   ├── feature-05-edit-cell.png
│   └── feature-06-add-row.png
├── persist/
│   ├── persist-01-graph-reload.png
│   ├── persist-02-graph-new-session.png
│   └── persist-03-table-reload.png
├── sync/
│   ├── sync-01-node-creation-A.png
│   ├── sync-01-node-creation-B.png
│   ├── sync-02-node-drag-A.png
│   ├── sync-02-node-drag-B.png
│   ├── sync-03-node-delete-B.png
│   ├── sync-04-conflict-resolution.png
│   └── sync-latency-measurements.json
├── integration/
│   ├── integration-01-graph-journey.png
│   └── integration-02-navigation.png
├── error/
│   ├── error-01-offline-resilience.png
│   └── error-02-reconnection.png
├── exploratory/
│   ├── exploration-log.md
│   └── finding-*.png
├── console-errors.txt
└── REPORT.md
```

---

## Success Criteria

| Category              | Required   | Notes                       |
| --------------------- | ---------- | --------------------------- |
| Smoke Tests           | 100% pass  | Blocking                    |
| Feature Tests         | 100% pass  | Blocking                    |
| Persistence Tests     | 100% pass  | Blocking                    |
| Multi-User Sync Tests | 75% pass   | M4 (conflict) may be flaky  |
| Integration Tests     | 100% pass  | Blocking                    |
| Error Handling        | 50% pass   | Nice-to-have                |
| Exploratory           | Documented | No new Critical/High issues |

**Overall PASS requires**: All blocking categories green + no Critical issues from exploration.
