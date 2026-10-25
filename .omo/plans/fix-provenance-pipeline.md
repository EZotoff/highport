# fix-provenance-pipeline - Work Plan

## TL;DR (For humans)

**What you'll get:** AI-generated content in collaborative character creation keeps its authorship and approval status everywhere it travels — into the shared campaign graph, through GM rejection/edit, into exports — instead of silently losing it or resurrecting rejected text.

**Why this approach:** All display and completion logic is re-derived from the single authoritative provenance record stored in the shared document, never from local screen state, matching the repo rule "do NOT strip provenance between layers."

**What it will NOT do:** It does not change server-side authorization, spawn atomicity, or MGT2E mechanics rules — those belong to the sibling plans (A/C/D lanes).

**Effort:** Short
**Risk:** Medium - two CRITICAL data-integrity bugs; backcompat with existing provenance-less live documents must be preserved.
**Decisions to sanity-check:** B executes before A and D (sequencing rationale below); export provenance rides inside the Foundry `flags.highport` block.

Your next move: approve and run via `/start-work`. Full execution detail follows below.

---

> TL;DR (machine): Short, Medium-risk; 6 implementation todos fixing provenance persistence (F02-1), forced muster-out resurrection (F02-2), NPC description approval bypass (F02-3), stale-draft display (F02-4), export/derivation loss (F02-5); test-first on both CRITICALs; vitest + typecheck + server export test final wave.

## Scope

### Must have

- F02-1 (CRITICAL): provenance preserved in graph persistence conversions (`nodeToYMap`, `yMapToNode`, `addNode`) with backcompat for existing provenance-less nodes.
- F02-2 (CRITICAL): forced muster-out preserves the authoritative `mishapDescription` provenance wrapper; never rebuilds from local state over a GM resolution.
- F02-3 (MAJOR): NPC spawn submission enforces approval for every AI-authored field, not just the name; node-level provenance reflects the most restrictive field state.
- F02-4 (MAJOR): term-resolution narrative display derives from the authoritative wrapper, refreshing when the GM resolves a draft.
- F02-5 (MINOR): export JSON and Foundry serialization carry provenance; `SpawnedEntityRef.provenance` carries `derivedFrom`.
- Regression tests for every finding; failing-test-first for F02-1 and F02-2.

### Must NOT have (guardrails, anti-slop, scope boundaries)

- Do NOT touch spawn transaction structure / atomicity (`handleSpawnComplete`, `spawnEntity` transaction layout) — Plan A (F01-2) owns that seam.
- Do NOT touch cross-character dual-acceptance state machine (F01-x), server authz (F04-x), or MGT2E mechanics (F05-x).
- Do NOT change the shape of `AIProvenance<T>` or `ProvenanceEntry` beyond adding `derivedFrom` to `SpawnedEntityRef.provenance`.
- Do NOT add a Yjs migration step or rewrite existing live docs — backcompat is read-side only.
- Do NOT use `as any` or `@ts-ignore` (repo anti-pattern).
- Do NOT switch the package manager or add dependencies.

## Verification strategy

> Zero human intervention - all verification is agent-executed.

- Test decision: TDD for F02-1/F02-2 (failing test committed before fix, same todo), tests-after for F02-3/F02-4/F02-5. Framework: Vitest (web + server).
- Evidence: `.omo/evidence/fix-provenance-pipeline/task-<N>-fix-provenance-pipeline.<ext>` (test output excerpts); outside ulw-loop use `.omo/evidence/`.

## Execution strategy

### Parallel execution waves

- Wave 1: Todos 1 (F02-1) and 2 (F02-2) — both test-first, independent files.
- Wave 2: Todos 3 (F02-3), 4 (F02-4), 5 (F02-5) — independent; 3 and 4 touch TermResolutionStep/EntitySpawnForm read-side only.
- Wave 3: Todo 6 (regression sweep + typecheck) — blocked by 1–5.

### Cross-plan sequencing (decision)

**Plan B executes BEFORE Plan A and BEFORE Plan D.** Rationale: (a) B's changes are small and surgical — A (spawn atomicity in `entity-spawner.ts` + `handleSpawnComplete`) and D (TermResolutionStep mechanics rewrite) will rewrite larger surrounding regions and should rebase onto B's settled provenance semantics; (b) B establishes the authoritative-wrapper derivation contract that D's term-mechanics work must display correctly. Keep all B edits in the cited functions only so A/D merges stay clean.

