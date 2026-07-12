---
id: U2
title: Wide viewport layout verification
persona: player
timebox_minutes: 10
tags: [ui, layout, wide-viewport, responsive]
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
---

# Charter U2 — Wide Viewport Layout Verification

## Mission

Verify the chargen wizard's layout at 1920×1080 wide viewport. Confirm the three-column grid uses horizontal space effectively, all content stays within its containers, and the UI remains readable and well-proportioned at wide width.

This charter covers:

- Horizontal space usage across the wizard's `lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]` layout
- Content containment within the left sidebar (ParticipantPanel), main content area (step rendering), and right sidebar (CharacterPreview + EntityPoolPanel)
- Text readability and panel proportions at 1920×1080
- BentoGrid expansion behavior (whether it fills available width or leaves wasted whitespace)
- Comparison against 1280×720 to identify layout regressions that only appear at wide widths

## Preconditions

| Service    | Required |
| ---------- | -------- |
| web        | yes      |
| fastify    | yes      |
| hocuspocus | optional |
| postgres   | optional |
| rag        | optional |
| ollama     | optional |

If web or fastify is down → SKIP with reason `"services not running"`.

## Key Context

- The chargen wizard uses a responsive three-column grid: `grid-cols-1` below `lg` breakpoint, and `lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]` at `lg` and above. At 1920×1080 the `lg` breakpoint is active, so the three-column layout renders.
- Wide-viewport layout bugs often hide at standard widths. Issues like: excessive whitespace in the main content column, text lines that stretch too long for comfortable reading, panels that don't expand to fill their allocated fraction, or BentoGrid cells that stay narrow while the container grows.
- The BentoGrid component uses `repeat(auto-fit, minmax(var(--bento-min), 1fr))` with a default `minWidth` of `280px`. At 1920×1080 the main content column (2fr) is significantly wider than at 1280×720. The grid should add columns to use the space, not leave large gaps.
- The `max-w-7xl` container on the wizard caps total width. At 1920×1080 there may be significant side margins if the container doesn't expand. This charter checks whether the container uses the available width or wastes it.
- AGENTS.md requires testing at both 1280×720 and 1920×1080. This charter focuses on the wide end, but includes a 1280×720 comparison checkpoint to catch regressions.

## Steps

### Phase 1: Setup and Baseline at 1280×720

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
2. **Navigate** to `/chargen`
3. **Set viewport** to 1280×720:
   ```bash
   agent-browser eval "window.innerWidth === 1280 && window.innerHeight === 720"
   ```
   If not matched, resize the browser window to 1280×720 before proceeding.
4. **Wait** for wizard to render
5. **Screenshot**: `screenshots/U2-01-baseline-1280.png`
6. **Record** the baseline layout:
   ```bash
   agent-browser snapshot
   ```
   Note the width of the left sidebar, main content column, and right sidebar.

### Phase 2: Wide Viewport — Wizard Start (Background Step)

7. **Set viewport** to 1920×1080:
   ```bash
   agent-browser eval "window.innerWidth === 1920 && window.innerHeight === 1080"
   ```
   If not matched, resize the browser window to 1920×1080 before proceeding.
8. **Wait** for wizard to re-render at new viewport
9. **Screenshot**: `screenshots/U2-02-wizard-start-1920.png`
10. **Verify** the three-column grid is active:
    ```bash
    agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_minmax\\(0\\,2fr\\)_minmax\\(0\\,1fr\\)\\]') !== null"
    ```
    Should return `true`.
11. **Measure** the main content column width:
    ```bash
    agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_minmax\\(0\\,2fr\\)_minmax\\(0\\,1fr\\)\\] > div:nth-child(2)')?.clientWidth"
    ```
    Record the value. At 1920×1080 with `max-w-7xl` (1280px), the main content column should be roughly 640px or wider.
12. **Check** for horizontal overflow:
    ```bash
    agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.scrollWidth > document.querySelector('[data-testid=chargen-wizard]')?.clientWidth"
    ```
    Should return `false`.

### Phase 3: Wide Viewport — Background Step Layout

13. **Click** "Create New Character" (if visible)
14. **Wait** for background step to render
15. **Screenshot**: `screenshots/U2-03-background-step-1920.png`
16. **Verify** BackgroundStep content fits within the main content column:
    ```bash
    agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.overflow-y-auto')?.scrollWidth <= document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.overflow-y-auto')?.clientWidth"
    ```
    Should return `true`.
