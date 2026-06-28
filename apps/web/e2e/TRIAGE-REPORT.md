# E2E Test Triage Report — fixme/skip Tests

Generated: 2026-06-26
Task: Tier A Completion — Task 3: Triage Stale e2e fixme/skip Tests

## Disposition Legend

| Disposition         | Meaning                                            |
| ------------------- | -------------------------------------------------- |
| RESTORE             | Remove fixme/skip, test passes as-is               |
| DOCUMENT / REMOVE   | Test is obsolete, remove or replace                |
| KEEP-WITH-RATIONALE | Genuinely blocked; keep mark with improved comment |

---

## Specified Files (5 files, 11 tests)

### `apps/web/e2e/chargen-multiplayer.spec.ts`

| #   | Line | Test Title                              | Disposition         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ---- | --------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 62   | entity creation syncs between two users | KEEP-WITH-RATIONALE | Requires Hocuspocus server + DB running. The `browser` fixture creates two isolated contexts that join the same Yjs room — correct in theory, but Playwright's built-in `webServer` only launches the Next.js app (port 18120), not the Hocuspocus sync server (port 18121) or PostgreSQL. This test validates core CRDT sync and should be restored when `webServer` covers the full stack or when a separate test-infra script starts all services.                                                         |
| 2   | 115  | participant join request syncs to GM    | KEEP-WITH-RATIONALE | Same infrastructure dependency as #1. Also requires the chargen session/room join UI to be fully functional with two-client interaction. The "Request to Join" button may have different labels in the current build. Restore requires full-stack infra + verified UI selectors.                                                                                                                                                                                                                              |
| 3   | 159  | entities persist after page reload      | KEEP-WITH-RATIONALE | Entity spawning in MGT2E chargen happens through career event resolution (dice-driven), not via a direct UI button. The test body currently only verifies the entity pool panel renders — it does not actually test persistence. A proper test would need to complete one or more career terms that trigger entity-spawning events, then verify the spawned entity survives page reload. This requires either seeded RNG for deterministic event outcomes or a test helper that completes a full career term. |

### `apps/web/e2e/sync-latency.spec.ts`

| #   | Line | Test Title                                                 | Disposition         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ---- | ---------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | 4    | graph changes sync within 500ms between two users          | KEEP-WITH-RATIONALE | Same Hocuspocus infrastructure gap as #1. Additionally, the 500ms latency assertion is inherently flaky: `waitForFunction` polls every 100ms by default, and `Date.now()` measures wall-clock time that includes page load, event processing, and the polling loop. In CI, even 1000ms can be tight. A restored version should either relax the timing bound or measure from the server's perspective.              |
| 5   | 47   | node edit propagation syncs within 500ms between two users | KEEP-WITH-RATIONALE | Same infrastructure + timing flakiness as #4. The drag interaction (mouse down/move/up) is also position-sensitive and can fail if React Flow's viewport state differs. The test creates a node, then drags it, measuring how long before the other context sees the position change. Restore requires Hocuspocus infra + more robust interaction steps (use `data-testid` selectors instead of mouse coordinates). |
| 6   | 109  | table changes sync within 500ms between two users          | KEEP-WITH-RATIONALE | The reputation table component (`/reputation`) does not initialize a Hocuspocus provider — only GraphCanvas does. This is a fundamental architectural limitation: there is no Yjs document to sync. The test cannot pass until the reputation table has a sync layer. Until then, this is correctly skipped. Documented in the code comment.                                                                        |

### `apps/web/e2e/tables.spec.ts`

| #   | Line | Test Title                                | Disposition         | Rationale                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ---- | ----------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | 70   | data persists after page reload           | KEEP-WITH-RATIONALE | The reputation table stores data only in-memory; it doesn't initialize IndexedDB persistence or a Yjs document (only GraphCanvas does). After page reload, all faction data is lost. Fixing this requires adding a persistence layer (either IndexedDB standalone or a Hocuspocus-backed Yjs doc) to the reputation table component — a significant feature addition beyond test scope. |
| 8   | 88   | changes sync between two browser contexts | KEEP-WITH-RATIONALE | Same architectural limitation as #6. The reputation table component has no Hocuspocus provider, so cross-context sync is impossible. This test is structurally identical to the sync-latency table test (#6).                                                                                                                                                                           |