### Schema distinction (binding for all todos)

- `AIProvenance<T>` (apps/web/lib/chargen/types.ts:70) — wraps a field VALUE (event/mishap narrative, NPC name/description). Lives inside `CareerTermResult` fields and local component state.
- `ProvenanceEntry` (packages/shared/src/types/graph.ts:10) — node-level provenance on `GraphNode.provenance`. Flattened summary: source/status/pendingReviewBy/generatedAt/derivedFrom. NO `value`, NO `reviewLog`.
- `SpawnedEntityRef.provenance` (apps/web/lib/chargen/types.ts:150) — same flattened shape as ProvenanceEntry. This plan adds `derivedFrom?: string` to it (F02-5).
- Never store `AIProvenance` in a graph node; always flatten to `ProvenanceEntry` at the spawn boundary.

### Dependency matrix

| Todo      | Depends on | Blocks | Can parallelize with |
| --------- | ---------- | ------ | -------------------- |
| 1 (F02-1) | —          | 6      | 2                    |
| 2 (F02-2) | —          | 6      | 1                    |
| 3 (F02-3) | —          | 6      | 4, 5                 |
| 4 (F02-4) | —          | 6      | 3, 5                 |
| 5 (F02-5) | —          | 6      | 3, 4                 |
| 6 (sweep) | 1–5        | F-wave | —                    |

## Todos

- [ ] 1. F02-1 (CRITICAL, test-first): preserve provenance in graph node conversions
     What to do / Must NOT do:
  - FIRST write the failing test (below), run it, confirm it fails, commit the failing test (`test(chargen): provenance dropped by node conversions — failing`), THEN fix.
  - In `apps/web/lib/yjs-helpers.ts`:
    - `nodeToYMap` (line 5): after `ymap.set('created_by', ...)`, add `if (node.provenance !== undefined) ymap.set('provenance', { ...node.provenance });`
    - `addNode` (line 61): inside its `doc.transact`, after `ymap.set('created_by', ...)`, add the same guarded `ymap.set('provenance', { ...node.provenance })` when `node.provenance !== undefined`.
    - `yMapToNode` (line 19): add `provenance: (ymap.get('provenance') as GraphNode['provenance']) ?? undefined,` — backcompat: nodes in live Y.Docs written before this fix have no `provenance` key, so `ymap.get` returns `undefined` and `yMapToNode` must yield `provenance: undefined`, not throw or fabricate a value.
  - Store provenance as a plain JSON object (spread), NOT a nested `Y.Map` — the `nodes` map is `Y.Map<unknown>` and every reader (`GraphCanvas`, `useGraphContext`, `ExportButton`) treats values as plain data; also keeps export serialization trivial.
  - Must NOT do: do not change the `GraphNode`/`ProvenanceEntry` types (already support this); do not add provenance to edges; do not alter any other helper.
  - Test to add: extend `apps/web/__tests__/ydoc.test.ts` with a `describe('node provenance persistence')` block:
    1. roundtrip: `addNode(doc, nodeWithProvenance)` → read `getNodesMap(doc).get(id)` → `yMapToNode` → expect `provenance` deep-equals input (including `derivedFrom`).
    2. `nodeToYMap(nodeWithProvenance).get('provenance')` deep-equals the entry; `nodeToYMap(nodeWithoutProvenance).get('provenance')` is `undefined`.
    3. backcompat: build a Y.Doc node map with NO `provenance` key (simulate legacy doc) → `yMapToNode` returns `provenance: undefined` and all other fields intact.
  - Verification: `pnpm --filter web test -- ydoc` (exit 0; new tests fail before fix, pass after).
  - Acceptance criteria: grep `provenance` in `apps/web/lib/yjs-helpers.ts` shows it in all three functions; `ydoc.test.ts` new block passes.
  - QA scenarios: run `pnpm --filter web test -- ydoc 2>&1 | tee .omo/evidence/fix-provenance-pipeline/task-1-fix-provenance-pipeline.log`; assert `Tests  passed` and the three new test names appear.
  - Commit: Y | `fix(graph): preserve provenance in node yjs conversions` (two commits: failing test, then fix)

