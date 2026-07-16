# Learnings — phase3-5-remediation

Cumulative memory for stateless subagents. Append-only.

## Project Context

- Highport: MGT2E Traveller companion. Monorepo: apps/web (Next.js, TS, vitest), apps/rag-service (Python FastAPI, pytest), apps/server (Fastify).
- Real-time sync via Yjs + Hocuspocus. All shared proposal/approval state MUST live in the Yjs document.
- Verification: `npx tsc -p apps/web/tsconfig.json --noEmit` (0 errors); `pnpm --filter web test -- --run`; `cd apps/rag-service && python -m pytest tests/ -q`.

## Inherited Wisdom (from phase3-5-post-chargen-and-gm-gate)

- snake_case transformation: Frontend camelCase -> backend snake_case. Transform request bodies in narrative.ts before sending.
- Dependency injection: global set_dependencies()/clear_dependencies() in routers/narrative.py for easy testing.
- connectionRequests Yjs map is the proven pattern for proposal queues — mirror it.
- AIProvenance<T> wrapper for all AI outputs.
- The prior plan's work was NEVER committed — all changes are in the working tree.
- `updateCharacterFields` exists in state.ts:214 (verified).

## Task 1-3 Salvage commits

- 3 commits created from productive scope creep in working tree:
  - `52e3fba` — refactor(chargen): compact UI density pass (4 files)
  - `6349873` — fix(server): register portrait routes + handle network failures (2 files)
  - `3b3dc3f` — docs: correct CONCEPT and ROADMAP with gap analysis findings (2 files)
- All other ~24 modified files remain in working tree untouched
- Evidence saved to `.omo/evidence/phase3-5-remediation/task-1-3-salvage.txt`
- `npx tsc -p apps/web/tsconfig.json --noEmit` exits 0 (verified after commit 1)
- `pnpm --filter server build` succeeds (verified after commit 2)

## Tasks 5-6 — Narrative scope, persistence, and error handling

- Narrative scope construction now mirrors `routers/query.py`: start with `public`, add `gm` only for `X-Is-GM: true`, and add `char:<id>` plus `party` when `X-Character-Id` is present.
- `_retrieve_context` receives caller scope instead of hardcoding GM access; lifepath and cross-character route tests cover both non-GM and GM scope arguments.
- The new narrative routes translate generator `RuntimeError`/`ValueError` into HTTP 503 while valid empty proposal lists remain HTTP 200.
- The new web clients send `X-Is-GM` and `X-Character-Id`; network `TypeError` now becomes `RagUnavailableError` rather than an empty list.
- Lifepath review freshness is persisted on `ChargenCharacter` as `reviewVersion` and `lastReviewedFingerprint`; the fingerprint serializes terms (including rank fields), skill levels, and chapters. Yjs reconstruction and snapshot restore preserve both fields.
- Verification: web TypeScript passed; the full web suite passed after the production changes (236 tests), and the added snapshot regression brought the final count to 237; focused persistence passed 4/4.
- RAG verification is 87 passed / 1 failed. The sole failure is the task-4 integration payload without `character.id`: `CharacterSummary.id` remains required in `apps/rag-service/schemas/narrative.py`. That file was explicitly out of scope and was not modified.

## Task 7 — CRDT-safe proposal storage

- `lifepathProposals` and `crossCharacterLinks` now use ID-keyed `Y.Map<Y.Map<unknown>>` collections; each proposal field is independently mutable without array delete/insert replacement.
- Hook readers observe the maps deeply and reconstruct their existing POJO array return types from `ymap.values()`; `connectionRequests` remains on `Y.Array`.
- `acceptedBy` needs its own nested Y.Map keyed by character ID. A plain array assigned to the proposal map's `acceptedBy` key is still last-writer-wins under disconnected concurrent edits and loses one acceptance.
- The two-document regression seeds a shared proposal, accepts independently on each document, exchanges Yjs updates, and verifies both documents converge on one proposal containing both character IDs.
- RED evidence: the old arrays produced two duplicate proposals after merge and failed both map-shape assertions. GREEN evidence: focused proposal tests passed 15/15; `npx tsc -p apps/web/tsconfig.json --noEmit` passed; full web suite passed 238/238.

