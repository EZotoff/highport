---
id: B2
title: Full multi-term lifecycle — 4 terms, commission, aging, mustering out
persona: player
timebox_minutes: 20
tags: [multiplayer, creation, mgt2e, multi-term, commission, aging, mustering]
enabled: true
xfail: false
---

# Charter B2 — Full Multi-Term Character Lifecycle

## Mission

Drive a single character through a complete MGT2E lifecycle: background → career selection → **four terms** of service → mustering out → finalization. Verify every mechanical phase fires in the correct order, state persists across terms, and the character sheet at the end reflects all accumulated skills, ranks, benefits, and aging effects.

This is the deepest mechanical test. It covers:

- Term resolution phases: basic training → skills → survival → event → commission (military) → advancement → aging
- Multi-term re-enlistment (same career, multiple terms)
- Commission rolls and officer rank track (if military career available)
- Aging checks at age 34+ with characteristic reductions
- Mustering out: cash rolls, material benefit rolls, rank bonus
- Final character sheet completeness

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

- Career data: If only Drifter is available, the test still validates the term loop, aging, and mustering. If military careers (Army/Marine/Navy) are available, commission is tested.
- This charter is **non-deterministic** — dice rolls produce different results each run. The agent validates **structure and state coherence**, not specific numbers.
- The FSM is: `background → career_selection → term_resolution → mustering_out → finalized`. Only forward transitions are valid.

## Steps

### Phase 1: Background (Age 18)

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
2. **Navigate** to `/chargen`
3. **Screenshot**: `screenshots/B2-01-chargen-start.png`
4. **Click** "Create New Character"
5. **Verify** background step renders (characteristics, homeworld skills)
6. **Roll characteristics** (or accept auto-roll if UI provides)
7. **Read** the rolled characteristics:
   ```bash
   agent-browser snapshot
   ```
   Record STR/DEX/END/INT/EDU/SOC values for later comparison.
8. **Select** a background skill package if prompted
9. **Advance** to career selection
10. **Screenshot**: `screenshots/B2-02-background-done.png`

### Phase 2: Career Selection

11. **Read** available careers from the career selection step:
    ```bash
    agent-browser snapshot
    ```
    Record which careers are listed.
12. **Select** a career:
    - **If military careers exist** (Army, Marine, Navy): Select one to test commission
    - **If only Drifter exists**: Select Drifter — commission will be skipped but term loop still tests
13. **Select** an assignment/specialty if prompted
14. **Roll qualification** (automatic for Drifter; rolled for others)
15. **Verify** qualification result (success or failure message)
16. **Screenshot**: `screenshots/B2-03-career-selected.png`
17. **Read** `data-chargen-status` attribute:
    ```bash
    agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.getAttribute('data-chargen-status')"
    ```
    Should be `"term_resolution"`.

### Phase 3: Term Resolution Loop (4 Terms)

For each term (1 through 4), execute the full term resolution cycle:

#### Term 1 (Age 18→22)

18. **Verify** term resolution step is active:
    - `data-chargen-status` = `"term_resolution"`
    - Term counter shows "Term 1" or similar
19. **Screenshot**: `screenshots/B2-04-term1-start.png`

20. **Basic Training**: Verify service skills are granted (automatic for first term)
21. **Roll skills**: Click any "Roll Skill" button, verify a skill is gained
22. **Roll survival**: Click "Roll Survival"
    - Record the roll result and total
    - Verify: nat 2 = automatic failure. On failure, character leaves career (mishap path)
    - On success, continue
23. **Screenshot**: `screenshots/B2-05-term1-survival.png`

24. **Roll event**: Click "Roll Event"
    - Record the 2d6 roll (2-12)
    - Read the event description
    - If event has choices, pick one
    - If event spawns an entity, note it (entity pool should update)
25. **Screenshot**: `screenshots/B2-06-term1-event.png`