- [ ] 2. F02-2 (CRITICAL, test-first): forced muster-out must not resurrect rejected mishap content
     What to do / Must NOT do:
  - FIRST write the failing test (below), confirm fail, commit (`test(chargen): forced muster-out overwrites GM resolution — failing`), THEN fix.
  - Extract the term-merge logic of `handleForcedMusterOut` (apps/web/components/chargen/steps/TermResolutionStep.tsx:531-552) into a pure, exported helper `applyForcedMusterOut(terms: CareerTermResult[], opts: { mishap?: CareerMishap; generatedMishapDesc?: string; verbosity: VerbosityLevel; gmApprovalMode: 'lenient'|'moderate'|'strict' }): CareerTermResult[]` in a NEW file `apps/web/lib/chargen/muster-out.ts`. The component's `handleForcedMusterOut` becomes a thin call: build updated terms via the helper, then `finishTerm(updatedTerms, 'mustering_out')`.
  - Helper rule (the fix): look at the CURRENT last term's existing `mishapDescription`:
    - If it is already an `AIProvenance<string>` wrapper (the authoritative copy written by `handleGenerateMishapDescription` at TermResolutionStep.tsx:578-593, possibly since resolved by GM via `resolveAIDraft`) → PRESERVE IT VERBATIM (status, value, reviewLog, pendingReviewBy all untouched). Do not rebuild from `generatedMishapDesc`, do not reset status, do not drop `reviewLog`.
    - Only if the field is `undefined` (or a legacy bare string) AND `generatedMishapDesc` is defined → write a fresh wrapper exactly as the current code does (draft/accepted per approval mode, `derivedFrom: 'mishap-...'`, `pendingReviewBy`).
    - Always set `mishap` mechanics when provided (unchanged behavior).
  - Must NOT do: do not change `resolveAIDraft`; do not alter non-forced muster-out (`handleMusterOut`); do not read from local component state inside the helper (it takes terms + explicit opts only).
  - Test to add: new file `apps/web/lib/chargen/__tests__/muster-out.test.ts`:
    1. (failing test) term with `mishapDescription: { value: 'gm text', source: 'gm', status: 'edited', pendingReviewBy: null, reviewLog: [...] }` + stale `generatedMishapDesc: 'old ai text'` → result term keeps `value: 'gm text'`, `status: 'edited'`, `reviewLog` intact.
    2. term with `mishapDescription: { status: 'rejected', ... }` → stays `rejected` (value must not resurface via `unwrapAIField`).
    3. term with NO `mishapDescription` + `generatedMishapDesc` in moderate mode → fresh `draft` wrapper with `pendingReviewBy: 'gm'`; in lenient mode → `accepted`.
    4. no mishap and no desc → term unchanged.
  - Verification: `pnpm --filter web test -- muster-out` (exit 0 after fix).
  - Acceptance criteria: `TermResolutionStep.tsx` `handleForcedMusterOut` contains no inline `mishapDescription` object literal; helper exported from `muster-out.ts`; all 4 tests pass.
  - QA scenarios: `pnpm --filter web test -- muster-out 2>&1 | tee .omo/evidence/fix-provenance-pipeline/task-2-fix-provenance-pipeline.log`.
  - Commit: Y | `fix(chargen): forced muster-out preserves authoritative mishap provenance`