### `apps/web/e2e/performance.spec.ts`

| #   | Line | Test Title                                | Disposition         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ---- | ----------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | 97   | concurrent users with moderate node count | KEEP-WITH-RATIONALE | Requires 5 browser contexts connected to the same Hocuspocus room. Same infrastructure gap as #1 — the Hocuspocus server is not covered by Playwright's `webServer`. Additionally, 5 concurrent contexts are resource-intensive; the test creates all contexts upfront which could consume significant memory in CI. Restore requires full-stack infra + possibly reduced concurrency (e.g., 2-3 contexts). |

### `apps/web/e2e/chargen-flow.spec.ts`

| #   | Line | Test Title                                    | Disposition         | Rationale                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ---- | --------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | 51   | entity spawning creates visible graph nodes   | KEEP-WITH-RATIONALE | Empty test body (stub) — the test declares the intent to verify that career event-driven entity spawning produces graph nodes, but the flow is multi-step (Background → Career → Term Resolution → Event roll) and dice-dependent. A real implementation would need either seeded RNG or a page-object abstraction that drives the full chargen wizard to a point where an entity-spawning event fires. |
| 11  | 61   | character appears in graph after finalization | KEEP-WITH-RATIONALE | Empty test body (stub) — same pattern as #10. The full finalization flow spans 5 wizard steps (Background → Career → Skills → Benefits → Finalize) and calls `createCharacterNode()` in the last step. Implementing this test requires comprehensive Page Object Model helpers for each wizard step.                                                                                                    |

---

## Additional Files (not in original triage scope, documented for completeness)

### `apps/web/e2e/portrait-chargen.spec.ts`

| #   | Line | Test Title                                              | Disposition         | Rationale                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---- | ------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12  | 27   | (conditional skip) portrait controls in non-spawn state | KEEP-WITH-RATIONALE | Uses `test.skip(true, ...)` — a runtime conditional skip that is appropriate here. The portrait controls (Generate Portrait / Browse Library) only appear when an entity has been spawned or a character finalized. In the baseline "just loaded chargen" state, these controls don't exist. The test gracefully degrades with a clear skip message. This is a correct pattern and should stay. |

### `apps/web/e2e/rag.spec.ts`

| #   | Line | Test Title                                  | Disposition         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ---- | ------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | 80   | intercepts API and displays mocked response | KEEP-WITH-RATIONALE | The test mocks the RAG query endpoint via `page.route('**/api/rag/query', ...)`, but the actual app may use a different path or SSE streaming endpoint that doesn't match this pattern. Additionally, the SSE response format (`data: ...`) may not be handled correctly by the chat component's response parser without proper stream handling. The mock approach is valid but needs to be verified against the actual API contract before un-skipping. |

---

## Summary

| Disposition         | Count |
| ------------------- | ----- |
| RESTORE             | 0     |
| KEEP-WITH-RATIONALE | 13    |
| DOCUMENT / REMOVE   | 0     |

**Key finding**: All 13 fixme/skip tests have blockers that prevent trivial restoration. The most common blocker is infrastructure — 7 tests require the Hocuspocus sync server, which Playwright's `webServer` configuration does not cover. 2 tests depend on architectural features (table sync/persistence) that don't exist yet. 2 tests are stubs requiring complex multi-step chargen flows. The remaining 2 have legitimate conditional-skip or mock-mismatch issues.

**Recommended next steps**:

1. Create a `docker-compose.e2e.yml` profile that the Playwright `webServer` can run to also start Hocuspocus + DB
2. Add a `data-testid` attribute to the entity creation mechanism for deterministic test triggers
3. Implement a Hocuspocus provider for the reputation table if cross-context sync is desired
4. Extract Page Object Model helpers for the chargen wizard steps