26. **Commission** (if military career and first term):
    - Look for "Attempt Commission" button
    - If present, click it and record result
    - If absent (non-military or Drifter), skip
27. **Roll advancement**: Click "Roll Advancement"
    - Record the roll result and total
    - If success: rank increases, may gain rank skill
    - If nat 12: must serve another term
28. **Screenshot**: `screenshots/B2-07-term1-advancement.png`

29. **Verify age incremented**: Age should be 22 (18 + 4)
30. **Read** accumulated skills:
    ```bash
    agent-browser snapshot
    ```
31. **Start next term**: Click "Continue" or "Start Next Term"
32. **Roll re-enlistment** (if applicable — Scouts auto-continue)
    - Record result

#### Terms 2-3 (Ages 22→26→30)

33. Repeat steps 18-32 for Term 2 (age 22→26)
34. Repeat steps 18-32 for Term 3 (age 26→30)
35. **Screenshot**: `screenshots/B2-08-term3-complete.png`

#### Term 4 (Age 30→34) — AGING CHECK

36. Start Term 4
37. Execute full term resolution (steps 18-28)
38. **After advancement**: Look for aging check
    - Age should now be 34
    - An aging roll should trigger automatically
    - Record: 2d6 + END_DM - total_terms
    - Verify: if result indicates characteristic loss, UI shows which characteristics decreased
39. **Screenshot**: `screenshots/B2-09-term4-aging.png`
40. **Read** characteristics and compare to Phase 1 values:
    ```bash
    agent-browser snapshot
    ```
    If aging caused reduction: verify the reduced values are visible.
    If aging had no effect: note "aging check passed, no reduction."

### Phase 4: Mustering Out

41. **Choose** to leave career (do not re-enlist)
42. **Verify** status transitions to `"mustering_out"`:
    ```bash
    agent-browser eval "document.querySelector('[data-testid=chargen-wizard]')?.getAttribute('data-chargen-status')"
    ```
43. **Screenshot**: `screenshots/B2-10-mustering-start.png`
44. **Read** available mustering rolls:
    - Total rolls = terms served (4) + rank bonus
    - Cash rolls: max 3
    - Material rolls: remaining
45. **Roll all material benefits**:
    - Click "Roll Benefit" for each available roll
    - Record each benefit gained
46. **Roll cash benefits** (up to 3 rolls):
    - Click "Roll Cash" for each
    - Record amounts
47. **Screenshot**: `screenshots/B2-11-mustering-complete.png`
48. **Verify** benefits are recorded:
    - Credits total is visible
    - Material benefits are listed
    - Ship shares (if any) are tracked
49. **Verify** rolls remaining = 0

### Phase 5: Finalization

50. **Advance** to finalized step
51. **Verify** `data-chargen-status` = `"finalized"`
52. **Screenshot**: `screenshots/B2-12-finalized.png`
53. **Read** the complete character sheet:
    ```bash
    agent-browser snapshot
    ```
54. **Verify** the character sheet shows:
    - All characteristics (with aging effects applied)
    - All accumulated skills (from 4 terms)
    - Career history (terms served, ranks achieved)
    - Cash and material benefits from mustering out
    - Age (should be 34)
    - Any entities spawned during events

## Verification Checklist

### Background

- [ ] Characteristics rolled (STR/DEX/END/INT/EDU/SOC)
- [ ] Background skills selected

### Career

- [ ] Qualification rolled (or auto-qualified for Drifter)
- [ ] Assignment selected
- [ ] `data-chargen-status` = `"term_resolution"` after career selection

### Term Loop (4 terms)

- [ ] Each term executed all phases: basic training → skills → survival → event → [commission] → advancement
- [ ] Survival roll triggered each term
- [ ] Event rolled each term with description visible
- [ ] Commission phase appeared for military career (if applicable)
- [ ] Advancement rolled each term
- [ ] Age incremented by 4 each term (18→22→26→30→34)
- [ ] Re-enlistment offered between terms (except Scout auto-continue)