- [ ] 3. F02-3 (MAJOR): NPC spawn submission enforces approval on every AI-authored field
     What to do / Must NOT do:
  - In `apps/web/components/chargen/EntitySpawnForm.tsx`:
    - `submitDisabled` (line 131-132): extend from name-only to: `!nameProv?.value.trim() || [nameProv, descriptionProv, motivationProv, personalityProv].some((p) => p != null && requiresReview(p, gmApprovalMode))`. A manually typed name with a pending AI description in strict/moderate mode must NOT be submittable.
    - `handleSubmit` (line 238-259): compute node-level `ProvenanceEntry` as the MOST RESTRICTIVE of all defined fields (`nameProv`, `descriptionProv`, `motivationProv`, `personalityProv`) instead of name-only: if any defined field has `pendingReviewBy === 'gm'` or `status === 'draft'` → `{ source: 'ai', status: 'draft', pendingReviewBy: 'gm', generatedAt: <latest generatedAt among fields>, derivedFrom: <derivedFrom of that field> }`; else flatten from nameProv as today (current shape at lines 241-249). This keeps the graph node honest even though only one `ProvenanceEntry` slot exists.
    - Keep `description: descriptionProv?.value.trim()` as-is (the value passes; the enforcement is submit gating + honest node provenance). GM review of spawned entities is out of scope (F04-2 lane).
  - Must NOT do: do not change `spawnEntity` signature or `SpawnedEntityRef` shape here (todo 5 owns `derivedFrom`); do not alter `aiProvenance`/`blankProvenance` factories; do not touch portrait logic.
  - Test to add: extend `apps/web/__tests__/EntitySpawnForm.test.tsx`:
    1. strict mode, AI-generated description pending + manual name → submit button disabled.
    2. lenient mode, same state → submit enabled.
    3. submit (lenient, with AI description) → `spawnEntity` called with `provenance.status === 'accepted'`.
    4. (if test harness allows mocking `spawnEntity`) strict-mode bypass attempt asserts the most-restrictive merge would stamp `draft`/`gm` — assert via submit-disabled instead if mocking is awkward.
  - Verification: `pnpm --filter web test -- EntitySpawnForm` (exit 0).
  - Acceptance criteria: `submitDisabled` references all four prov fields; new tests pass.
  - QA scenarios: `pnpm --filter web test -- EntitySpawnForm 2>&1 | tee .omo/evidence/fix-provenance-pipeline/task-3-fix-provenance-pipeline.log`.
  - Commit: Y | `fix(chargen): enforce approval for all AI fields on NPC spawn submit`

- [ ] 4. F02-4 (MAJOR): term narrative display derives from authoritative provenance wrapper
     What to do / Must NOT do:
  - In `apps/web/components/chargen/steps/TermResolutionStep.tsx`, the sync `useEffect` (lines 129-149) currently refreshes `generatedDescription` only when `[characterId, termNumber]` change, so a GM edit/reject/accept that arrives mid-session never updates the player's view.
  - Fix: derive display from the authoritative wrapper. Add the term's `eventDescription` to the dependency set and a JSON-identity guard, OR (preferred, no effect-loop risk) compute a derived value:
    `const authoritativeEventDesc = currentTerm?.eventDescription;` then
    - displayed text = `unwrapAIField(authoritativeEventDesc)` (apps/web/lib/chargen/types.ts:95 — already returns `undefined` for rejected), EXCEPT while the player is actively editing a draft (`descriptionEditorOpen === true` AND wrapper status is `draft`), in which case keep local `generatedDescription`.
    - Simplify the existing effect to only manage `descriptionEditorOpen` (open iff wrapper status is `draft` or `edited`), removing the local-text duplication of the wrapper value where possible; where the editor needs a mutable local copy, re-seed it from the wrapper whenever the wrapper's `status`/`value` changes (effect keyed on `JSON.stringify(authoritativeEventDesc)`).
  - Invariant: the player must never see a wrapper's `draft` text rendered as approved, and must see the GM's replacement text (status `edited`/`accepted`) as soon as it syncs. Use `shouldShowDraft` (apps/web/lib/chargen/gm-approval.ts) for gating decisions — do not hand-roll mode logic.
  - Must NOT do: do not change `resolveAIDraft`; do not restructure the component's phase state machine (Plan D territory); do not touch `mishapDescription` display here beyond what todo 2 already fixes.
  - Test to add: extend or create a component test `apps/web/__tests__/term-resolution-narrative.test.tsx` following the mock/yjs patterns in `apps/web/__tests__/GMControlPanel.test.tsx`:
    1. render with term `eventDescription: { status: 'draft', value: 'draft text', pendingReviewBy: 'gm' }` → player sees draft handling per mode.
    2. update the underlying Y.Doc wrapper to `{ status: 'edited', value: 'gm text', pendingReviewBy: null }` (simulate GM edit via `resolveAIDraft` or direct doc write) → re-render shows `'gm text'`, not `'draft text'`.
    3. wrapper `status: 'rejected'` → narrative shows unavailable/empty (via `unwrapAIField` returning `undefined`), not the old draft.
  - Verification: `pnpm --filter web test -- term-resolution-narrative` (exit 0).
  - Acceptance criteria: no `useEffect` keyed only on `[characterId, termNumber]` writing `generatedDescription`; new tests pass.
  - QA scenarios: `pnpm --filter web test -- term-resolution-narrative 2>&1 | tee .omo/evidence/fix-provenance-pipeline/task-4-fix-provenance-pipeline.log`.
  - Commit: Y | `fix(chargen): derive term narrative display from authoritative provenance`

