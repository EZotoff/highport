# Plan: QA Maintenance + Depth Expansion

**Status**: Ready for execution
**Date**: 2026-07-09
**Origin**: Full QA run 2026-07-09 found 3 charters with stale selectors (data-testid attributes never committed to git), plus Oracle's remaining depth gaps (career/rules matrix, multiplayer conflicts)

---

## Context

Three independent work areas:

1. **Maintenance**: 15+ data-testid attributes were added during qa-systematic-fixes but never committed to git. Subsequent plan executions overwrote the files, losing them. Three charters (B3, R1, U2) now fail with precondition errors because selectors don't resolve.
2. **Career depth**: All QA charters use Drifter (the simplest career). Oracle flagged "game rules correctness" and "failure-path mechanics" as uncovered. Need charters testing careers with different survival targets, skill tables, ranks, and events.
3. **Multiplayer depth**: A1/B1 test basic presence and entity sharing. No charter tests simultaneous edits, reconnect, or CRDT merge conflicts.

---

## Wave 1 — Fix Stale Selectors (Parallel, No Dependencies)

### T1: Re-add missing data-testid attributes to chargen components

These testids were designed in qa-systematic-fixes T4/T5, verified working during plan execution, but never committed. They need to be re-added to the actual component source files.

- [x] `ChargenWizard.tsx`: add `data-testid="main-content"` to the center content div (the one wrapping renderStepContent + Continue/Back buttons)
- [x] `CharacterPreview.tsx`: add `data-testid="character-preview"` to root, `data-testid="character-skills"` to skills section, `data-testid="character-characteristics"` to characteristics section
- [x] `CareerSelectionStep.tsx`: add `data-testid="career-card"` to each career card element (the component that renders each career with its "Try to Join" button)
- [x] `TermResolutionStep.tsx`: add `data-testid="skill-table-container"` to the container wrapping all skill table sections; add `data-testid="skill-table-personal-development"`, `data-testid="skill-table-service-skills"`, `data-testid="skill-table-assignment-skills"` to each table section; add `data-testid="skill-table-advanced-education"` and `data-testid="skill-table-officer"` where applicable
- [x] `BackgroundStep.tsx`: add `data-testid="background-skill-selector"` to the skill selection area
- [x] `VerbositySelector.tsx`: add `data-testid="verbosity-selector"` to root
- [x] `LifepathTimeline.tsx`: add `data-testid="lifepath-timeline"` to root
- [x] Verify: `pnpm --filter web exec tsc --noEmit` passes
- [x] Verify: `agent-browser eval "document.querySelector('[data-testid=main-content]') !== null"` returns true after `pnpm dev` restart
- [x] **Commit immediately**: `git add -A && git commit -m "fix(qa): re-add data-testid attributes lost during plan execution"`
- [x] **Acceptance**: all 15+ testids present in DOM, typecheck passes, committed to git

**Blocked By**: none

### T2: Fix B3 charter selectors

- [x] Verify `[data-testid=skill-table-container]` now resolves (after T1)
- [x] If any selector in B3 still doesn't match, update it to match the actual DOM
- [x] Run B3: verify it reaches skill training and captures correct screenshots
- [x] **Acceptance**: B3 exits 0 (or exits 1 with a real app bug, not precondition failure)

**Blocked By**: T1

### T3: Fix U2 charter selectors

- [x] Verify `[data-testid=main-content]` and `[data-testid=career-card]` now resolve (after T1)
- [x] Remove the `|| true` on CharacterPreview overflow check (line 64) — replace with `_warn` variant
- [x] Run U2: verify viewport assertions pass and width utilization is measured
- [x] **Acceptance**: U2 exits 0 or exits 1 with a real app bug (not precondition failure)

**Blocked By**: T1

### T4: Fix R1 charter selectors

- [x] Verify `[data-testid="main-content"]` resolves (after T1)
- [x] Fix the `> div:last-child > button:last-child` descendant selector for Continue button — use a more robust selector
- [x] Run R1 at 375×667 and 768×1024: verify no precondition failures
- [x] **Acceptance**: R1 runs without precondition failures at both mobile widths

**BlockedBy**: T1

---

## Wave 2 — Career/Rules Matrix (Parallel, No Dependencies on Wave 1)

### T5: Create parameterized career charter `C1-career-matrix.sh`

Instead of one charter per career (12 careers × huge scope), create ONE parameterized charter that takes a career name as argument and tests that career's specific mechanics.

