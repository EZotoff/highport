
## Task 7 - Base Resources Table
- **Yjs List Pattern**: For a list of objects (resources) where each object has properties that change, using `observeDeep` on the parent map and rebuilding the local state array on change is a robust pattern. It handles additions, removals, and property updates in one go.
- **TanStack Table + Yjs**: `useReactTable` works seamlessly with local state derived from Yjs. FlexRender makes it easy to add custom editable cells.
- **Layout Composition**: Hardcoded `100vw`/`100vh` in components (like `GraphCanvas`) requires care when embedding them into larger layouts. Wrapping in a relative container or using absolute positioning can mitigate this without modifying the original component if strict constraints apply.