- [ ] 5. F02-5 (MINOR): export/Foundry serialization carries provenance; SpawnedEntityRef carries derivedFrom
     What to do / Must NOT do:
  - `apps/server/src/routes/export.ts`:
    - Local `GraphNode` interface (line 16-34): add `provenance?: { source: string; status: string; pendingReviewBy?: string | null; generatedAt?: number; derivedFrom?: string }` (mirror `ProvenanceEntry`; server does not import web types — keep the local structural type, or import `ProvenanceEntry` from `@highport/shared/types` if already a dependency — prefer the shared import since the server depends on `@highport/shared`).
    - `extractNodesFromYDoc` (line 78-90): add `provenance: (ymap.get('provenance') as GraphNode['provenance']) ?? undefined,` (backcompat same as todo 1).
    - `nodeToFoundryActor` (line 95-115): attach provenance under the Foundry flags convention: `flags: { highport: { provenance: node.provenance } }` on the returned `FoundryActorExport`; add `flags?: { highport?: { provenance?: ... } }` to the `FoundryActorExport` interface (line 5-14). Omit when undefined (do not emit `flags: { highport: { provenance: undefined } }`).
    - `/api/export/json` (line 179-206): the actors it returns are `nodeToFoundryActor` outputs — they now include `flags.highport.provenance`; ALSO include a top-level `provenance` on each actor object for plain-JSON consumers (add `provenance?: ...` to `FoundryActor` export payload — implement by spreading `{ provenance: node.provenance }` alongside the Foundry shape in the `/json` route only, or by including it in `nodeToFoundryActor` if cleaner; pick ONE, document with a one-line comment).
  - `apps/web/lib/chargen/types.ts` `SpawnedEntityRef.provenance` (line 150-155): add `derivedFrom?: string;`.
  - `apps/web/lib/chargen/entity-spawner.ts` (line 81-88): pass `derivedFrom: input.provenance.derivedFrom` inside the returned ref's provenance object (guarded, as with the other fields).
  - Must NOT do: do not change the Foundry import path (`/api/import/actors`) parsing behavior beyond tolerating the new optional flags field; do not touch knowledge/portrait routes; do not add DB columns.
  - Test to add:
    - Extend `apps/server/__tests__/export.test.ts`: seed a Y.Doc whose nodes map contains an npc node WITH a provenance object → `extractNodesFromYDoc` returns it; `nodeToFoundryActor` output has `flags.highport.provenance` deep-equal; legacy node without provenance → fields undefined, no throw. (This file already exists and builds Y.Doc fixtures — follow its existing pattern; note server tests require `docker compose up -d` per AGENTS.md.)
    - Extend `apps/web/__tests__/chargen-flow-integration.test.ts` (spawn flow at lines 94/123/162 already covers `spawnEntity`): assert the returned `SpawnedEntityRef.provenance.derivedFrom` propagates when the input provenance has one.
  - Verification: `pnpm --filter server test -- export` and `pnpm --filter web test -- chargen-flow-integration` (both exit 0).
  - Acceptance criteria: exported JSON for an AI-spawned NPC contains non-null provenance; `SpawnedEntityRef` type includes `derivedFrom`.
  - QA scenarios: run both commands with tee to `.omo/evidence/fix-provenance-pipeline/task-5-fix-provenance-pipeline-{server,web}.log`.
  - Commit: Y | `fix(export): carry provenance and derivedFrom through export serialization`

