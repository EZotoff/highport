## Feature Tests F1-F6 (2025-01-27)

### Execution Insights

**Graph Node Operations**

- React Flow nodes use SVG elements for rendering and interaction
- Node state tracking via DOM [active] attribute works correctly
- Context menu appears on right-click with proper event handling
- Drag operations detected via React Flow warnings (expected behavior)
- Node deletion is atomic - DOM updates immediately reflect removal

**Table Operations**

- Faction rows use textbox inputs for editable cells
- blur() event triggers save (no explicit save button needed)
- Row addition uses "Add Faction" button with immediate DOM insertion
- New rows get default values ("New Faction") and are immediately editable
- Spinner buttons for numeric fields work via spinbutton role

**Playwright MCP Observations**

- `browser_snapshot` provides accurate accessibility tree for element location
- `browser_run_code` is best for complex interactions (drag, mouse movements)
- Refs from snapshots are reliable across page state changes
- Use `first()` locator for SVG elements when needed
- Mouse drag requires explicit steps parameter for smooth motion

**Testing Patterns**

- Clean state: Reload page to clear IndexedDB
- Selection: Check for [active] attribute in DOM
- Deletion: Count elements before/after
- Drag: Use browser_run_code with mouse.move/down/up sequence
- Edit: Use fill() not type() for faster input
- Add Row: Verify row count increase and element presence

### Known Behaviors

1. React Flow drag warnings are expected and non-blocking
2. Node creation always uses "New Faction" + "New node" as default labels
3. Table edits are immediate (no separate save step needed)
4. Consensus on latency: React Flow interactions are snappy (<100ms)

### Next Steps

- [ ] Multi-user sync tests (two contexts, verify <500ms latency)
- [ ] Persistence tests (reload page, verify data survives)
- [ ] Edge cases (simultaneous edits, delete while dragging)