17. **Check** BentoGrid behavior in BackgroundStep:
    ```bash
    agent-browser eval "const grid = document.querySelector('[data-testid=chargen-wizard]')?.querySelector('[style*=\"grid-template-columns\"]'); grid ? getComputedStyle(grid).gridTemplateColumns : 'not-found'"
    ```
    Record the column count. At 1920×1080 the grid should use more columns than at 1280×720.
18. **Verify** text readability — no line lengths exceed ~90 characters in body text:
    ```bash
    agent-browser eval "Array.from(document.querySelectorAll('p, span, div')).filter(el => el.clientWidth > 0 && getComputedStyle(el).fontSize === '16px').every(el => el.textContent.length < 120 || el.clientWidth < 800)"
    ```
    Should return `true`.

### Phase 4: Wide Viewport — Career Selection Step Layout

19. **Advance** to career selection (roll characteristics, select background skills, click Continue)
20. **Wait** for career selection step
21. **Screenshot**: `screenshots/U2-04-career-selection-1920.png`
22. **Verify** CareerSelectionStep content fits within container:
    ```bash
    agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.overflow-y-auto')?.scrollWidth <= document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.overflow-y-auto')?.clientWidth"
    ```
    Should return `true`.
23. **Check** career cards / BentoGrid expansion:
    ```bash
    agent-browser eval "const grid = document.querySelector('[data-testid=chargen-wizard]')?.querySelector('[style*=\"grid-template-columns\"]'); grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 'not-found'"
    ```
    Record column count. Career cards should expand to fill the wide main content area.

### Phase 5: Wide Viewport — Term Resolution Step Layout

24. **Select** a career and advance to term resolution
25. **Wait** for term resolution step
26. **Screenshot**: `screenshots/U2-05-term-resolution-1920.png`
27. **Verify** TermResolutionStep content fits within container:
    ```bash
    agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.overflow-y-auto')?.scrollWidth <= document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.overflow-y-auto')?.clientWidth"
    ```
    Should return `true`.
28. **Check** panel proportions — the left sidebar (participants), main content (term resolution), and right sidebar (character preview) should each be visible and proportioned roughly 1:2:1:
    ```bash
    agent-browser eval "const grid = document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_minmax\\(0\\,2fr\\)_minmax\\(0\\,1fr\\)\\]'); const cols = grid ? Array.from(grid.children).map(c => c.clientWidth) : []; cols.length === 3 && cols[1] > cols[0] && cols[1] > cols[2]"
    ```
    Should return `true`.

### Phase 6: Wide Viewport — Mustering Out and Finalize Steps

29. **Advance** through a term to reach mustering out (or use GM controls if available)
30. **Wait** for mustering out step
31. **Screenshot**: `screenshots/U2-06-mustering-out-1920.png`
32. **Verify** MusteringOutStep content fits within container:
    ```bash
    agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.overflow-y-auto')?.scrollWidth <= document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.overflow-y-auto')?.clientWidth"
    ```
    Should return `true`.
33. **Advance** to finalized step
34. **Wait** for finalize step
35. **Screenshot**: `screenshots/U2-07-finalize-step-1920.png`
36. **Verify** FinalizeStep content fits within container:
    ```bash
    agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.overflow-y-auto')?.scrollWidth <= document.querySelector('[data-testid=chargen-wizard]')?.querySelector('.overflow-y-auto')?.clientWidth"
    ```
    Should return `true`.

### Phase 7: Comparison Checkpoint (1280×720 vs 1920×1080)

37. **Set viewport** back to 1280×720
38. **Navigate** to `/chargen` and wait for wizard
39. **Screenshot**: `screenshots/U2-08-comparison-1280.png`
40. **Compare** the two viewports side by side:
    - At 1920×1080: the three-column layout should use the full width, main content should be noticeably wider than at 1280×720
    - At 1280×720: the same three-column layout should still work but with narrower columns
    - Neither viewport should show horizontal scrollbars, clipped content, or collapsed panels
41. **Screenshot** (if issues found): `screenshots/U2-09-comparison-issue.png`

## Verification Checklist