## Task 12 -- Character-scoped lifepath proposals

- Added `characterId?: string` field to `LifepathProposal` interface in types.ts. Optional for backward compatibility.
- `yMapToLifepathProposal` in state.ts reads `characterId` as string | undefined; old proposals without the field return undefined (visible to everyone).
- `addLifepathProposal` stamps characterId via spread; no signature change needed since field is optional.
- `useLifepathProposals(characterId?: string)` hook: when characterId provided, filters p.characterId === characterId || p.characterId === undefined. When omitted, returns all (backward compat).
- FinalizeStep.tsx passes characterId to hook and stamps character.id in each addLifepathProposal call.
- Added 3 tests in chargen-proposals.test.ts: roundtrip, backward compat, and application-layer filter logic.
- Call sites: only FinalizeStep.tsx calls useLifepathProposals; lifepath-review.test.tsx mock (vi.fn) remains compatible.
- Verification: npx tsc passes 0 errors; full web suite 33/33 files, 241/241 tests (3 new).

## Task 9 — GM Pending AI Review panel

- Added `resolveAIDraft()` to `state.ts`: scans character terms for first `pendingReviewBy: 'gm'` on the given `fieldPath`, applies accept/reject/edit in a `doc.transact()`, clears `pendingReviewBy` to `null`. Returns `boolean`.
- `AIProvenance.source` type is `'ai' | 'dice' | 'player' | 'gm'` — `'edited'` is NOT in the union. When editing a draft, set `source: 'gm'` (the GM is the editor).
- Added `PendingAIDraft` interface to GMControlPanel.tsx — collects characterId, characterName, termNumber, fieldPath, fieldType, and value from all characters' terms.
- New `Pending AI Review` section mirrors existing section structure (SciFiButton, glass-panel styling, Edit→textarea→Save/Cancel flow). Accept/Reject buttons for drafts.
- The `pendingAIDrafts` memo uses `useMemo` with `allCharacters` dependency — re-scans only when character list changes.
- `CareerTermResult` has no index signature, so `term[fieldPath]` requires `as const` iteration or a switch/if on literal values. Used `if (fieldPath === 'eventDescription')` pattern.
- Added 4 tests in GMControlPanel.test.tsx: renders panel with pending draft + Accept clears pendingReviewBy; reject sets status 'rejected'; resolveAIDraft returns false for missing char; resolveAIDraft returns false when no pending draft.
- Verification: `npx tsc -p apps/web/tsconfig.json --noEmit` exits 0; `pnpm --filter web test -- --run` passes 33/33 files, 245/245 tests.

## Task 11 — Player-to-player cross-character link auto-generation