- [x] Create `docs/qa/scripts/C1-career-matrix.sh` that accepts `CAREER=<name>` as an environment variable
- [x] For the given career, test:
  - Qualification roll works (with `qa-force-roll-success`)
  - Survival target is correct for the career's primary characteristic
  - Skill tables render with career-specific skills (not Drifter's)
  - Rank progression works (if career has ranks)
  - Events fire with career-specific content
  - Mustering out produces career-specific benefits
- [x] Create `docs/qa/charters/C1-career-matrix.md` documenting the parameterized approach
- [x] Add scope covering all career-related source files
- [x] Test with 4 representative careers: **Army** (high survival target, military ranks), **Navy** (officer path), **Merchant** (ship shares mustering-out benefit), **Scholar** (INT-based survival)
- [x] Add C1 to qa-state.md with `functional_status: untested`
- [x] **Acceptance**: C1 runs successfully for at least 2 of the 4 test careers, detecting career-specific issues if they exist

**BlockedBy**: none

### T6: Create game-rules verification charter `G1-rules-integrity.sh`

Tests that the game mechanics produce correct results, not just that the UI works.

- [x] Create `docs/qa/scripts/G1-rules-integrity.sh`
- [x] Test specific mechanical outcomes:
  - Survival roll: with `qa-force-roll-success`, verify the success margin is calculated correctly (total >= target)
  - Skill gain: after rolling on a table, verify exactly one skill is added at level 0→1 or incremented
  - Characteristic modifiers: verify `getCharacteristicModifier` produces correct DMs (e.g., stat 7 = +0, stat 8 = +1, stat 2 = -2)
  - Advancement: after passing advancement roll, verify rank increases by 1
  - Aging: after enough terms, verify aging roll fires and modifies characteristics
- [x] Uses `agent-browser eval` to inspect the Yjs document state and verify mechanical correctness
- [x] Create `docs/qa/charters/G1-rules-integrity.md`
- [x] Add G1 to qa-state.md
- [x] **Acceptance**: G1 verifies at least 4 mechanical outcomes produce correct results

**BlockedBy**: none

---

## Wave 3 — Multiplayer Conflict Testing (Depends on nothing but services)

### T7: Create multiplayer conflict charter `M1-conflict-resolution.sh`

Tests simultaneous edits, CRDT merge, and conflict resolution.

- [x] Create `docs/qa/scripts/M1-conflict-resolution.sh`
- [x] Uses two agent-browser sessions (`qa-session-alpha` and `qa-session-bravo`)
- [x] Flow:
  1. Alpha creates a character and shares invite link
  2. Bravo joins via invite link
  3. Both sessions see each other's characters in the participant panel
  4. Alpha selects background skills — verify Bravo sees the update within 2s
  5. Both sessions advance wizard independently — verify no state corruption
  6. Alpha creates a second character — verify Bravo's entity pool updates
  7. Bravo deletes their character — verify Alpha sees removal
- [x] Checks: entity pool consistency, participant panel sync, no duplicate entities, no lost updates
- [x] Create `docs/qa/charters/M1-conflict-resolution.md`
- [x] Add M1 to qa-state.md
- [~] **Acceptance**: M1 verifies real-time sync works in both directions without data loss (blocked: script precondition gate — skill 'Deception' not found in current background skill list; charter opened 2 sessions and detected sync warnings but couldn't complete full flow)

**BlockedBy**: none

### T8: Create reconnect/recovery charter `M2-reconnect.sh`

Tests what happens when a client disconnects and reconnects.

- [x] Create `docs/qa/scripts/M2-reconnect.sh`
- [x] Flow:
  1. Session alpha creates character, advances to career_selection
  2. Close alpha's browser session (`agent-browser --session alpha close`)
  3. Wait 3s
  4. Reopen alpha's session (`agent-browser --session alpha open <url>`)
  5. Login again
  6. Navigate to /chargen
  7. Verify: character still exists, wizard status is career_selection, background skills preserved
  8. Verify: can continue from where left off (click Continue, verify advances to term_resolution)
- [x] Checks: Hocuspocus reconnect, Yjs state recovery, no session-state loss
- [x] Create `docs/qa/charters/M2-reconnect.md`
- [x] Add M2 to qa-state.md
- [~] **Acceptance**: M2 verifies the app recovers from disconnect without data loss (blocked: script precondition gate — NextAuth session cookie persists across browser close/reopen, so login page is not shown; script needs to handle persistent sessions or explicitly logout before reconnect)

**BlockedBy**: none

---

## Dependency Graph

```
Wave 1 (maintenance — sequential within, parallel across):
  T1 (re-add testids) ──┬── T2 (fix B3 selectors)
                        ├── T3 (fix U2 selectors)
                        └── T4 (fix R1 selectors)

Wave 2 (career depth — parallel, independent):
  T5 (career matrix charter)
  T6 (rules integrity charter)

Wave 3 (multiplayer depth — parallel, independent):
  T7 (conflict resolution charter)
  T8 (reconnect charter)
```

All three waves are independent of each other. Waves 2 and 3 can run in parallel with Wave 1.

---

## Out of Scope

- Non-chargen surfaces (Graph, Resources, Reputation, RAG) — future plan
- Security/permissions testing — future plan
- Visual regression / screenshot diffing — future enhancement
- Full 12-career matrix (this plan tests 4 representative careers)
- Mobile performance testing (frame rate, memory) — future
