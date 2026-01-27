# Issues - PlaneShift MVP

> Problems and gotchas encountered


## `/graph` Page Build Error (2026-01-27)

**Error:**
```
useSearchParams() should be wrapped in a suspense boundary at page "/graph"
```

**Location:** `apps/web/components/graph/GraphCanvas.tsx` line 51

**Impact:** 
- E2E tests fail because the page won't render
- Static generation fails during build

**Solution:**
Wrap the `GraphCanvasContent` component in a Suspense boundary or move `useSearchParams()` to a separate client component that's wrapped in Suspense.

Example fix:
```typescript
// In page.tsx
<Suspense fallback={<div>Loading...</div>}>
  <GraphCanvas />
</Suspense>
```

Or refactor `GraphCanvas.tsx` to isolate the useSearchParams call.

