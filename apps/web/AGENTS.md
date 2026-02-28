# WEB (Next.js 14)

## OVERVIEW
Frontend for Highport. Uses App Router, Yjs for CRDT state, React Flow for graph visualization.
Implements a Local-First architecture using `y-indexeddb` for offline persistence.

## COMPONENT ARCHITECTURE

### Directory Structure
- `app/` - Next.js App Router pages
  - `(campaign)/graph/` - Main interactive graph view
  - `(campaign)/factions/` - Reputation tables
- `components/`
  - `graph/`
    - `GraphCanvas.tsx` - Main React Flow wrapper
    - `CustomNode.tsx` - Entity node renderer
    - `Toolbar.tsx` - Node creation controls
  - `table/`
    - `ReputationTable.tsx` - TanStack Table wrapper
    - `CellEditors.tsx` - Live-sync inputs
  - `ui/` - Shadcn/UI primitives (Button, Dialog, Toast, etc.)
  - `layout/` - Application shell, navigation, user menu

### Key Concepts
- **Graph Components**: Handle canvas interactions and bridge React Flow events to Yjs operations.
- **Table Components**: Render Y.Array data as sortable/filterable tables with real-time cell editing.
- **Layout**: Manages the `HocuspocusProvider` context and connection status.

## KEY MODULES
| File | Role |
|------|------|
| `lib/ydoc.ts` | Creates global Y.Doc, defines shared types (nodes, edges) |
| `lib/yjs-helpers.ts` | Converts between TypeScript types and Y.Map (Bi-directional) |
| `lib/sync.ts` | Singleton provider setup, connection management, IndexedDB |
| `lib/awareness.ts` | Helpers for user presence, cursors, and selection states |
| `lib/hooks/use-yjs.ts` | Custom hooks for subscribing to Yjs data changes |

## YJS PATTERNS

### Critical Rules
1. **Map Attachment**: A `Y.Map` MUST be attached to the `Y.Doc` (or a parent attached type) BEFORE you can read/write to it safely.
   - *Bad*: `const map = new Y.Map(); map.set('x', 1); doc.getMap('root').set('m', map);`
   - *Good*: `const map = doc.getMap('root').set('m', new Y.Map()); map.set('x', 1);`

2. **Transactions**: Always bundle multiple operations into a single transaction to ensure atomicity and reduce update events.
   ```typescript
   doc.transact(() => {
     nodeMap.set('x', 100);
     nodeMap.set('y', 200);
   }, 'user-interaction'); // Origin helps filter local updates
   ```

3. **Observer Pattern**: React components must subscribe to Yjs events to trigger re-renders.
   - Use `yMap.observe(e => ...)` inside `useEffect`.
   - Prefer provided hooks like `useMap` or `useArray` where available.

4. **Awareness**:
   - `provider.awareness.setLocalStateField('user', { name: 'Alice', color: '#ff0000' })`
   - Used for showing "Who is here" and remote cursors.

## REACT FLOW PATTERNS

- **State Sync**: We do NOT use React Flow's internal state as the source of truth.
  - `nodes` prop is derived from `yDoc.getMap('nodes')`.
  - `onNodesChange` callback updates the Yjs map, NOT local state.
- **Node Handling**:
  - Creation: `yMap.set(id, { ...data })`
  - Deletion: `yMap.delete(id)` (triggers generic removal)
- **Viewport Management**:
  - Viewport state is local by default.
  - "Follow User" mode syncs viewport coordinates via Awareness.

## UI VERIFICATION PROTOCOL

After any frontend changes:

### Level 1: Static Gates
- `pnpm --filter web typecheck` → exit 0
- `pnpm --filter web build` → exit 0

### Level 2: Unit Tests
- `pnpm --filter web test` → all pass
- Component tests in `__tests__/` verifying rendering and basic logic.

### Level 3: E2E Tests
- `pnpm e2e` for affected routes
- Key tests:
  - `graph.spec.ts`: Node CRUD, dragging, selection
  - `table.spec.ts`: Cell editing, sorting
  - `sync.spec.ts`: Multi-user consistency

### Level 4: Agentic Visual Testing
1. Start dev server if not running (`pnpm dev`)
2. Navigate to affected route via Playwright MCP
3. Check console for errors: `page.on('console', ...)` should be silent
4. Execute acceptance scenarios defined in the task
5. Take screenshots as evidence of success/failure
6. Verify visual correctness via `look_at` analysis

## VISUAL GATE EXECUTION

- **Tooling**: Use the `/playwright` skill or `skill_mcp` with `playwright`.
- **Evidence Requirements**:
  - Screenshot of the initial state.
  - Screenshot of the action (e.g., modal open).
  - Screenshot of the result.
  - Save to `.sisyphus/evidence/{task_id}/`.
- **Multi-Context Testing**:
  - Open Browser A (Actor) and Browser B (Observer).
  - Perform action in A.
  - Verify update in B without reload.
  - Essential for verifying Real-Time Sync.

## E2E TEST PATTERNS

- **Isolation**:
  - Tests must start with a clean slate.
  - Use `await page.evaluate(() => indexedDB.deleteDatabase('highport-doc'))`.
- **Sync Waiting**:
  - Do NOT use fixed sleeps (`waitForTimeout`).
  - Use `expect(locator).toBeVisible()` or `waitForFunction` checking the DOM.
- **Multi-User Simulation**:
  ```typescript
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  // ... perform simultaneous actions
  ```

## ANTI-PATTERNS

- **Modifying Y.Map before attachment**: Causes silent failures or data loss.
- **Missing `transact`**: Causes individual updates, spamming the network and history stack.
- **Direct DOM Manipulation**: Bypassing React/React Flow state causes de-sync.
- **Ignoring Build Errors**: Typescript errors in `pnpm build` often indicate real bugs not caught in dev.
- **Hardcoding IDs**: Always use UUIDs/Nanoids for entity creation.