- [ ] 6. Regression sweep + static gates
     What to do / Must NOT do: run the full final-wave command set below; fix any regression in the five touched areas only; if a failure traces to Plan A/D seams, stop and report instead of fixing.
  - Must NOT do: no new features, no refactors outside the five findings.
  - Verification: commands in Final verification wave.
  - Acceptance criteria: all green; `git status` clean after commits.
  - QA scenarios: tee combined output to `.omo/evidence/fix-provenance-pipeline/task-6-fix-provenance-pipeline.log`.
  - Commit: Y (only if fixes needed) | `fix(chargen): provenance pipeline regression sweep`

## Final verification wave

> Runs in parallel after ALL todos. ALL must APPROVE. Record verdicts in `## Execution Record` as `F#<n>: APPROVE|REJECT — <evidence>`.

- [ ] F1. Web unit suites: `pnpm --filter web test -- ydoc muster-out EntitySpawnForm term-resolution-narrative chargen-flow-integration` → exit 0, all new test names present in output. Evidence: tee to `.omo/evidence/fix-provenance-pipeline/final-web.log`.
- [ ] F2. Server export test: `docker compose up -d && pnpm --filter server test -- export` → exit 0. Evidence: `.omo/evidence/fix-provenance-pipeline/final-server.log`.
- [ ] F3. Typecheck: `pnpm typecheck` (Turbo, all packages) → exit 0, zero new errors. Evidence: `.omo/evidence/fix-provenance-pipeline/final-typecheck.log`.
- [ ] F4. Export path end-to-end assertion: with the server running (ports 18121/18122), seed a campaign doc containing an npc node with provenance (test fixture or via Y.Doc update), then `curl -s http://localhost:18122/api/export/json?campaignId=<id> | jq '.actors[].flags.highport.provenance'` → at least one non-null provenance object with `source` and `status`. If a live-server curl is not feasible in the executor environment, F2's route-level test asserting the serialized payload (parse the returned object in the vitest and assert `flags.highport.provenance` + top-level `provenance`) is the accepted substitute — record which was used. Evidence: `.omo/evidence/fix-provenance-pipeline/final-export-check.log`.
- [ ] F5. Scope fidelity + plan-compliance audit: `git diff <baseline>..HEAD` touches ONLY the files named in todos 1–5 (plus tests); no Plan A/D seams modified; no `as any`/`@ts-ignore` added; Must-NOT-Have list respected.

## Commit strategy

One commit per todo (test-first todos get two: failing test, then fix). Conventional commits, `fix(chargen)`/`fix(graph)`/`fix(export)`/`test(chargen)` scopes. Branch: `agent/prometheus/fix-provenance-pipeline` off current main (check `git log --since='2 hours ago'` for concurrent Plan A/D activity first; rebase before merging). Merge with `--no-ff` when green; push per Tier A standing authorization.

## Success criteria

- All 5 findings fixed with regression coverage; both CRITICALs proven by failing-test-first history.
- Live legacy docs (nodes without provenance) keep loading with `provenance: undefined`.
- GM resolutions are never overwritten by forced muster-out; players see GM-edited text after sync.
- Exported JSON and Foundry payloads carry provenance; spawn refs carry `derivedFrom`.
- `pnpm typecheck` exit 0; all targeted vitest suites green.

## Execution Record

Execution baseline: c20ab52e78e504d8ec6164edba8d871246c0502c (branch agent/sisyphus/chargen-fix-b, on top of merged Plan C)

<!-- F-box verdicts recorded by the orchestrator, 2026-10-25 -->

F#1: APPROVE — bash `pnpm --filter @highport/web test -- ydoc muster-out EntitySpawnForm term-resolution-narrative chargen-flow-integration` exit 0; 5 files / 40 tests passed
F#2: APPROVE — bash `docker compose up -d && pnpm --filter @highport/server test -- export` exit 0; 18 passed
F#3: APPROVE — bash `pnpm typecheck` exit 0; Turbo 6/6 tasks successful
F#4: APPROVE — sanctioned substitute per plan: export.test.ts:151-168 exercises GET /api/export/json via fastify.inject and asserts top-level provenance + flags.highport.provenance on serialized payload + legacy-node backcompat
F#5: APPROVE — git diff c20ab52..branch touches ONLY todo 1-5 files + tests + plan/state docs; no as any/@ts-ignore added; spawn transactions and Plan C authz untouched
