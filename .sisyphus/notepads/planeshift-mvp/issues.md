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

## E2E Test Flakiness (2026-01-27)

**Issue:**
E2E tests are flaky, with varying numbers of failures between runs (11-22 failing).

**Root Causes Identified:**

1. **Hocuspocus Not Starting**: Fixed by adding `await hocuspocus.listen()` in `apps/server/src/ws/hocuspocus.ts`

2. **Missing /chat Page**: Fixed by creating `apps/web/app/chat/page.tsx`

3. **Playwright Global Setup**: Added `apps/web/e2e/global-setup.ts` to wait for port 3001

4. **Multi-user Sync in E2E**: Tests involving two browser contexts and Yjs sync are still flaky due to:
   - Race conditions in WebSocket connection establishment
   - IndexedDB persistence timing
   - Document name conflicts between test runs

**Workarounds:**

- Unit tests verify sync logic at the component level (135 tests passing)
- Build/typecheck verify type safety
- E2E tests for single-user flows work reliably

**Recommendation:**

- Add test isolation by using unique document names per test
- Increase wait times for sync operations
- Consider using Playwright fixtures for shared Yjs state
