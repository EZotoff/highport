---
id: E1
title: Exploratory visual QA
persona: player
timebox_minutes: 30
tags: [exploratory, visual-qa, layout, overflow, edge-cases]
enabled: true
xfail: false
scope:
  - apps/web/components/chargen/ChargenWizard.tsx
  - apps/web/components/chargen/steps/BackgroundStep.tsx
  - apps/web/components/chargen/steps/CareerSelectionStep.tsx
  - apps/web/components/chargen/steps/TermResolutionStep.tsx
  - apps/web/components/chargen/steps/SkillsStep.tsx
  - apps/web/components/chargen/steps/MusteringOutStep.tsx
  - apps/web/components/chargen/steps/FinalizeStep.tsx
  - apps/web/components/chargen/CharacterPreview.tsx
---

# Charter E1 — Exploratory Visual QA

## Mission

Freely drive the chargen wizard without a predetermined script, looking for visual defects across all steps and viewports. This is the inverse of a scripted charter — the agent explores organically, probes edge cases, and captures any visual issue discovered.

The goal is **discovery**, not pass/fail. Every finding — overflow, clipping, cramped layout, overlap, misalignment, wasted space — is a valuable result.

This charter covers:

- Free-form traversal of all wizard FSM states: background → career_selection → term_resolution → mustering_out → finalized
- Screenshot review at every step using the Comprehensive prompt from `qa-review-prompts.md`
- Viewport comparison: 1280×720 standard vs 1920×1080 wide
- Edge-case stress testing: long names, rapid clicking, back navigation, mid-flow refresh
- Layout assertions via `qa-assertions.sh` helpers (`assert_no_overflow`, `assert_utilizes_width`, `assert_screenshot_clean`)

## Preconditions

| Service    | Required |
| ---------- | -------- |
| web        | yes      |
| fastify    | yes      |
| hocuspocus | yes      |
| postgres   | yes      |
| rag        | optional |
| ollama     | optional |

If web, fastify, or hocuspocus is down → SKIP with reason `"services not running"`.

## Key Context

- **Prompt reference**: Use the **Comprehensive** prompt from `docs/qa/scripts/lib/qa-review-prompts.md` as the `goal` parameter for every `look_at` call on key screenshots. The Comprehensive prompt is:
  > "You are a QA engineer reviewing a web app screenshot. List every visual problem: text overflow, cramped layout, empty/wasted space, misaligned elements, text that doesn't fit in its container, overlapping elements, clipped content. Be specific about location and severity."
- **Assertion helpers** (in `docs/qa/scripts/lib/qa-assertions.sh`):
  - `assert_no_overflow(selector)` — checks element scrollWidth/scrollHeight against clientWidth/clientHeight
  - `assert_utilizes_width(selector, min_percent)` — checks element width as percentage of viewport
  - `assert_screenshot_clean(label)` — captures a full-page screenshot and logs a `REVIEW_NEEDED` entry for later batch review
- **Viewport notes**: The chargen wizard uses a responsive three-column grid: `grid-cols-1` below `lg`, and `lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]` at `lg` and above. At 1920×1080 the three-column layout is active.
- **FSM map**: `background → career_selection → term_resolution → mustering_out → finalized`. Only forward transitions are valid.
- **Key screenshots** are identified post-run by `docs/qa/scripts/lib/qa-key-screenshots.sh`. The charter should capture screenshots after every wizard state transition (Continue click or status assertion) and at viewport changes.

## Steps

### Phase 1: Standard Viewport Traversal (1280×720)

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
2. **Set viewport** to 1280×720
3. **Navigate** to `/chargen`
4. **Screenshot**: `screenshots/E1-01-chargen-start-1280.png`
5. **Click** "Create New Character"
6. **Explore** the Background step freely:
   - Read characteristics — are they laid out clearly?
   - Select up to 3 background skills — do checkboxes and labels fit?
   - **Screenshot**: `screenshots/E1-02-background-step-1280.png`
   - Run `look_at` with the Comprehensive prompt
   - Run `assert_no_overflow` on `.overflow-y-auto` in the wizard container
7. **Click** "Continue" to advance to career selection

8. **Explore** the CareerSelection step:
   - Scroll through available careers — do career cards overflow or clip?
   - Read career descriptions — is text readable or cramped?
   - **Screenshot**: `screenshots/E1-03-career-selection-1280.png`
   - Run `look_at` with the Comprehensive prompt
   - Select a career and assignment, then advance to term resolution

9. **Explore** the TermResolution step:
   - Click through at least one full term (skills → survival → event → advancement)
   - Observe all sub-phases — do buttons, labels, and roll results fit their containers?
   - **Screenshot** after advancement: `screenshots/E1-04-term-resolution-1280.png`
   - Run `look_at` with the Comprehensive prompt
   - Run `assert_no_overflow` on the active phase container
   - Advance to mustering out (re-enlist or leave career)

10. **Explore** the MusteringOut step:
    - Roll benefits — do result cards fit without overflow?
    - **Screenshot**: `screenshots/E1-05-mustering-out-1280.png`
    - Run `look_at` with the Comprehensive prompt
    - Advance to finalize

11. **Explore** the Finalize step:
    - Scroll the character sheet — any misalignment in the skill list, benefit grid, or term history?
    - **Screenshot**: `screenshots/E1-06-finalized-1280.png`
    - Run `look_at` with the Comprehensive prompt
    - Run `assert_no_overflow` on the character sheet container
    - Run `assert_screenshot_clean` "E1-finalized-1280"

### Phase 2: Wide Viewport Traversal (1920×1080)

