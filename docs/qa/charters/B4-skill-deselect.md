---
id: B4
title: Skill selection and deselection verification
persona: player
timebox_minutes: 15
tags: [chargen, skills, interaction, toggle, mgt2e]
enabled: true
xfail: false
scope:
  [
    apps/web/components/chargen/steps/SkillsStep.tsx,
    apps/web/components/chargen/CharacterPreview.tsx,
  ]
---

# Charter B4 — Skill Selection and Deselection Verification

## Mission

Verify that skill selection and deselection (toggle) interactions in the chargen wizard work correctly, and that the character sheet (CharacterPreview) accurately reflects the current state after every select and deselect action.

This charter focuses on **interaction reversibility** — the core question is: "if you select a skill, can you deselect it? does the character sheet update correctly?" It covers:

- Skill selection: selecting skills and verifying they appear in CharacterPreview
- Skill deselection: deselecting skills and verifying the character sheet reflects the removal
- Toggling: selecting multiple skills, deselecting in various orders, verifying sheet stays accurate throughout
- Rapid toggle stress test: selecting and deselecting quickly to verify no state corruption
- Dual-viewport verification: testing at both 1280×720 and 1920×1080

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

- Skill selection occurs during the `term_resolution` phase of the chargen wizard FSM: `background → career_selection → term_resolution → mustering_out → finalized`
- The skill selection UI is rendered by `TermResolutionStep` during the `skill` sub-phase (after survival and event rolls)
- `SkillsStep.tsx` displays the skills summary (trained skills and level 0 skills) but does not handle selection/deselection directly
- `CharacterPreview.tsx` is the right panel that must update reactively when skills change — it reads from `character.skills` and renders `SkillBadge` components
- The `data-chargen-status` attribute tracks FSM state and should be `"term_resolution"` during this test
- This charter tests the **toggle pattern**: select → verify → deselect → verify → repeat

## Steps

### Phase 1: Navigate to Skill Selection

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
2. **Navigate** to `/chargen`
3. **Click** "Create New Character"
4. **Complete** background step (roll characteristics, select background skills)
5. **Advance** to career selection
6. **Select** any available career and assignment
7. **Roll qualification** (or auto-qualify for Drifter)
8. **Verify** `data-chargen-status` = `"term_resolution"`:
   ```bash
   agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.getAttribute('data-chargen-status')"
   ```
9. **Complete** survival roll (click "Roll Survival", ensure success)
10. **Complete** event roll (click "Roll Event", confirm event)
11. **Verify** skill selection phase is active — look for "Phase 3: Skill Training" heading
12. **Screenshot**: `screenshots/B4-01-skill-phase-start.png`
13. **Read** current skills from CharacterPreview:
    ```bash
    agent-browser eval "Array.from(document.querySelectorAll('[data-testid=character-preview] .skill-badge')).map(b => b.textContent)"
    ```
    Record baseline skill list.

### Phase 2: Select One Skill

14. **Select** a skill table (e.g., "Personal Development")
15. **Click** "Roll 1d6" to gain a skill
16. **Verify** skill gained notification appears ("Skill Gained" with skill name)
17. **Read** CharacterPreview skills:
    ```bash
    agent-browser eval "Array.from(document.querySelectorAll('[data-testid=character-preview] .skill-badge')).map(b => b.textContent)"
    ```
    Verify the new skill appears in the list.
18. **Read** SkillsStep skills summary:
    ```bash
    agent-browser eval "Array.from(document.querySelectorAll('[data-testid=skills-step] .skill-badge')).map(b => b.textContent)"
    ```
    Verify the new skill appears here too.
19. **Screenshot**: `screenshots/B4-02-one-skill-selected.png`

### Phase 3: Deselect That Skill

20. **Click** the deselect/remove button (or toggle the same skill again if UI supports toggle)
21. **Verify** the skill is removed from the active selection
22. **Read** CharacterPreview skills:
    ```bash
    agent-browser eval "Array.from(document.querySelectorAll('[data-testid=character-preview] .skill-badge')).map(b => b.textContent)"
    ```
    Verify the skill no longer appears. The list should match the baseline from step 13.
23. **Read** SkillsStep skills summary:
    ```bash
    agent-browser eval "Array.from(document.querySelectorAll('[data-testid=skills-step] .skill-badge')).map(b => b.textContent)"
    ```
    Verify the skill is removed here too.
24. **Screenshot**: `screenshots/B4-03-one-skill-deselected.png`

### Phase 4: Select Multiple Skills (3+)

25. **Select** a skill table and gain a skill (Skill A)
26. **Select** a different skill table and gain a skill (Skill B)
27. **Select** a third skill table and gain a skill (Skill C)
28. **Read** CharacterPreview skills:
    ```bash
    agent-browser eval "Array.from(document.querySelectorAll('[data-testid=character-preview] .skill-badge')).map(b => b.textContent)"
    ```
    Verify all three skills (A, B, C) appear.
29. **Screenshot**: `screenshots/B4-04-multiple-skills-selected.png`

### Phase 5: Deselect in Reverse Order

30. **Deselect** Skill C (most recently added)
31. **Read** CharacterPreview skills and verify only A and B remain
32. **Deselect** Skill B
33. **Read** CharacterPreview skills and verify only A remains
34. **Deselect** Skill A
35. **Read** CharacterPreview skills and verify the list matches baseline (step 13)
36. **Screenshot**: `screenshots/B4-05-reverse-deselect.png`

### Phase 6: Deselect in Random Order

37. **Select** three skills again (Skills D, E, F)
38. **Deselect** Skill E (middle one)
39. **Read** CharacterPreview skills and verify D and F remain, E is gone
40. **Deselect** Skill D
41. **Read** CharacterPreview skills and verify only F remains
42. **Deselect** Skill F
43. **Read** CharacterPreview skills and verify list matches baseline
44. **Screenshot**: `screenshots/B4-06-random-deselect.png`

