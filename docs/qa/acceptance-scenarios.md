# Acceptance Scenario Format

Each task MUST include **Acceptance Scenarios** that define what "working" means for agentic testing.

## Task Definition Format

````markdown
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
````

## Example: Real-Time Graph Sync Task

````markdown
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
````