- Added `useEffect` trigger in [FinalizeStep.tsx](file:///home/ezotoff/AI_projects/traveller/apps/web/components/chargen/steps/FinalizeStep.tsx) for player-to-player mode.
- Guards: `crossCharacterLinkMode === 'player-to-player'`, character is finalized, 2+ finalized characters exist.
- Dedup: `useRef` tracks last generated fingerprint (sorted finalized character IDs); existing links check ensures no re-generation when all finalized chars are already covered by non-rejected links.
- On failure, resets fingerprint to `null` so retry happens on next trigger (e.g., when another character finalizes).
- Uses `generateCrossCharacterLinks()` from narrative API directly (not the hook) to access returned proposals for Yjs persistence via `addCrossCharacterLink()`.
- Imports `findSharedHistory` from `../lib/graph/shared-history` to build the shared-history argument.
- Test fix: added `useAllCharacters`, `useCrossCharacterLinks` mocks to `lifepath-review.test.tsx` hooks mock; added `addCrossCharacterLink` to state mock; added narrative and shared-history mocks. 7 tests restored to green.
- Verification: `npx tsc -p apps/web/tsconfig.json --noEmit` — 0 errors in FinalizeStep.tsx; `pnpm --filter web test -- --run` — 31/33 files pass (240/245 tests). 2 failing files (`GMControlPanel.test.tsx`, `useNarrative.test.ts`) are pre-existing task-10 and import issues.

## Task 10 -- Persist cross-character proposals to Yjs at generation time

- Removed local React state cache (proposals useState) from useCrossCharacterLinks in useNarrative.ts. The hook now writes generated proposals directly to Yjs via addCrossCharacterLink with status: pending.
- Dedup logic before insertion: checks existing Yjs links by composite key (sourceCharId|targetCharId|relationship) to prevent duplicates on re-generation.
- useCrossCharacterLinks now returns { isLoading, error, refresh } (no proposals). Return type change breaks consumers that destructure proposals.

## Task 13 — Persist mishap provenance before display (strict-mode leak fix)

- `handleGenerateMishapDescription` was missing Yjs persistence — only set local React state.
- Added getYDoc() → clone terms → create AIProvenance → update term → updateCharacterFields.
- Provenance stamped with `pendingReviewBy: 'gm'` for strict/moderate modes, `null` for lenient.
- Pattern matches `handleGenerateDescription` (event narrative) at lines 602-621 exactly.
- Test uses mutable vi.hoisted mocks (`narrativeAvailable`, `mishapGenerateResult`, `useGMControls`).
- createMishapCharacter uses END 2 + setRandomSeed(1) to guarantee survival failure.
- `shouldShowDraft` is correct — the bug was that provenance was undefined at render time.
- Verification: npx tsc exits 0; full web suite 33/33 files, 254/254 tests.
- Evidence: `.omo/evidence/phase3-5-remediation/task-13.txt`.
- GMControlPanel.tsx now reads pending proposals from Yjs only: yjsProposals.filter(p => p.status === 'pending'). Removed the source-of-truth split between generated local state and Yjs state.
- handleAcceptProposal: no longer calls addCrossCharacterLink (proposal already in Yjs). Uses proposal.id directly with resolveCrossCharacterLink. Edited descriptions are written to the existing Y.Map entry via getCrossCharacterLinksMap.
- handleRejectProposal: no longer calls addCrossCharacterLink. Uses proposal.id directly with resolveCrossCharacterLink(doc, proposal.id, false).
- CrossCharacterProposalList.tsx (player-to-player UI) is unaffected -- it already reads from the Yjs hook in hooks.ts.
- Removed addCrossCharacterLink import from GMControlPanel.tsx; added getCrossCharacterLinksMap import for edit-update flow.
- Tests updated: useNarrative.test.ts now mocks getYDoc/addCrossCharacterLink and verifies Yjs writes. GMControlPanel.test.tsx now puts proposals directly in Yjs via addCrossCharacterLink instead of mocking local state.
- Verification: npx tsc exits 0; pnpm test passes 33/33 files, 245/245 tests.

## Task 19 — Remove redundant old session flags

- Removed `requireGMApproval` and `allowCrossPlayerConnections` fields from `SessionSettings` interface and `DEFAULT_SESSION_SETTINGS` in [types.ts](file:///home/ezotoff/AI_projects/traveller/apps/web/lib/chargen/types.ts).
- Removed both checkbox toggle UIs from [GMControlPanel.tsx](file:///home/ezotoff/AI_projects/traveller/apps/web/components/chargen/GMControlPanel.tsx) — the "Require GM Approval" and "Cross-Player Connections" toggles (lines 226-260). Preserved the Lock Session toggle.
- Removed references from 4 test files: `chargen-state.test.ts` (7 changes incl. removing the entire "toggle requireGMApproval" test), `chargen-integration.test.ts` (8 changes), `GMControlPanel.test.tsx` (4 lines across 2 fixtures), `lifepath-review.test.tsx` (2 lines).
- Test count decreased from 245 to 244 (one test removed).
- Verification: `grep -rn 'requireGMApproval\|allowCrossPlayerConnections' apps/web/` returns zero matches; `npx tsc -p apps/web/tsconfig.json --noEmit` exits 0; `pnpm --filter web test -- --run` passes 33/33 files.
- No data migration needed — Yjs is schemaless; old sessions with these fields will have extra ignored data.

## Task 18 — Restore Service Record entry point in CharacterPreview

- Added Service Record button alongside Career Timeline in CharacterPreview.tsx
- Button and SciFiDialog mirror the existing timeline pattern: same theme (violet), variant (outline), size (sm)
- Service Record button only visible when `character.status === 'finalized'` (gated by `character.status === 'finalized'`)
- Both buttons sit in the same `space-y-2` container for consistent vertical rhythm
- ServiceRecord component receives `character.chapters` and `character.name` as props
- Dialog description mirrors timeline pattern: `"Name — N chapters of service"`
- Added `BookMarked` to lucide-react import; added `ServiceRecord` import
- State variables: `showTimeline` and `showServiceRecord` managed independently
- E2E test: added Service Record assertions after timeline modal assertions (button visible → click → modal heading/text visible → close)
- Verification: no TS errors in changed files; 32/33 test files pass (237/237 tests); pre-existing FinalizeStep.tsx syntax error blocks unrelated test
- Evidence saved to `.omo/evidence/phase3-5-remediation/task-18.txt`

## Task 17 — Remove `as any` from cross-character-proposals test

- Removed 4 `as any` casts and 2 `let edge: any` declarations from `cross-character-proposals.test.tsx`.
- Used `typeof import('../lib/ydoc')` for the `importActual` mock type parameter.
- Typed `mockCharacters` as `ChargenCharacter[]` with full fixture objects (all required fields).
- Typed `mockProposals` as `CrossCharacterLinkProposal[]` — already had all required fields.
- Typed `let edge: Y.Map<unknown>` with `= new Y.Map()` initialization to satisfy TS2454 definite-assignment.
- Added type imports for `ChargenCharacter` and `CrossCharacterLinkProposal` from `../lib/chargen/types`.
- Verification: grep returns zero matches for ` as any` / `: any`; tsc has zero errors in test file; 5/5 tests pass.
- Evidence saved to `.omo/evidence/phase3-5-remediation/task-17.txt`

## Task 15 — Route lifepath proposals through shouldShowDraft

- Added provenance construction + shouldShowDraft gating to pending proposals in FinalizeStep.tsx
- Pending proposals now show 'Pending GM Review...' placeholder in strict mode (non-GM)
- Moderate mode shows text with "Pending GM Approval" badge in header
- Lenient mode shows text directly (no badge for pending)
- Proposed edit hidden alongside description when text is gated
- 2 new tests in lifepath-review.test.tsx: strict hides text, lenient shows text
- Verification: tsc clean for modified files; 33/33 files, 246/246 tests pass
- Evidence saved to `.omo/evidence/phase3-5-remediation/task-15.txt`

## Task 14 — Block NPC submission of unreviewed drafts and preserve entity provenance

- Added `ProvenanceEntry` interface to `packages/shared/src/types/graph.ts` with fields: `source`, `status`, `pendingReviewBy`, `generatedAt`, `derivedFrom`. Added `provenance?: ProvenanceEntry` field to `GraphNode`.
- Added `provenance` field to `SpawnedEntityRef` in `apps/web/lib/chargen/types.ts` (same shape, inline to avoid cross-package dependency).
- Modified `spawnEntity()` in `entity-spawner.ts`: accepts optional `provenance?: ProvenanceEntry` in `SpawnEntityInput`, sets it on the `GraphNode`, and returns it in `SpawnedEntityRef`.
- Updated `EntitySpawnForm.tsx` `handleSubmit()`: extracts provenance fields from `nameProv` (source, status, pendingReviewBy, generatedAt, derivedFrom) and passes them to `spawnEntity()`.
- Added `submitDisabled` computed variable in EntitySpawnForm: `!nameProv?.value.trim() || (nameProv != null && requiresReview(nameProv, gmApprovalMode))`. This gates the Add button when `pendingReviewBy === 'gm'` in strict/moderate mode.
- In lenient mode, `aiProvenance()` sets `pendingReviewBy: null` and `status: 'accepted'`, so `requiresReview()` returns false and the button is always enabled.
- `shared` package must be rebuilt (`pnpm --filter @highport/shared build`) after type changes for the web app's tsc to pick up new exports.
- Added 6 tests to `chargen-flow-integration.test.ts`: provenance stored on node with source 'ai', backward compat (no provenance), submit disabled when pending GM review in strict mode, enabled after GM clears, enabled in lenient mode, enabled for player-entered names.
- Verification: `npx tsc -p apps/web/tsconfig.json --noEmit` exits 0; `pnpm --filter web test -- --run` passes 33/33 files, 252/252 tests (10 new).
- Evidence saved to `.omo/evidence/phase3-5-remediation/task-14.txt`.
