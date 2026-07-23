# Multi-User Sync Testing Protocol

Highport is a **real-time collaborative** application. Multi-user sync verification is critical.

## Two-Context Testing Pattern

```python
# 1. Create two isolated browser contexts
context_a = browser.new_context()  # User A (Actor)
context_b = browser.new_context()  # User B (Observer)

page_a = context_a.new_page()
page_b = context_b.new_page()

# 2. Clear IndexedDB to ensure clean state
await page_a.evaluate("indexedDB.deleteDatabase('highport-graph')")

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

## Sync Scenarios to Test

| Scenario        | Actor Action              | Observer Expectation   | Latency |
| --------------- | ------------------------- | ---------------------- | ------- |
| Node creation   | Click "Add Node"          | Node appears           | <500ms  |
| Node drag       | Drag node to new position | Node moves             | <500ms  |
| Node deletion   | Right-click → Delete      | Node disappears        | <500ms  |
| Table edit      | Edit faction name         | Name updates           | <500ms  |
| Presence cursor | Move mouse                | Cursor indicator moves | <200ms  |
