---
id: B3
title: Skill Training step verification
persona: player
timebox_minutes: 15
tags: [chargen, skills, ui, mgt2e]
enabled: true
xfail: false
scope:
  [
    apps/web/components/chargen/steps/SkillsStep.tsx,
    apps/web/components/chargen/CharacterPreview.tsx,
  ]
---

# Charter B3 — Skill Training Step Verification

## Mission

Verify that the Skill Training phase (Phase 3 of term resolution) renders correctly, allows skill table selection and rolling, updates the character state with gained skills, and reflects those skills in the CharacterPreview panel. Test at both standard and wide viewports to catch layout and text visibility issues.

This charter covers:

- Skill table selection UI (Personal Development, Service Skills, Advanced Education, Assignment Skills, Officer Skills)
- Roll button functionality (1d6 skill roll)
- Skill gain state update and persistence
- CharacterPreview right panel reflecting newly gained skills
- Text visibility (no clipping, truncation, or overflow)
- Responsive layout at 1280×720 and 1920×1080

## Preconditions

| Service    | Required |
| ---------- | -------- |
| web        | yes      |
| fastify    | yes      |
| hocuspocus | yes      |
| postgres   | yes      |
| rag        | optional |
| ollama     | optional |

If web, fastify, or hocuspocus is down, SKIP with reason `"services not running"`.

## Key Context

- Skill training is Phase 3 of the term resolution cycle: `survival → event → skill → [commission] → advancement → [aging] → complete`
- The skill phase is rendered inside `TermResolutionStep.tsx` by the `renderSkill()` function
- Available skill tables depend on career data: Personal Development, Service Skills, Advanced Education (requires EDU 8+), Assignment Skills, and Officer Skills (requires commission)
- Skills gained here update `character.skills` via `applySkillGain()` and are persisted to Yjs
- `CharacterPreview.tsx` displays skills from `character.skills` using `SkillBadge` components
- `SkillsStep.tsx` renders a standalone skills summary view (trained vs level 0) when viewed independently
- The FSM status during skill training remains `"term_resolution"` — the phase is tracked internally by `TermPhase` state, not the top-level FSM
- Test user: `agent-qa-player1@example.com` / `test-password-123`

## Steps

### Phase 1: Navigate to Skill Training

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
2. **Navigate** to `/chargen`
3. **Click** "Create New Character"
4. **Complete** the background step (roll characteristics, select background skills)
5. **Advance** to career selection
6. **Select** any available career and assignment
7. **Roll qualification** (or auto-qualify for Drifter)
8. **Verify** `data-chargen-status` = `"term_resolution"`:
   ```bash
   agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.getAttribute('data-chargen-status')"
   ```
9. **Roll survival** and pass (or accept mishap and restart if needed)
10. **Roll event** and continue through event choices
11. **Continue** to Phase 3: Skill Training
12. **Screenshot** at 1280×720: `screenshots/B3-01-skill-training-1280.png`
13. **Screenshot** at 1920×1080: `screenshots/B3-01-skill-training-1920.png`

### Phase 2: Skill Table Selection UI

14. **Verify** the "Phase 3: Skill Training" heading is visible and fully readable at both viewports
15. **Verify** all skill table buttons are visible:
    - Personal Development
    - Service Skills
    - Advanced Education (may be disabled if EDU < 8)
    - Assignment Skills
    - Officer Skills (may be disabled if not commissioned)
16. **Check** text visibility: button labels must not be clipped, truncated, or overflow their containers
17. **Verify** disabled states: Advanced Education button should be disabled when `character.characteristics.EDU < 8`
18. **Verify** disabled states: Officer Skills button should be disabled when `currentTerm.commissioned !== true`
19. **Screenshot** at 1280×720: `screenshots/B3-02-table-selection-1280.png`
20. **Screenshot** at 1920×1080: `screenshots/B3-02-table-selection-1920.png`

### Phase 3: Select Table and Roll Skill

21. **Click** "Personal Development" table button
22. **Verify** the table selection UI updates to show the selected table name
23. **Verify** the "Roll 1d6" button is visible and clickable
24. **Verify** the "Change Table" button is visible (allows returning to table selection)
25. **Verify** the "OR Pick Specific Skill (House Rule)" text is fully visible
26. **Screenshot** at 1280×720: `screenshots/B3-03-table-selected-1280.png`
27. **Screenshot** at 1920×1080: `screenshots/B3-03-table-selected-1920.png`
28. **Click** "Roll 1d6" button
29. **Verify** a skill gain result appears (green "Skill Gained" banner with skill name)
30. **Record** the skill name that was gained
31. **Screenshot** at 1280×720: `screenshots/B3-04-skill-gained-1280.png`
32. **Screenshot** at 1920×1080: `screenshots/B3-04-skill-gained-1920.png`

### Phase 4: CharacterPreview Update

33. **Read** the CharacterPreview right panel:
    ```bash
    agent-browser snapshot
    ```
34. **Verify** the gained skill appears in the CharacterPreview "Skills" section
35. **Verify** the skill count in CharacterPreview incremented by 1
36. **Verify** the skill name is fully visible (no truncation or clipping in SkillBadge)
37. **Screenshot** at 1280×720: `screenshots/B3-05-preview-updated-1280.png`
38. **Screenshot** at 1920×1080: `screenshots/B3-05-preview-updated-1920.png`

### Phase 5: Multiple Skill Rolls (Optional Extended Check)

39. **If** the term allows multiple skill rolls (e.g., from event bonuses or rank skills), **repeat** steps 21-38 for a second skill
40. **Verify** both skills appear in CharacterPreview
41. **Screenshot** at 1280×720: `screenshots/B3-06-multiple-skills-1280.png`
42. **Screenshot** at 1920×1080: `screenshots/B3-06-multiple-skills-1920.png`