### Phase 7: Rapid Toggle Stress Test

45. **Select** a skill table
46. **Rapidly** select and deselect the same skill 5 times in quick succession
47. **Read** CharacterPreview skills:
    ```bash
    agent-browser eval "Array.from(document.querySelectorAll('[data-testid=character-preview] .skill-badge')).map(b => b.textContent)"
    ```
    Verify the final state is consistent (either skill present or absent, not duplicated or corrupted)
48. **Verify** no console errors:
    ```bash
    agent-browser eval "JSON.stringify(consoleErrors)"
    ```
    Should be `[]` or empty.
49. **Screenshot**: `screenshots/B4-07-rapid-toggle.png`

### Phase 8: Dual-Viewport Verification

50. **Resize** viewport to 1280×720:
    ```bash
    agent-browser resize 1280 720
    ```
51. **Select** a skill and verify it appears in CharacterPreview
52. **Deselect** the skill and verify it disappears
53. **Screenshot**: `screenshots/B4-08-viewport-1280x720.png`
54. **Resize** viewport to 1920×1080:
    ```bash
    agent-browser resize 1920 1080
    ```
55. **Select** a skill and verify it appears in CharacterPreview
56. **Deselect** the skill and verify it disappears
57. **Screenshot**: `screenshots/B4-09-viewport-1920x1080.png`
58. **Verify** layout is readable at both viewports — no overflow, no clipped badges, no overlapping text

## Verification Checklist

### Navigation

- [ ] Logged in as test user
- [ ] Reached `/chargen` and created new character
- [ ] Advanced through background and career selection
- [ ] `data-chargen-status` = `"term_resolution"`
- [ ] Skill selection phase ("Phase 3: Skill Training") is visible

### Single Skill Toggle

- [ ] One skill selected and visible in CharacterPreview
- [ ] Same skill deselected and no longer visible in CharacterPreview
- [ ] SkillsStep summary reflects the same state as CharacterPreview

### Multiple Skills

- [ ] Three skills selected, all visible in CharacterPreview
- [ ] Deselect in reverse order — each removal reflects immediately
- [ ] Deselect in random order — sheet stays accurate after each removal
- [ ] Final state after all deselections matches baseline

### Rapid Toggle

- [ ] Rapid select/deselect does not corrupt state
- [ ] No duplicate skill badges appear
- [ ] No JavaScript console errors during rapid toggling

### Cross-Cutting

- [ ] CharacterPreview updates reactively after every select/deselect action
- [ ] SkillsStep updates reactively after every select/deselect action
- [ ] `data-chargen-status` remains `"term_resolution"` throughout (no unintended FSM transitions)
- [ ] No uncaught JavaScript exceptions
- [ ] State is consistent between CharacterPreview and SkillsStep at all times

### Viewport

- [ ] Layout readable at 1280×720
- [ ] Layout readable at 1920×1080
- [ ] Skill badges do not overflow or clip at either viewport
- [ ] CharacterPreview panel visible and functional at both viewports

## Report Focus

- **Interaction reversibility**: Can every selected skill be deselected? Does the UI update correctly?
- **State consistency**: Does CharacterPreview always match the actual selected skills set?
- **Reactive updates**: Does the character sheet update immediately after each toggle, or is there a delay?
- **Rapid toggle resilience**: Does quick select/deselect cause state corruption, duplicate badges, or console errors?
- **Viewport adaptability**: Does the skill badge layout work at both standard and wide viewports?
- **FSM stability**: Does toggling skills ever trigger unintended FSM state transitions?

Record the specific skills selected and deselected at each step — this helps diagnose data-specific bugs.

## Pass Criteria

- CharacterPreview accurately reflects the selected skills set after every select/deselect action
- All selected skills can be deselected
- State remains consistent after deselecting in reverse order, random order, and rapid toggle
- No JavaScript console errors during any toggle operation
- Layout is readable and functional at both 1280×720 and 1920×1080 viewports
- SkillsStep and CharacterPreview always show identical skill sets

## Fail Criteria

- Selected skill does not appear in CharacterPreview
- Deselected skill still appears in CharacterPreview (stale state)
- CharacterPreview shows skills that were never selected
- Rapid toggle causes duplicate skill badges or corrupted state
- JavaScript console errors during select/deselect operations
- SkillsStep and CharacterPreview show different skill sets
- FSM transitions unexpectedly during skill toggle
- Layout breaks (overflow, clipped badges, overlapping text) at either viewport

## Known Failure Modes

- **Skill not reactive in CharacterPreview** — CharacterPreview may not re-render when skills change if the Yjs observer or React hook is not wired correctly
- **Deselection not implemented** — the skill selection UI may not provide a deselect/remove action, making this charter impossible to complete
- **State desync between components** — SkillsStep and CharacterPreview may read from different data sources or at different times, causing inconsistent displays
- **Rapid toggle race condition** — quick select/deselect may trigger a race condition in state updates if the toggle handler is not debounced or properly synchronized
- **Viewport overflow** — skill badges in CharacterPreview may overflow their container at 1280×720 if flex-wrap is not configured correctly

## MGT2E Rule Coverage

This charter covers skill acquisition display mechanics per the Core Rulebook:

| Rule                                                  | Covered      |
| ----------------------------------------------------- | ------------ |
| Skill selection from tables (personal, service, etc.) | Phase 2-7    |
| Skill display on character sheet                      | All phases   |
| Skill removal / deselection (UI toggle)               | Phase 3, 5-7 |
| State consistency across components                   | All phases   |
