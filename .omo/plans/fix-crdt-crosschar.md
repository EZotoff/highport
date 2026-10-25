# Plan A — Fix CRDT / Cross-Character Subsystem (chargen review 2026-10-23)

Baseline commit: `22911ea2d489c66a9d94d22e32cbface7d2dbb54`
Source artifacts: `.sisyphus/reviews/chargen-20261023/ledger.md`, `01-crdt-sync.md`, `03-coverage.md` (receipts re-validated against live source on 2026-10-24; line numbers below are CURRENT on-disk lines and may drift a few lines from the lane receipts — worker should locate by symbol name).

## Goal

Make the cross-character link state machine converge correctly under concurrent dual acceptance, make entity spawn atomic, and close the test gaps that let these regress. All fixes respect `apps/web/AGENTS.md` Yjs rules (attach-before-mutate, single `doc.transact` for multi-op writes, no `as any`).

## Scope — Plan A findings ONLY

| id    | severity | one-line                                                                             |
| ----- | -------- | ------------------------------------------------------------------------------------ |
| F01-1 | CRITICAL | concurrent dual-acceptance sticks link at `pending`, no edge, re-accept blocked      |
| F01-2 | MAJOR    | `spawnEntity` non-atomic 3-transaction write                                         |
| F01-3 | MAJOR    | unguarded LWW status race: `resolveCrossCharacterLink` vs `acceptCrossCharacterLink` |
| F01-4 | MINOR    | pre-attach Y.Map mutation convention violations                                      |
| F01-5 | MINOR    | duplicate cross-link edges on concurrent finalize (TOCTOU)                           |
| F03-1 | MAJOR    | zero coverage of concurrent dual-acceptance (two-doc test)                           |
| F03-2 | MAJOR    | generation→Yjs write path untested                                                   |
| F03-3 | MINOR    | GMControlPanel bypass of dual-acceptance gate untested                               |
| F03-5 | MINOR    | `hooks.ts` has no dedicated tests                                                    |

Must-NOT-Have (explicitly out of scope — other plans / lanes own these):

- Provenance pipeline (F02-_), server authz (F04-_), MGT2E rules (F05-\*), yjs-helpers.ts provenance fields.
- No new feature work, no renaming exports, no changing `CrossCharacterLinkProposal`'s public shape beyond what the design decision below requires (additive `resolution` field only).
- No E2E/Playwright changes; this plan is L1+L2 (typecheck + vitest) per the verification contract for state-machine work.

## Assumptions (defaults adopted; not blocking)

