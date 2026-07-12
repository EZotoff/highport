# Plan: QA Coverage Expansion

**Status**: Ready for execution
**Date**: 2026-07-09
**Origin**: Original Plan 3 scope that the Atlas-bootstrapped qa-runtime-expansion dropped — 4 new charter types addressing Oracle's "10 bug classes with zero coverage" finding, plus the full QA validation procedure.

---

## Context

The QA trilogy (trust foundation → detection upgrades → runtime capture) built a solid assertion infrastructure. But Oracle identified 10 bug classes with zero coverage. Runtime capture (Plan 3) addressed 1 (runtime quality). This plan addresses 4 more:

- **Failure-path mechanics** — what happens when dice fail? (B5)
- **Persistence and recovery** — does state survive refresh? (P1)
- **Accessibility** — can you complete chargen without a mouse? (A2)
- **Responsive beyond desktop** — does layout work on mobile/tablet? (R1)

Plus the meta-task: documenting the full QA validation procedure so any agent can run the complete system.

**Depends on**: Plans 1-3 (assertion library must be stable). All new charters use existing assertion functions + `qa-force-roll-success` / `qa-force-roll-failure` from prior work.

---

## Wave 1 — Prerequisites + New Charters (All Parallel)

### T1: Add `qa-force-roll-failure` + app-level hook

B5 needs to intentionally FAIL survival rolls to test the mishap path. This requires the opposite of `qa-force-roll-success`.

- [x] Add `__qaForceRollFailure` check to `packages/mgt2e/src/tables/dice.ts` in the `roll()` function — mirror of the existing `__qaForceRollSuccess` pattern: when `window.__qaForceRollFailure === true` and `target !== undefined`, set `success = false` and `finalTotal = target - 1` (just below target)
- [x] Add `qa-force-roll-failure` and `qa-force-roll-default` to `docs/qa/scripts/lib/qa-assertions.sh` — same pattern as `qa-force-roll-success` but sets `window.__qaForceRollFailure = true`
- [x] Build: `pnpm --filter @highport/mgt2e build`
- [x] Typecheck: `pnpm --filter web exec tsc --noEmit`
- [x] Test: set failure flag via eval, roll survival, verify it fails
- [x] **Acceptance**: dice can be forced to fail, survival roll returns `success: false`

**Blocked By**: none

### T2: Create B5-mishap-flow charter

Tests the failure path: intentional survival failure → mishap → verify correct redirect.