### Phase 6: SkillsStep Standalone View

43. **Navigate** to the skills summary view (if accessible independently, e.g., via a skills tab or step)
44. **Verify** `SkillsStep.tsx` renders:
    - "Skills Summary" heading
    - "Trained Skills" section with SkillBadge components (theme="emerald")
    - "Basic Familiarity" section with SkillBadge components (theme="slate")
    - Skill count labels
45. **Verify** all skill names in SkillBadge components are fully readable
46. **Verify** no text overflow in the skills summary panel
47. **Screenshot** at 1280×720: `screenshots/B3-07-skills-step-1280.png`
48. **Screenshot** at 1920×1080: `screenshots/B3-07-skills-step-1920.png`

## Verification Checklist

### Skill Table Selection UI

- [ ] "Phase 3: Skill Training" heading visible and readable
- [ ] All 5 table buttons visible (Personal Development, Service Skills, Advanced Education, Assignment Skills, Officer Skills)
- [ ] Button labels fully visible (no clipping, truncation, or overflow)
- [ ] Advanced Education button disabled when EDU < 8
- [ ] Officer Skills button disabled when not commissioned
- [ ] "Change Table" button visible after selection
- [ ] "Roll 1d6" button visible and clickable
- [ ] "OR Pick Specific Skill (House Rule)" text fully visible

### Skill Roll Functionality

- [ ] Clicking a table button selects that table
- [ ] Clicking "Roll 1d6" produces a skill gain result
- [ ] Skill gain banner shows the skill name clearly
- [ ] Skill name is capitalized and readable

### CharacterPreview Update

- [ ] Gained skill appears in CharacterPreview Skills section
- [ ] Skill count incremented correctly
- [ ] SkillBadge in CharacterPreview shows skill name fully (no truncation)
- [ ] SkillBadge level indicator visible

### Text Visibility (Cross-Cutting)

- [ ] All skill table button labels readable at 1280×720
- [ ] All skill table button labels readable at 1920×1080
- [ ] Skill names in gain banner readable at both viewports
- [ ] Skill names in CharacterPreview readable at both viewports
- [ ] Instructions and notes text fully visible (no overflow)
- [ ] No horizontal scrolling required to see any text

### Dual Viewport

- [ ] All screenshots captured at 1280×720
- [ ] All screenshots captured at 1920×1080
- [ ] Layout does not break at either viewport
- [ ] No elements overlap or obscure each other at either viewport

### State and Persistence

- [ ] Gained skill persists in character state (visible in CharacterPreview)
- [ ] Skill state survives page refresh
- [ ] No React key warnings in console
- [ ] No uncaught JavaScript exceptions

## Report Focus

- **UI correctness**: Do all skill table buttons render with correct labels and states?
- **Text visibility**: Are all skill names, labels, and instructions fully visible without clipping or overflow at both viewports?
- **Functional flow**: Does selecting a table, rolling, and gaining a skill work end-to-end?
- **State propagation**: Does the gained skill immediately appear in CharacterPreview?
- **Responsive layout**: Does the skill training UI adapt correctly between 1280×720 and 1920×1080?
- **Disabled states**: Are Advanced Education and Officer Skills correctly disabled based on character state?

Record the specific skill gained and the table it was rolled from. This helps verify that skill table mapping is correct.

## Pass Criteria

- Skill Training phase renders with all expected UI elements
- All skill table buttons are visible with fully readable labels
- Selecting a table and rolling produces a skill gain result
- Gained skill appears in CharacterPreview within 1 second
- All text is fully visible at both 1280×720 and 1920×1080 (no clipping, truncation, or overflow)
- Disabled states correctly applied (Advanced Education when EDU < 8, Officer Skills when not commissioned)
- No JavaScript errors during skill selection or roll

## Fail Criteria

- Skill Training phase fails to render or shows missing elements
- Skill table button labels are clipped, truncated, or overflow their containers
- Clicking "Roll 1d6" produces no result or an error
- Gained skill does not appear in CharacterPreview
- Text is partially hidden or requires scrolling to read at either viewport
- Disabled states are incorrect (e.g., Advanced Education enabled when EDU < 8)
- Any uncaught JavaScript exception during the skill phase
- Layout breaks or elements overlap at either viewport

## Known Failure Modes

- **Skill table buttons missing** — the career data may not have all skill tables defined, or the renderSkill() function fails to map them
- **Skill roll produces no result** — the 1d6 roll may not match any entry in the selected table, or the table data is empty
- **CharacterPreview does not update** — the Yjs state update may not propagate, or CharacterPreview is not re-rendering on skills change
- **Text clipping in SkillBadge** — long skill names may be truncated in the badge component
- **Viewport layout breakage** — the grid layout for table buttons (grid-cols-2 md:grid-cols-3) may not adapt correctly at 1280×720

## MGT2E Rule Coverage

This charter covers the MGT2E skill training mechanics per the Core Rulebook:

| Rule                                             | Covered |
| ------------------------------------------------ | ------- |
| Skill table selection (1d6 roll on chosen table) | Phase 3 |
| Personal Development table                       | Phase 3 |
| Service Skills table                             | Phase 3 |
| Advanced Education table (EDU 8+ required)       | Phase 3 |
| Assignment Skills table                          | Phase 3 |
| Officer Skills table (commissioned only)         | Phase 3 |
| Skill gain applied to character state            | Phase 4 |
| Characteristic increase as skill alternative     | Phase 3 |