12. **Set viewport** to 1920×1080
13. **Navigate** to `/chargen` fresh (or reset state to create a new character)
14. **Screenshot**: `screenshots/E1-07-chargen-start-1920.png`
15. Repeat steps 5–11, capturing an analogous screenshot set with `-1920` suffix:
    - `screenshots/E1-08-background-step-1920.png`
    - `screenshots/E1-09-career-selection-1920.png`
    - `screenshots/E1-10-term-resolution-1920.png`
    - `screenshots/E1-11-mustering-out-1920.png`
    - `screenshots/E1-12-finalized-1920.png`
16. At each step run `look_at` with the Comprehensive prompt **plus** the context prefix from `qa-review-prompts.md`:
    ```
    This is a Highport screenshot at 1920x1080. The current wizard step is {step}.
    ```
17. At the career selection step, run `assert_utilizes_width` on the main content column with `min_percent=30`
18. At the finalized step, run `assert_screenshot_clean` "E1-finalized-1920"

### Phase 3: Edge Case Stress Test

Test the following edge cases at **either viewport** (prefer 1280×720 for speed):

**Long character name** 19. Create a new character with a name of 50+ characters (e.g., "Commander Maximilian von Thundering-Herrschaft III") 20. **Screenshot**: `screenshots/E1-13-long-name.png` 21. Run `look_at` with the Comprehensive prompt — note any overflow, truncation, or layout breakage in name fields, the CharacterPreview panel, or the wizard header

**Rapid clicking** 22. On the Background step, rapidly click "Continue" 5+ times in quick succession 23. **Observe**: does the wizard skip ahead? Does the UI debounce the action? Any console errors? 24. **Screenshot**: `screenshots/E1-14-rapid-click.png`

**Back-button navigation** 25. After advancing to career selection, use the browser back button (or any visible "Back" UI) 26. **Observe**: does state persist? Does the UI recover gracefully? 27. **Screenshot**: `screenshots/E1-15-back-nav.png` 28. Advance back to career selection and proceed normally

**Mid-flow refresh** 29. At the term resolution step, **refresh** the page 30. **Observe**: does state survive (Yjs persistence)? Any flash of empty UI? 31. **Screenshot**: `screenshots/E1-16-refresh.png`

**Empty / unselected state** 32. Create a new character but do **not** select any background skills. Attempt to advance. 33. **Observe**: is there a validation message? Is it clearly visible? 34. **Screenshot**: `screenshots/E1-17-empty-selection.png`

**Max-length inputs** 35. In any text input (character name, etc.), paste or type the maximum allowed length 36. **Screenshot**: `screenshots/E1-18-max-input.png` 37. Run `assert_no_overflow` on the input's parent container

## Report Focus

After completing all phases, collect findings into a structured report. Every finding should reference the screenshot filename and describe the defect class:

### Overflow / Clipping

- Any text or UI element that extends beyond its visible container
- Horizontal scrollbar on any panel or container that shouldn't have one
- Character names, skill names, or button labels cut off

### Layout / Spacing

- Cramped content at 1280×720: panels that feel tight or have insufficient padding
- Excessive whitespace at 1920×1080: content that doesn't scale to fill the wider viewport
- BentoGrid that stays at 1-2 columns when 3+ columns would fit
- Text lines that exceed ~90 characters at wide viewport

### Overlap / Misalignment

- Buttons or controls that overlap or sit too close to adjacent elements
- Misaligned grid items, uneven card sizes, inconsistent gutters
- CharacterPreview or EntityPoolPanel elements that clash with wizard content

### Responsive / Viewport

- Layout that breaks or looks wrong only at one viewport
- Elements that shift position unexpectedly after a resize
- Panels that collapse, disappear, or change proportions incorrectly when resizing

### Edge Cases

- Long-name truncation or overflow
- Rapid-click leading to double-advance, skipped steps, or UI freezes
- Back-navigation causing state inconsistency or blank screens
- Page refresh losing or corrupting wizard state
- Empty-field validation: missing or unclear error messages
- Max-length input causing layout breakage

### Console / Runtime

- Record any JavaScript exceptions or React warnings observed during any phase
- Note if the page becomes non-responsive or the wizard gets stuck

## Pass Criteria

- All wizard steps (background → career_selection → term_resolution → mustering_out → finalized) were visited at both viewports
- Screenshots captured for every state transition at both viewports
- `look_at` Comprehensive prompt executed on all key screenshots
- Edge cases tested: long name, rapid click, back nav, refresh, empty selection, max input
- Findings documented per the Report Focus categories above
- `assert_no_overflow`, `assert_utilizes_width`, and `assert_screenshot_clean` were exercised at least once each

## Fail Criteria

- Any wizard step cannot be reached or viewed (blocked by a bug, not by choice)
- `look_at` cannot be executed (screenshot pipeline broken)
- Agent cannot navigate between viewports (browser resize fails)
- State is lost on refresh and the wizard cannot be restored
- Edge cases cause the wizard to crash or become permanently stuck

## Known Failure Modes

- **Long name truncation**: CharacterPreview or step-level name fields may clip or overflow with names exceeding ~40 characters
- **Rapid-click state skip**: The wizard may not debounce Continue clicks, causing a state transition skip (background → term_resolution without career selection)
- **Refresh state loss**: If Yjs persistence is not fully wired for in-progress characters, a page refresh may lose wizard state and require starting over
- **Wide-viewport spacing**: The `max-w-7xl` container caps total width at 1280px, leaving margin gaps at 1920×1080 that may look unbalanced
- **BentoGrid column count**: Grid may not recalculate columns on viewport resize without a page reload