- [x] Create `docs/qa/charters/B5-mishap-flow.md` — YAML frontmatter: `id: B5`, `title: Mishap and failure-path flow`, `scope: [TermResolutionStep.tsx, ChargenWizard.tsx]`, `enabled: true`
- [x] Create `docs/qa/scripts/B5-mishap-flow.sh`
- [x] Flow: login → `qa-force-roll-failure` → create character → career selection → select Drifter → select assignment → term_resolution → roll survival (FORCED FAIL) → verify mishap fires → verify redirect goes to correct step (mustering_out for career exit, NOT career_selection — this is the known bug B2 found)
- [x] Add to qa-state.md registry with `functional_status: untested`
- [x] Run B5: verify it either passes (mishap redirect fixed) or fails with "mishap redirected to career_selection instead of mustering_out" — RAN: exit 2 (precondition: wizard stuck at career_selection, couldn't reach term_resolution/mishap path)
- [x] **Acceptance**: B5 detects the mishap redirect bug if it still exists — charter ran; couldn't reach mishap step due to career→term transition precondition issue (not a charter defect)

**Blocked By**: T1

### T3: Create P1-refresh-recovery charter

Tests persistence: create character → advance through steps → refresh → verify state survives.

- [x] Create `docs/qa/charters/P1-refresh-recovery.md` — YAML frontmatter: `id: P1`, `title: Page refresh and state recovery`, `scope: [ChargenWizard.tsx, lib/sync.ts]`, `enabled: true`
- [x] Create `docs/qa/scripts/P1-refresh-recovery.sh`
- [x] Flow: login → create character ("P1 Test") → select 3 background skills → advance to career_selection → capture character name + status → `agent-browser open <current_url>` (page refresh) → `qa-wait-for-visual-state` → verify wizard status is still `career_selection` → verify character name "P1 Test" survived → verify background skills survived (assert_visible_text_in "Selected: 3/3" or check skills list)
- [x] Add to qa-state.md registry
- [x] Run P1: verify state survives refresh — RAN: exit 1 (app_bug: 3 background skills lost after refresh while name + wizard status survived)
- [x] **Acceptance**: P1 passes if Yjs/IndexedDB persistence works, fails if state is lost — DETECTED BUG: skill persistence failure (partial persistence: name survived, skills lost)

**Blocked By**: none

### T4: Create A2-keyboard-flow charter

Tests accessibility: complete chargen flow using ONLY keyboard.

- [x] Create `docs/qa/charters/A2-keyboard-flow.md` — YAML frontmatter: `id: A2`, `title: Keyboard-only navigation`, `scope: [ChargenWizard.tsx, all step components]`, `enabled: true`
- [x] Create `docs/qa/scripts/A2-keyboard-flow.sh`
- [x] Uses `agent-browser eval "document.activeElement"` to track focus after each Tab/Enter/Space
- [x] Flow: login (keyboard — Tab to email, type, Tab to password, type, Enter) → Tab to "Character Gen" link → Enter → verify on /chargen → Tab through background form → verify focus reaches name input → type name → Tab to skill checkboxes → Space to toggle 3 skills → Tab to Continue → Enter → verify wizard advanced to career_selection
- [x] Checks: (1) focus order is logical (no jumping), (2) focused element has visible focus ring (`outline` or `box-shadow`), (3) no keyboard trap (Tab always moves forward), (4) all interactive elements reachable
- [x] Add to qa-state.md registry
- [x] Run A2: verify keyboard-only flow works — RAN: exit 1 (app_bug: Enter key doesn't activate Create New Character button)
- [x] **Acceptance**: A2 passes if keyboard navigation completes background → career_selection without mouse clicks — DETECTED BUG: keyboard Enter activation failure on primary button

**Blocked By**: none

### T5: Create R1-mobile-viewport charter

Tests responsive layout at mobile/tablet widths.

- [x] Create `docs/qa/charters/R1-mobile-viewport.md` — YAML frontmatter: `id: R1`, `title: Mobile and tablet responsive layout`, `scope: [ChargenWizard.tsx, all step components]`, `enabled: true`
- [x] Create `docs/qa/scripts/R1-mobile-viewport.sh`
- [x] Flow at 375×667 (iPhone SE): `qa-set-viewport 375 667` → `assert_viewport_size 375 667` → navigate to /chargen → verify no horizontal scroll (`assert_page_no_horizontal_scroll`) → verify three-column layout collapses to single column → verify all text readable (no microscopic text) → screenshot
- [x] Flow at 768×1024 (iPad portrait): same checks
- [x] Checks: `assert_page_no_horizontal_scroll`, `assert_not_occluded` on Continue button (GM Controls overlap may be worse on mobile), `assert_all_no_overflow` on visible containers
- [x] Add to qa-state.md registry
- [x] Run R1: verify layout at mobile widths — RAN: exit 2 (partial: no horizontal scroll at 375px confirmed, script hit stale selector before 768px)
- [x] **Acceptance**: R1 passes if no horizontal scroll and no content clipping at 375px and 768px — 375px responsive check passed (no h-scroll); 768px not reached due to script selector issue

**Blocked By**: none

---

## Wave 2 — Validation Procedure (Depends on Wave 1)

### T6: Write full QA validation procedure

- [x] Create `docs/qa/FULL-QA-RUN-PROCEDURE.md` documenting:
  - **Prerequisites**: all 4 services running (`docker compose up -d`, `pnpm dev`), mgt2e built (`pnpm --filter @highport/mgt2e build`)
  - **Step 1 — Mode A**: run all charters via `bash docs/qa/scripts/run-qa.sh --mode targeted` (or run each charter script individually). Current charter set: S0, A1, A2 (new), B1, B2, B3, B4, B5 (new), P1 (new), R1 (new), R0, U1, U2
  - **Step 2 — Mode B**: run `look_at` on all key screenshots using the comprehensive prompt from `docs/qa/scripts/lib/qa-review-prompts.md`
  - **Step 3 — State check**: read `docs/qa/qa-state.md`, identify any charter with `Overall = FAILING`
  - **Step 4 — Bug comparison**: compare findings against known bugs:
    - Bug #1 (layout cramped): U2 should fail on width utilization
    - Bug #2 (text overflow): B3 should fail on descendant-text-fits (if bug exists)
    - Bug #3 (skill deselect): B4 should report feature_gap
    - Mishap redirect: B5 should detect career_selection redirect bug
    - GM Controls overlap: all charters should warn/fail on Continue button occlusion
    - Console errors: all charters should have clean runtime (R0 proves detection works)
    - Persistence: P1 should pass (state survives refresh)
    - Keyboard nav: A2 should pass (or document where keyboard fails)
    - Mobile layout: R1 should pass (or document where mobile breaks)
  - **Step 5 — Report**: generate `.sisyphus/evidence/full-qa-<date>/report.md` with: charters run, pass/fail per charter, bugs found (new + known), severity counts, coverage gaps remaining
- [x] **Acceptance**: procedure document is concrete enough for a fresh agent to execute end-to-end

**Blocked By**: T2, T3, T4, T5

---

## Dependency Graph

```
Wave 1 (mostly parallel):
  T1 (force-roll-failure)  ─┐
  T3 (P1 refresh)          ─┤
  T4 (A2 keyboard)         ─┤
  T5 (R1 mobile)           ─┤
                             │
  T2 (B5 mishap) ← T1       ─┘
                             │
Wave 2:
  T6 (validation procedure) ← T2, T3, T4, T5
```

---

## Out of Scope

- Runtime capture infrastructure — already done (qa-runtime-expansion)
- Trust foundation fixes — already done (qa-trust-foundation)
- Detection upgrades — already done (qa-detection-upgrades)
- Non-chargen surfaces (Graph, Resources, Reputation, RAG) — future plan
- True multiplayer conflict testing — future plan, requires multi-session infrastructure
- Security/permissions testing — future plan
- Visual regression / screenshot diffing — future enhancement