### Aging (Term 4)

- [ ] Aging check triggered at age 34
- [ ] Aging roll result visible (2d6 + END_DM - total_terms)
- [ ] Characteristic reductions applied correctly (if any)

### Mustering Out

- [ ] Status transitioned to `"mustering_out"`
- [ ] Benefit rolls available (terms + rank bonus)
- [ ] Cash rolls capped at 3
- [ ] All rolls consumed (remaining = 0)
- [ ] Benefits persisted (survive page refresh)

### Finalization

- [ ] Status transitioned to `"finalized"`
- [ ] Character sheet shows complete state:
  - [ ] Characteristics with aging effects
  - [ ] All skills from all terms
  - [ ] Career terms and ranks
  - [ ] Mustering out benefits
  - [ ] Age 34

### Cross-Cutting

- [ ] `data-chargen-status` attribute updated correctly at each transition
- [ ] No uncaught JavaScript exceptions
- [ ] State persisted to Yjs (reload page → state survives)
- [ ] No React key warnings or prop-type errors

## Report Focus

- **State coherence**: Did the FSM advance correctly through all 5 states?
- **Term loop**: Did each of the 4 terms execute all expected phases?
- **Commission**: If military career, did the commission phase appear and function?
- **Aging**: Did the aging check trigger at age 34? What was the result?
- **Mustering**: Were benefit rolls calculated correctly (terms + rank bonus)?
- **Data integrity**: Did the final character sheet accurately reflect all accumulated state?
- **FSM status attribute**: Did `data-chargen-status` track the actual UI state?

Record specific dice results for each roll — this helps diagnose mechanical bugs.

## Pass Criteria

- Character reached `finalized` state
- All 4 terms executed with all phases firing
- Aging check triggered at age 34
- Mustering out rolls were available and consumable
- Final character sheet shows accumulated state from all terms
- `data-chargen-status` tracked correctly throughout

## Fail Criteria

- FSM stuck in any state (cannot advance)
- Term resolution skips a phase (no survival roll, no event roll, etc.)
- Aging check doesn't trigger at age 34
- Mustering out rolls incorrect (wrong count, can't consume, don't persist)
- Character loses state between terms (skills disappear, rank resets)
- `data-chargen-status` doesn't match actual UI
- Any uncaught JavaScript exception

## Known Failure Modes

- **Commission never appears** even for military careers — the career data may not have `officerRanks` defined, or the commission UI isn't wired in TermResolutionStep
- **Aging doesn't trigger** — the aging check may not be implemented, or age tracking is broken
- **Mustering state lost on refresh** — persistence bug (should be fixed by W0-T2)
- **FSM step collapse** — `term_resolution` and `mustering_out` both map to same step (should be fixed by W0-T3)
- **Re-enlistment penalty wrong** — applying -1 per total terms instead of per OTHER career terms (should be fixed by W0-T1)

## MGT2E Rule Coverage

This charter covers the complete MGT2E term lifecycle per the Core Rulebook:

| Rule                                                | Covered       |
| --------------------------------------------------- | ------------- |
| Background: characteristics + homeworld skills      | Phase 1       |
| Career qualification roll                           | Phase 2       |
| Basic training (service skills)                     | Term 1        |
| Term skill roll (1d6 → table)                       | Each term     |
| Survival roll (2d6 + stat_DM ≥ target)              | Each term     |
| Event roll (2d6 → events table)                     | Each term     |
| Commission (2d6 + SOC_DM ≥ 8, military, first term) | Term 1        |
| Advancement (2d6 + stat_DM ≥ target)                | Each term     |
| Re-enlistment                                       | Between terms |
| Aging (2d6 + END_DM − total_terms, age 34+)         | Term 4        |
| Mustering out rolls (terms + rank_bonus)            | Phase 4       |
| Cash benefit cap (3 rolls max)                      | Phase 4       |
| Character finalization                              | Phase 5       |