### Layout Structure

- [ ] Three-column grid is active at 1920×1080 (`lg` breakpoint triggered)
- [ ] Left sidebar (ParticipantPanel) visible and proportioned correctly
- [ ] Main content column (step rendering) is the widest column (2fr)
- [ ] Right sidebar (CharacterPreview + EntityPoolPanel) visible and proportioned correctly
- [ ] No horizontal overflow on the wizard container
- [ ] `max-w-7xl` container does not cause excessive side margins at 1920×1080

### Content Containment

- [ ] BackgroundStep content fits within main content column (no overflow)
- [ ] CareerSelectionStep content fits within main content column (no overflow)
- [ ] TermResolutionStep content fits within main content column (no overflow)
- [ ] MusteringOutStep content fits within main content column (no overflow)
- [ ] FinalizeStep content fits within main content column (no overflow)
- [ ] No clipped text, buttons, or panels at 1920×1080

### Readability and Proportions

- [ ] Body text line lengths are readable (not exceeding ~90 characters)
- [ ] BentoGrid expands to use available width (adds columns rather than stretching single columns)
- [ ] Career cards / grid items are well-proportioned at wide width
- [ ] Panel gaps (`gap-8`) look appropriate at 1920×1080 (not too tight, not too loose)
- [ ] Text sizes remain readable (no microscopic text due to wide container)
- [ ] Comparison with 1280×720 shows consistent layout behavior (no regressions)

### Cross-Cutting

- [ ] No uncaught JavaScript exceptions at either viewport
- [ ] No React key warnings or prop-type errors
- [ ] Screenshots captured for all major layout states

## Report Focus

- **Horizontal space usage**: Does the three-column grid effectively use the 1920px width? Is the main content column wide enough to be useful, or does `max-w-7xl` waste space?
- **BentoGrid behavior**: Does the grid add columns at wide width, or do cells stretch awkwardly? Is the default `280px` min-width appropriate for 1920×1080?
- **Content containment**: Are there any overflow or clipping issues specific to the wide viewport?
- **Readability**: Do text lines get too long at 1920×1080? Are font sizes still appropriate?
- **Panel proportions**: Is the 1:2:1 ratio maintained and visually balanced at wide width?
- **1280×720 comparison**: Does the layout degrade gracefully when narrowing? Any elements that break only at wide width?

Record exact pixel measurements for column widths and grid column counts. This helps diagnose responsive layout bugs.

## Pass Criteria

- Three-column grid is active and visible at 1920×1080
- Main content column width is greater than 600px at 1920×1080
- No content overflows its container at 1920×1080 (all `scrollWidth <= clientWidth` checks pass)
- BentoGrid uses 3+ columns at 1920×1080 (not stuck at 1-2 columns with wasted space)
- Text line lengths remain readable (no body text spans more than ~90 characters per line)
- All wizard steps (background, career_selection, term_resolution, mustering_out, finalized) render without clipping at 1920×1080
- 1280×720 comparison shows no regressions (layout still functional, no broken panels)
- No uncaught JavaScript exceptions at either viewport

## Fail Criteria

- Three-column grid does not activate at 1920×1080 (breakpoint issue)
- Main content column is narrower than 600px at 1920×1080 (wasted horizontal space)
- Any step content overflows its container (horizontal scrollbar appears)
- Text or buttons are clipped at 1920×1080
- BentoGrid leaves excessive whitespace (fewer than 3 columns when space allows)
- Body text lines exceed ~120 characters (readability degradation)
- Panels collapse or disappear at 1920×1080
- Layout breaks at 1280×720 after being tested at 1920×1080 (state pollution or responsive bug)
- Any uncaught JavaScript exception

## Known Failure Modes

- **BentoGrid stays at 2 columns** even with 800+ px of main content width — the `280px` min-width may be too large, or the container width calculation may be off
- **Main content column shrinks** because right sidebar content (CharacterPreview) expands — flex/grid sizing conflict
- **Text stretches too wide** because no `max-width` is set on text containers within the main content column
- **Overflow on specific steps** — TermResolutionStep or CareerSelectionStep may have fixed-width elements that exceed the column width
- **Side margins too large** — `max-w-7xl` (1280px) on a 1920px screen leaves 320px of empty space on each side; this may be intentional but should be noted