1. Vitest invocation via `pnpm --filter web exec vitest run <path-or-filter>` (works regardless of the `test` script's arg-passing).
2. `yjs` is currently version 13.6.29 (validated by lane 01). Pinning to `~13.6.29` is in-scope as part of F01-4.
3. GM retain authority to resolve a pending link outright (existing GMControlPanel behavior is intentional GM power); F03-3 therefore adds TEST coverage, not a behavior change to GMControlPanel itself.
4. `crypto.randomUUID()` availability in the test env is already proven by existing tests (`cross-character-proposals.test.tsx`).

## Design decision — F01-1 / F01-3: derive status vs in-transact recompute

Two candidate approaches were evaluated:

- **(a) In-transact recompute only**: recompute `bothAccepted` inside `doc.transact` from the merged `acceptedBy` map after the set.
- **(b) Derive status on read** from the merged `acceptedBy` state, with a GM-resolution override field.

**PICKED: (b) derive on read.** Yjs never runs application code when a remote update merges — the reproduced bug (`01-crdt-sync.md` forced-check e, REPRODUCED exit=0) is precisely a `bothAccepted` computed _before_ the concurrent accept merged in; approach (a) fixes only the serialized single-doc case and leaves the two-doc case stuck at `pending`. `acceptedBy` is stored as a nested `Y.Map` keyed per character, which merges CRDT-perfectly, so recomputing `status` from its keys on read converges on every replica with no merge hook. The stored `status` scalar is demoted to a write-through cache; GM reject is preserved via an additive `resolution` override field that takes precedence over the derived value.

### Target state model (authoritative spec for the worker)

Stored per link (Y.Map under `chargen.crossCharacterLinks.<linkId>`):

- `acceptedBy`: nested `Y.Map<characterId, true>` — **authoritative** acceptance record.
- `resolution` (optional plain object): `{ status: 'accepted' | 'rejected', by: 'gm' }` — set ONLY by `resolveCrossCharacterLink`; wins over derived status.
- `status`: plain string, kept updated best-effort inside the same transact for any legacy readers — never trusted by `yMapToCrossCharacterLink`.

Derived status (computed in `yMapToCrossCharacterLink`, `apps/web/lib/chargen/state.ts:606-621`):

```
if (linkMap.resolution) -> resolution.status
else if (acceptedBy.has(sourceCharId) && acceptedBy.has(targetCharId)) -> 'accepted'
else -> 'pending'
```

Edge invariant: an `accepted` link has AT MOST ONE edge between its node pair, with a deterministic id (see Task 4). Edge creation is attempted opportunistically (on accept, on GM accept, on finalize) AND via an explicit post-merge reconciliation function `reconcileCrossCharacterLinkEdges(doc)` (exported from `state.ts`, specified in Task 2): because Yjs never runs application code on remote merge, SOMETHING must run after sync to materialize a missing edge. `reconcileCrossCharacterLinkEdges` scans accepted links and ensures each has its deterministic edge (no-op when present, idempotent); it iterates `getCrossCharacterLinks(doc)` — which stays a PURE READ and does NOT invoke reconcile (no recursion). SINGLE wiring point for production (Momus round-2 fix #1): `useCrossCharacterLinks`' `updateLinks` callback in `apps/web/lib/chargen/hooks.ts` calls reconcile before `setLinks` — every UI surface that displays links (GMControlPanel via its own hook usage, CrossCharacterProposalList) reads through this hook or the same raw map, so the hooks layer is the one place post-merge repair happens. The ONLY other invocation is the Task 1 regression test, which calls it explicitly after final sync. All creation sites converge on the same deterministic edge id.

## Cross-plan seams and sequencing

- **Plan B (provenance)** will edit `TermResolutionStep.tsx` (F02-2, F02-4) and `EntitySpawnForm.tsx` (F02-3). Plan A touches `EntitySpawnForm.tsx` only inside `handleSubmit` (portrait-attach placement is already correct post-F01-2; A's change there is limited to passing/verifying the atomic spawn) and touches `TermResolutionStep.tsx` NOT AT ALL after Task 5 — Task 5's fix lives entirely in `entity-spawner.ts` + `state.ts`. Keep it that way to minimize diff overlap.
- **Plan D (mgt2e)** will edit `TermResolutionStep.tsx` mechanics (F05-2, F05-4) — disjoint from Plan A's files except none.
- **Recommended order: Plan A FIRST, then Plan B, then Plan D.** Rationale: A stabilizes the `state.ts` cross-character API (`acceptCrossCharacterLink` semantics, `yMapToCrossCharacterLink` derivation) that both B and D consume indirectly through hooks and UI; doing A first means B/D build and test against converged semantics. A's UI-file overlap with B is near-zero by construction (above), so reverse-order would also work but re-runs A's new regression tests unnecessarily.

## Baselines to preserve

- Chargen test suite: **45/45 passing, exit 0** (lane 03, F03-6). Must remain green after every task.
- `apps/web/__tests__/cross-character-proposals.test.tsx` existing single-doc tests assert `acceptedBy: ['char-1']` ordering and the current `status` lifecycle — keep these semantics (single-doc sequential behavior is unchanged by the derivation design; derived status reproduces the same values in the serialized case).
- `apps/web/__tests__/chargen-state.test.ts` (33 tests) and `apps/web/lib/chargen/__tests__/persistence.test.ts` must stay green (F01-4 touches the same write paths).
- Existing spawn integration tests: `apps/web/__tests__/chargen-flow-integration.test.ts:94,123,162` (F01-2 must not break them).

---

## Todos

- [ ] 1. [F01-1 + F03-1, TEST-FIRST] Add failing two-doc concurrent dual-acceptance regression test — expect RED on current code.
  - Files: `apps/web/__tests__/cross-character-proposals.test.tsx` (new `describe('concurrent dual-acceptance across synced docs')` block; no React rendering needed).
  - Approach — build the repro from `.sisyphus/reviews/chargen-20261023/01-crdt-sync.md` forced-check e (REPRODUCED exit=0): create `docA = new Y.Doc()`, `docB = new Y.Doc()`; exchange updates bidirectionally with `Y.encodeStateAsUpdate` / `Y.applyUpdate` helpers defined locally in the test file (`const sync = (a: Y.Doc, b: Y.Doc) => { a.on('update', u => Y.applyUpdate(b, u, 'remote')); b.on('update', u => Y.applyUpdate(a, u, 'remote')); }` — wire BEFORE seeding, mirroring the lane repro). Seed identical link via `addCrossCharacterLink` on docA, sync to docB. Then WITHOUT syncing in between: `acceptCrossCharacterLink(docA, linkId, 'char-1')` and `acceptCrossCharacterLink(docB, linkId, 'char-2')`. Sync both ways. IMPORTANT (Momus round-1 fix #1): since neither accept runs post-merge, edge materialization needs the reconciliation path — the test MUST call `reconcileCrossCharacterLinkEdges(docA); reconcileCrossCharacterLinkEdges(docB);` after the final sync, mirroring the production hooks wiring. Assert on both docs after that: merged `acceptedBy` contains both `char-1` and `char-2`; derived `status === 'accepted'`; exactly one edge exists in `getEdgesMap(doc)` between the two finalized character nodes (create + finalize both characters first via `createCharacter` + `createCharacterNode` as in the existing edge test at lines 73-80).
  - RED-safety for the not-yet-existing export (Momus round-2 non-blocking fix): do NOT add a top-level static import of `reconcileCrossCharacterLinkEdges` — a missing named export can fail the whole file at ESM link time and break the existing 45 tests. Instead, inside the new test body use a dynamic import: `const { reconcileCrossCharacterLinkEdges } = await import('../lib/chargen/state');` then first assertion `expect(typeof reconcileCrossCharacterLinkEdges).toBe('function')` — pre-Task-2 this assertion fails cleanly as the RED signal (test-level failure, file still loads, other tests unaffected); post-Task-2 it passes and the edge assertions run.
  - Add a companion assertion test for the F01-3 race in the same block: after the concurrent dual-accept converges to accepted, call `resolveCrossCharacterLink(docA, linkId, false)` (GM reject), sync, assert status is `rejected` on both docs AND the edge created by acceptance is gone (`getEdgesMap` has no edge between the pair).
  - Test: this IS the test task. Run: `pnpm --filter web exec vitest run __tests__/cross-character-proposals.test.tsx`.
  - Expected NOW: new tests FAIL (status stuck `'pending'`, no edge; reject does not remove edge). Existing 45 tests still pass. Commit the RED test as `test(chargen): add failing two-doc concurrent dual-acceptance repro (F01-1/F01-3)`.

- [ ] 2. [F01-1] Derive status from merged `acceptedBy`; add post-merge edge reconciliation; fix concurrent dual-acceptance.
  - Files: `apps/web/lib/chargen/state.ts` — `yMapToCrossCharacterLink` (:606-621), `acceptCrossCharacterLink` (:720-738), `addCrossCharacterLink` (:627-649), plus NEW exported `reconcileCrossCharacterLinkEdges(doc: Y.Doc): void`; `apps/web/lib/chargen/hooks.ts` — `useCrossCharacterLinks` (:215-235).
  - Approach: implement the target state model above. (1) `yMapToCrossCharacterLink` reads `resolution` (plain object stored under key `'resolution'`, validate shape without `as any` — narrow via `typeof` guards) and computes status per the derivation rule, ignoring the stored `status` scalar. (2) NEW `reconcileCrossCharacterLinkEdges(doc)`: for every link in `getCrossCharacterLinks(doc)` with derived status `'accepted'`, ensure the deterministic edge exists between the node pair (via `createCrossCharacterLinkEdge`, idempotent per Task 4 — skip when either node is missing). Run the whole sweep in one `doc.transact`, origin `'cross-character-link-reconcile'`; must be a strict no-op (zero writes) when all accepted links already have edges. `getCrossCharacterLinks` itself is NOT modified — it stays a pure read; reconcile calling it is safe because nothing calls reconcile from within the read path (the single production wiring point is the hooks layer, per (5); Momus round-2 fix #1). (3) `acceptCrossCharacterLink`: call `reconcileCrossCharacterLinkEdges(doc)` (or inline the ensure-edge step) BEFORE the `acceptedBy.has(characterId)` early return — the early return must NOT block repairing an accepted-by-both link that is missing its edge (Momus round-1 fix #2). Order inside the function: reconcile/repair first, then if this call changes nothing (already accepted by this character AND edge present) return as a no-op; otherwise proceed: `acceptedBy.set(characterId, true)`, compute `bothAccepted` INSIDE `doc.transact` re-reading `acceptedBy` after the set, write derived `status` cache scalar, and ensure edge when derived-accepted. (4) `addCrossCharacterLink` stores `resolution: undefined` absent; no other change (pre-attach fix is Task 6). (5) SINGLE production wiring point (Momus round-2 fix #1): `useCrossCharacterLinks`' `updateLinks` callback in `hooks.ts` calls `reconcileCrossCharacterLinkEdges(doc)` before `setLinks`, so any replica repairs its edges on the first UI read after a merge. Do NOT add reconcile invocations anywhere else (not in `getCrossCharacterLinks`, not in a raw doc observer, not in GMControlPanel).
  - Types: add `resolution?: { status: 'accepted' | 'rejected'; by: 'gm' }` to `CrossCharacterLinkProposal` in `apps/web/lib/chargen/types.ts` (additive, optional).
  - Test: the Task 1 dual-acceptance test flips GREEN (status derived on read; reconcile materializes the single edge on both docs). Existing single-doc dual-accept test (lines 42-71) must still pass unchanged; the existing re-accept no-op assertion (lines 61-64) still holds because reconcile is a no-op when the edge already exists.
  - Verify: `pnpm --filter web exec vitest run __tests__/cross-character-proposals.test.tsx` → all pass. Done-criteria (F01-1): two-doc concurrent dual-accept converges to `status='accepted'` with exactly one edge on both docs after `reconcileCrossCharacterLinkEdges`; `acceptCrossCharacterLink` repairs a missing edge even when the accepting character is already recorded.

- [ ] 3. [F01-3] Guard GM resolution: transition rules + edge coupling in-transact.
  - Files: `apps/web/lib/chargen/state.ts` — `resolveCrossCharacterLink` (:651-658).
  - Approach: inside a single `doc.transact`: (1) read current DERIVED status (via the Task 2 derivation, computed from `acceptedBy` + existing `resolution`); (2) write `resolution = { status: accepted ? 'accepted' : 'rejected', by: 'gm' }`; (3) couple the edge: if final status is `accepted`, attempt `createCrossCharacterLinkEdge` (idempotent); if final status is `rejected` and an edge with the deterministic cross-link id exists between the node pair, delete it (`getEdgesMap(doc).delete(edgeId)`); (4) update the `status` cache scalar. Idempotent re-resolve to the same status is a no-op (skip the transact if unchanged).
  - Test: Task 1's reject-couples-edge assertion flips GREEN. Add one sequential test: GM accepts a pending link outright → status `accepted`, edge exists; then GM rejects → edge removed, status `rejected`.
  - Verify: `pnpm --filter web exec vitest run __tests__/cross-character-proposals.test.tsx` and `pnpm --filter web exec vitest run __tests__/GMControlPanel.test.tsx` → pass. Done-criteria (F01-3): no status write happens outside a transact that also reconciles the edge; accepted→rejected removes the edge deterministically.

- [ ] 4. [F01-5] Deterministic cross-link edge ids; idempotent edge creation.
  - Files: `apps/web/lib/chargen/state.ts` — new exported helper `crossLinkEdgeId(sourceNodeId: string, targetNodeId: string, relationship: string): string` (implementation: sort the two node ids lexicographically, concatenate with relationship, hash — use a small synchronous hash, e.g. FNV-1a over the UTF-8 bytes formatted as hex, prefixed `xlink-`; NO async, NO new dependency); `createCrossCharacterLinkEdge` (:683-718).
  - Files: `apps/web/lib/chargen/finalize.ts` (:78-119) — the accepted-cross-link edge creation loop.
  - Approach: in `createCrossCharacterLinkEdge`, replace the full edge-scan TOCTOU check with `edges.has(crossLinkEdgeId(...))`; use the deterministic id for the `GraphEdge`. Keep the existing scan as a secondary guard for legacy duplicates ONLY (one pass, same function) — or, simpler and preferred: keep the scan but ALSO create with the deterministic id; the `has()` check makes concurrent creates collapse. In `finalize.ts`, replace the local scan+`crypto.randomUUID()` with the same `crossLinkEdgeId` id and `has()` guard (the finalize loop's edge is between the same node pair, so ids collide exactly when they should).
  - Test: add to `cross-character-proposals.test.tsx` a two-doc test: finalize both characters concurrently on docA and docB for an already-accepted link, sync, assert exactly one edge (no duplicate).
  - Verify: `pnpm --filter web exec vitest run __tests__/cross-character-proposals.test.tsx` and `pnpm --filter web exec vitest run lib/chargen/__tests__` → pass. Done-criteria (F01-5): concurrent finalize produces a single edge; `crossLinkEdgeId` is pure and exported for tests.

- [ ] 5. [F01-2] Atomic `spawnEntity`: one transaction for graph node + edge + entity pool.
  - Files: `apps/web/lib/chargen/entity-spawner.ts` (:57-73).
  - Approach: wrap ALL THREE writes in one `doc.transact(() => { addNode(doc, node); addEdge(doc, edge); addEntityToPool(doc, {...}); }, 'chargen-spawn')`. Nested `doc.transact` inside `addEntityToPool` (`state.ts:388-399`) merges into the outer transaction (Yjs semantics) — do NOT change `addEntityToPool`'s signature. The portrait attach in `EntitySpawnForm.tsx:261-268` already runs after `spawnEntity` returns; no change needed there — CONFIRM this ordering survives (the await-gap cited in the finding was between pool write and term write; with pool inside the atomic block the gap no longer splits shared state).
  - Residual (documented, NOT fixed): `apps/web/components/chargen/steps/TermResolutionStep.tsx:326-334` term-record write remains a separate transaction; a crash between it and spawn leaves a graph node + pool entry without a term record — acceptable per lane sketch (term record is recoverable bookkeeping; orphan nodes were the durable harm).
  - Test: extend `apps/web/__tests__/chargen-flow-integration.test.ts` (near existing spawn tests at :94): spawn, then assert node, edge, and pool entry all exist AND `doc.transaction` fired as ONE update — assert via collecting `doc.on('update', ...)` events during `spawnEntity` and expecting exactly 1 update emission for the three writes.
  - Verify: `pnpm --filter web exec vitest run __tests__/chargen-flow-integration.test.ts` → pass, existing 3 spawn tests intact. Done-criteria (F01-2): graph + pool written in a single update; portrait attach strictly after.

- [ ] 6. [F01-4] Eliminate pre-attach Y.Map mutations; pin yjs.
  - Files: `apps/web/lib/chargen/state.ts` — `createCharacter` (:148-157), `addEntityToPool` (:388-398), `addCrossCharacterLink` (:641-642); `apps/web/lib/chargen/persistence.ts` — `restoreCharacterSnapshot`/`writeCharacterToMap` (:70-82); `apps/web/package.json` (yjs dep).
  - Approach: apply the AGENTS.md attach-first pattern everywhere a `new Y.Map()` is populated before insertion: attach the empty map (or attach-and-return) FIRST, then set entries inside the same `doc.transact`. Concretely: (1) `createCharacter`: `characters.set(charId, charMap)` where `charMap = new Y.Map()` — restructure to set the empty map, then populate in the same transact (attach-then-mutate within one transact is the sanctioned pattern). (2) `addEntityToPool`: same restructure. (3) `addCrossCharacterLink`: replace `new Y.Map<unknown>(Object.entries(fullLink))` + pre-attach `acceptedBy` set (:641-642) with: create empty `linkMap`, inside transact `linksMap.set(linkId, linkMap)` then `linkMap.set('acceptedBy', attachedNestedMap)` where the nested acceptedBy Y.Map is also attached to `linkMap` BEFORE its keys are set. (4) `persistence.ts` `writeCharacterToMap` call site: same attach-first restructure. (5) Pin `yjs` to `~13.6.29` in `apps/web/package.json` (preserve any `y-indexeddb`/partner constraints; run `pnpm install` and commit the lockfile).
  - Test: existing suites are the regression net — `apps/web/__tests__/chargen-state.test.ts` (33 tests) and `apps/web/lib/chargen/__tests__/persistence.test.ts` exercise all four write paths. Add one assertion test to `cross-character-proposals.test.tsx`: after `addCrossCharacterLink` + doc clone via `Y.encodeStateAsUpdate` round-trip into a fresh doc, `yMapToCrossCharacterLink` still returns `acceptedBy` keys (prelimContent round-trip guard).
  - Verify: `pnpm --filter web exec vitest run lib/chargen/__tests__ __tests__/chargen-state.test.ts` and `pnpm --filter web exec vitest run __tests__/cross-character-proposals.test.tsx` → pass. Done-criteria (F01-4): `grep -n "new Y.Map(" apps/web/lib/chargen/state.ts apps/web/lib/chargen/persistence.ts` shows no construction that is populated before its attachment line within the same function; yjs pinned.

- [ ] 7. [F03-2] Test the generation→Yjs write path.
  - Files: NEW `apps/web/__tests__/useNarrative-yjs-write.test.ts`. `apps/web/__tests__/useNarrative.test.ts` is LEFT UNTOUCHED (Momus round-2 fix #2: replacing its file-level `../lib/chargen/state` mock with importActual would break its existing `addCrossCharacterLink` spy assertion at :268-295).
  - Approach: in the new file, mock ONLY `../lib/ydoc` (`vi.mock('../lib/ydoc', ...)` using `vi.importActual` spread + `getYDoc: vi.fn()` override, same pattern as `cross-character-proposals.test.tsx:26-32`) returning a real `Y.Doc`; do NOT mock `../lib/chargen/state` — real state functions run against the real doc. Mock `narrativeApi`/`useAllCharacters` only as needed to drive `useCrossCharacterLinks(...).refresh()` from `../lib/chargen/useNarrative` (mock its external HTTP-layer dependencies the same way `useNarrative.test.ts` does, without touching its state mock). Then: seed one existing link via the real `addCrossCharacterLink`, make the mocked `generateCrossCharacterLinks` return one NEW proposal plus one duplicate of the seeded link, call `refresh()`, and assert (1) `getCrossCharacterLinks(doc)` contains exactly the new proposal (dedup respected), (2) the link's `id`/`status: 'pending'`/`generatedAt` were written INTO the Yjs `chargen.crossCharacterLinks` map (read the raw map, not hook state, to pin the Yjs write path per the finding).
  - Test: this IS the test task; expect GREEN immediately (no product change) — if it fails, the generation write path is already broken and STOP + report instead of "fixing" useNarrative beyond scope.
  - Verify: `pnpm --filter web exec vitest run __tests__/useNarrative-yjs-write.test.ts __tests__/useNarrative.test.ts` → both pass; the pre-existing useNarrative tests are byte-unchanged. Done-criteria (F03-2): a regression deleting the `addCrossCharacterLink` call at `useNarrative.ts:193` fails the new file's test.

- [ ] 8. [F03-3] Component test: player accept path goes through `acceptCrossCharacterLink`.
  - Files: `apps/web/__tests__/cross-character-proposals.test.tsx` (extend the existing mocked-hooks component block).
  - Approach: render `CrossCharacterProposalList` with a pending proposal (mock `useCrossCharacterLinks`/`useAllCharacters` as the file already does at :21-24), click the accept control, and assert `acceptCrossCharacterLink` was called with `(doc, proposal.id, <characterId>)` (spy via `vi.spyOn` on the state module or assert on resulting Y.Doc state — prefer asserting real Y.Doc state after unmocking state module: status derived-accepted flow for the accepting party). Note in a code comment at `GMControlPanel.tsx:133` (comment only, no behavior change) that GM accept is an intentional GM-authority resolution, distinct from the player dual-acceptance gate.
  - Verify: `pnpm --filter web exec vitest run __tests__/cross-character-proposals.test.tsx` and `pnpm --filter web exec vitest run __tests__/GMControlPanel.test.tsx` → pass. Done-criteria (F03-3): the player-side dual-acceptance gate has direct component-level coverage, not only indirect coverage.

- [ ] 9. [F03-5] Dedicated tests for `hooks.ts` observer lifecycle.
  - Files: new `apps/web/__tests__/chargen-hooks.test.tsx`.
  - Approach: use `@testing-library/react` `renderHook`. Mock `getYDoc` to a fresh real `Y.Doc` (importActual pattern). Cover at minimum `useAllCharacters` (:68-92) and `useCrossCharacterLinks` (:215-235): (1) initial render reflects seeded state; (2) a Yjs write AFTER mount triggers re-render with new data (`act(() => doc.transact(...))`); (3) `unmount()` removes the observer — write to the doc after unmount and assert no state update / no React warning (assert via a spy on `unobserveDeep` being called, plus rerender-absence where feasible). Follow the existing mock style in `cross-character-proposals.test.tsx:26-32`.
  - Verify: `pnpm --filter web exec vitest run __tests__/chargen-hooks.test.tsx` → pass. Done-criteria (F03-5): every hook with an observe/observeDeep subscription has an unmount-cleanup assertion.

---

## Final verification wave

- [ ] F1. Full chargen-relevant vitest suite green at baseline scale or better: `pnpm --filter web exec vitest run __tests__/cross-character-proposals.test.tsx __tests__/chargen-flow-integration.test.ts __tests__/GMControlPanel.test.tsx __tests__/useNarrative.test.ts __tests__/useNarrative-yjs-write.test.ts __tests__/chargen-hooks.test.tsx lib/chargen/__tests__` → exit 0; ≥45 pre-existing tests + all new tests pass (baseline: 45/45 chargen tests, lane 03 F03-6).
- [ ] F2. Full web unit suite: `pnpm --filter web test` → exit 0 (no regressions anywhere in web).
- [ ] F3. Static gates: `pnpm --filter web typecheck` → exit 0; `grep -rn "as any" apps/web/lib/chargen/ apps/web/lib/chargen/entity-spawner.ts` → 0 new occurrences (repo rule: no `as any`).
- [ ] F4. Finding closure check: each of F01-1, F01-2, F01-3, F01-4, F01-5, F03-1, F03-2, F03-3, F03-5 maps to at least one passing test added by Tasks 1-9 (list test file + test name per finding in the completion report). Anti-regression spot-check: temporarily reverting the Task 2 derivation makes the Task 1 test fail (do this as a scratch check, do not commit the revert).

## Execution Record

Execution baseline: 5f952bf (branch agent/sisyphus/chargen-fix-a, on top of merged Plans C and B)
