# Plan 2: QA Detection & State Model Upgrades

**Status**: Ready for execution (after Plan 1 completes)
**Date**: 2026-07-07
**Origin**: Oracle post-implementation review — layout assertions inspect only first element, state model can't represent real outcomes

---

## Context

Plan 1 fixed the trust foundation (assertions verify what they claim). This plan upgrades detection power: more assertion types (all-elements overflow, descendant text-fit, viewport containment, occlusion), stricter U2 checks (fail not warn), and a state model that can represent "functional pass + visual fail" without contradiction.

**Verification approach**: lightweight — run new assertions against known elements, verify state model changes. Full QA run happens separately after all 3 plans complete.

**Depends on**: Plan 1 (`qa-scroll-to`, `assert_viewport_size`, `qa-wait-for-visual-state` must exist)

---

## Wave 1 — New Layout Assertions (All Parallel)

### T1: Add `assert_all_no_overflow <selector> [label]`

- [x] Add function to `docs/qa/scripts/lib/qa-assertions.sh`
- [x] Implementation: uses `querySelectorAll` instead of `querySelector`, checks EVERY matching element, reports which ones overflow (by index or text content)
- [x] Exit 1 if ANY element overflows, listing all failing elements
- [x] Also add `assert_all_no_overflow_warn` variant (advisory)
- [x] Test: run against `[data-testid=career-card]` on career selection — should check ALL 12 cards, not just the first
- [x] **Acceptance**: function checks all matching elements, reports each failure individually

**Blocked By**: none

### T2: Add `assert_descendant_text_fits <container_selector> [label]`

- [x] Add function to `docs/qa/scripts/lib/qa-assertions.sh`
- [x] Implementation: for each text node descendant of the container, checks if the text's bounding rect fits within the container's content rect (accounting for padding). Uses a TreeWalker to find text nodes, `Range.getBoundingClientRect()` to measure text bounds.
- [x] Exit 1 if any text overflows its container, reporting the text content and container
- [x] Also add `_warn` variant
- [x] Test: run against `[data-testid=skill-table-container]` — should catch if "Personal Development" text overflows its button/container
- [x] **Acceptance**: function detects text that visually extends beyond its container even when `scrollWidth == clientWidth` (CSS overflow:hidden can mask scroll metrics)

**Blocked By**: none

### T3: Add `assert_in_viewport <selector> [label]`

- [x] Add function to `docs/qa/scripts/lib/qa-assertions.sh`
- [x] Implementation: checks `getBoundingClientRect()` against viewport bounds (top >= 0, left >= 0, bottom <= window.innerHeight, right <= window.innerWidth). Also checks `checkVisibility()` for display/visibility/opacity.
- [x] Exit 2 (qa_refuse) if element not in viewport — charters should `qa-scroll-to` first
- [x] Test: check a below-the-fold element (should refuse), scroll to it, check again (should pass)
- [x] **Acceptance**: function distinguishes "in DOM" from "in visible viewport"

**Blocked By**: none

### T4: Add `assert_not_occluded <selector> [label]`

- [x] Add function to `docs/qa/scripts/lib/qa-assertions.sh`
- [x] Implementation: uses `document.elementFromPoint(centerX, centerY)` at the center of the target element's bounding rect. If the returned element is NOT the target (or a descendant), the target is occluded.
- [x] Exit 1 if occluded, reporting what element is covering it
- [x] Also add `_warn` variant
- [x] Test: check the "Continue →" button — should detect if GM Controls bar covers it (the P0 bug found by Mode B)
- [x] **Acceptance**: function detects the GM Controls overlap on the Continue button

**Blocked By**: none

### T5: Add `assert_page_no_horizontal_scroll`

- [x] Add function to `docs/qa/scripts/lib/qa-assertions.sh`
- [x] Implementation: checks `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
- [x] Exit 1 if horizontal scroll exists (unwanted scrollbar)
- [x] Test: run at 1280px and 1920px — should pass if no horizontal overflow
- [x] **Acceptance**: function detects unwanted horizontal scrollbars

**Blocked By**: none

---

## Wave 2 — State Model Redesign (Depends on Wave 1)

### T6: Redesign `qa-state.md` to split functional/visual/evidence status

- [x] Redesign the state registry to track separate dimensions:
  - `functional_status`: passing / partial / failing / feature_gap / untested
  - `visual_status`: clean / warnings / failing / not_reviewed
  - `evidence_status`: complete / partial / missing / invalid
  - `infra_status`: healthy / degraded / down
  - `severity_counts`: {p0: N, p1: N, p2: N}
  - `exit_code`: last run's exit code
  - `last_run_id`: timestamp or run identifier
- [x] Store as machine-readable YAML frontmatter + human-readable Markdown table
- [x] A charter with functional=passing + visual=failing should NOT show as "passing" overall
- [x] Update all 9 charter rows with the new schema
- [x] **Acceptance**: state model can represent "functional pass + P0 visual fail" without contradiction

**Blocked By**: T1-T5 (new assertions inform what visual_status can detect)

### T7: Make U2 strict — fail on width utilization, not warn

- [x] Change `assert_utilizes_width_warn` to `assert_utilizes_width` (fatal, not advisory) for the main-content check at 1920px
- [x] Add `assert_all_no_overflow` on `[data-testid=career-card]` (all cards, not just first)
- [x] Add `assert_not_occluded` on the "Continue →" button (detect GM Controls overlap)
- [x] Add `assert_page_no_horizontal_scroll` at both viewports
- [x] Run U2: verify it now FAILS (exit 1) on the 43% width issue and/or GM Controls overlap
- [x] **Acceptance**: U2 exits 1 when Bug #1 exists, exits 0 only when layout genuinely passes

**Blocked By**: T1, T4, T5

### T8: Update B3 — add descendant text-fit check on skill tables

- [x] Add `assert_descendant_text_fits "[data-testid=skill-table-container]"` after scrolling to the skill training phase
- [x] Add `assert_all_no_overflow` on skill table buttons (`[data-testid^=skill-table-]`)
- [x] Run B3: verify it detects Bug #2 if the text overflow still exists
- [x] **Acceptance**: B3 either passes (Bug #2 was fixed) or fails with "text overflow in skill-table-container" (Bug #2 detected)

**Blocked By**: T1, T2

### T9: Update remaining charters — add occlusion check on Continue button

- [x] Add `assert_not_occluded_warn` on the "Continue →" button in S0, B1, B2, B4, A1
- [x] This detects the P0 GM Controls overlap across ALL charters, not just U2
- [x] **Acceptance**: all charters warn if the Continue button is occluded

**Blocked By**: T4

---

## Dependency Graph

```
Wave 1 (parallel):
  T1 (assert_all_no_overflow)      ─┐
  T2 (assert_descendant_text_fits) ─┤
  T3 (assert_in_viewport)          ─┤
  T4 (assert_not_occluded)         ─┤
  T5 (assert_page_no_horizontal_scroll) ─┘
                                    │
Wave 2 (depends on Wave 1):
  T6 (state model redesign) ← T1-T5
  T7 (U2 strict)           ← T1, T4, T5
  T8 (B3 text-fit)         ← T1, T2
  T9 (occlusion in all)    ← T4
```

---

## Out of Scope

- Trust foundation fixes (visual-state race, click-and-wait) — Plan 1
- Runtime capture (console/network) — Plan 3
- New charter templates — Plan 3
- Full QA run — separate, after all 3 plans
