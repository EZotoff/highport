---
id: G1
title: Game-rules integrity verification
persona: player
timebox_minutes: 20
tags: [chargen, rules, mechanics, mgt2e, yjs]
enabled: true
xfail: false
scope:
  [packages/mgt2e, apps/web/lib/chargen, apps/web/components/chargen/steps/TermResolutionStep.tsx]
---

# Charter G1 — Game-Rules Integrity Verification

## Mission

Verify that character creation produces correct MGT2E numerical mechanics, not just a working UI. The charter drives a deterministic term-resolution flow and uses `agent-browser eval` to inspect the browser Yjs document and runtime mechanics exports, then compares the stored character state against rule expectations.

This charter covers:

- Survival roll target comparison and computed margin
- Skill gain state delta after a skill table roll
- Characteristic Dice Modifiers (DMs) for representative MGT2E values
- Advancement roll promotion and rank increase
- Optional aging-roll detection after enough terms are attempted

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

- G1 is a game-rules charter: it fails on incorrect numerical mechanics even when the UI renders successfully.
- The script follows the same `qa-init` / `qa-login` / `qa-finish` harness pattern as the B-series charters.
- Determinism comes from `qa-force-roll-success`, which sets `window.__qaForceRollSuccess = true` after the wizard mounts.
- The script reads state through `agent-browser eval`, resolving the Yjs document from `window.__yjs_doc__`, `window.getYDoc`, or Next/Webpack module exports.
- Character state is read from the Yjs `chargen.characters` map.
- Survival and advancement targets are resolved from the runtime `getCareer()` export and the active term's `careerId` / `assignmentId`.
- Skill gain is verified by capturing `character.skills` before a service skill roll and comparing the Yjs state after the roll.
- The FSM status during term sub-phases remains `"term_resolution"`; the sub-phase is inferred from visible buttons and Yjs term fields.
- Test user: `agent-qa-player1@example.com` / `test-password-123`

## Steps

### Phase 1: Navigate to Term Resolution

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
2. **Navigate** to `/chargen`
3. **Verify** `data-chargen-status` = `"background"`
4. **Install** `qa-force-roll-success` after the wizard mounts
5. **Click** "Create New Character"
6. **Fill** character name with `G1 Rules Integrity`
7. **Select** background skills:
   - Admin
   - Animals
   - Art
8. **Verify** `Selected: 3/3`
9. **Advance** to career selection
10. **Select** Drifter
11. **Verify** `data-chargen-status` = `"term_resolution"`
12. **Screenshot**: `term-resolution-start`

### Phase 2: Characteristic DM Rule Check

13. **Resolve** `getCharacteristicModifier` in browser context via `agent-browser eval`
14. **Call** the function with representative MGT2E values
15. **Verify** exact expected DMs:
    - stat 0 = -3
    - stat 1 = -3
    - stat 2 = -2
    - stat 3 = -2
    - stat 4 = -1
    - stat 5 = -1
    - stat 6 = 0
    - stat 7 = 0
    - stat 8 = +1
    - stat 9 = +1
    - stat 10 = +2
    - stat 11 = +2
    - stat 12 = +2
    - stat 13 = +3
    - stat 14 = +3
    - stat 15 = +3

### Phase 3: Survival Roll Integrity

16. **Click** "Roll Survival"
17. **Read** the active character and last term from Yjs
18. **Resolve** career and assignment with `getCareer(term.careerId)`
19. **Read** `assignment.survival.target`
20. **Read** `term.survivalRoll.total` and `term.survived`
21. **Compute** `margin = term.survivalRoll.total - assignment.survival.target`
22. **Verify**:
    - `term.survivalRoll` exists
    - UI text includes the roll total
    - `total >= target`
    - `term.survived === true`
    - computed margin is non-negative
23. **Screenshot**: `survival-result`

### Phase 4: Skill Gain Integrity

24. **Click** "Roll Event"
25. **Click** exact event-phase "Continue" button
26. **Capture** `character.skills` from Yjs into `window.__qaG1BeforeSkills`
27. **Click** "Service Skills" to avoid personal-table characteristic increases
28. **Click** "Roll 1d6"
29. **Read** `character.skills` from Yjs again
30. **Compute** changed skill keys between before and after snapshots
31. **Verify**:
    - exactly one skill key changed
    - new value equals old value + 1
    - a new skill is therefore 0→1, or an existing skill increments by one level
32. **Screenshot**: `skill-gained`

### Phase 5: Advancement Integrity

33. **Capture** `lastTerm.currentRank` from Yjs into `window.__qaG1BeforeRank`
34. **Skip** commission if the UI presents a commission step; commission is not this charter's target mechanic
35. **Click** "Roll Advancement"
36. **Read** `term.advancementRoll`, `term.advanced`, and `term.currentRank` from Yjs
37. **Verify**:
    - `term.advancementRoll` exists
    - forced success set `term.advanced === true`
    - `term.currentRank === beforeRank + 1`
38. **Screenshot**: `advancement-result`

### Phase 6: Aging Probe (Optional Best Effort)

39. **If** still in term resolution, attempt up to three additional terms using forced-success rolls
40. **If** an aging UI appears, read the active term from Yjs
41. **Verify** `term.agingRoll` exists and log the aging total and effect tier
42. **If** aging is not reached within the extra terms, log a warning rather than failing G1

## Verification Checklist

### Yjs and Runtime Inspection

- [ ] Browser eval can resolve the Yjs document from window or webpack exports
- [ ] Browser eval can read `chargen.characters` from Yjs
- [ ] Browser eval can resolve `getCareer()` for career target lookup
- [ ] Browser eval can resolve `getCharacteristicModifier()` for pure DM checks

### Characteristic DMs

- [ ] stat 0 returns -3
- [ ] stat 1 returns -3
- [ ] stat 2 returns -2
- [ ] stat 3 returns -2
- [ ] stat 4 returns -1
- [ ] stat 5 returns -1
- [ ] stat 6 returns 0
- [ ] stat 7 returns 0
- [ ] stat 8 returns +1
- [ ] stat 9 returns +1
- [ ] stat 10 returns +2
- [ ] stat 11 returns +2
- [ ] stat 12 returns +2
- [ ] stat 13 returns +3
- [ ] stat 14 returns +3
- [ ] stat 15 returns +3

### Survival

- [ ] Survival roll is stored on the active Yjs term
- [ ] Career assignment survival target is resolved from career data
- [ ] UI displays the stored roll total
- [ ] Stored roll total is greater than or equal to target
- [ ] Computed margin `total - target` is non-negative
- [ ] `term.survived` is true

### Skill Gain

- [ ] Skill pre-state is captured before clicking "Roll 1d6"
- [ ] Skill after-state is captured from Yjs after the roll
- [ ] Exactly one skill changes
- [ ] Changed skill increases by exactly one level
- [ ] New skills enter at level 1 when absent before the roll

### Advancement

- [ ] Rank pre-state is captured before advancement
- [ ] Advancement roll is stored on the active Yjs term
- [ ] Forced-success advancement sets `advanced` true
- [ ] Rank increases by exactly 1

### Aging

- [ ] Optional probe attempts additional terms only if still in term resolution
- [ ] Aging UI, when reached, has a corresponding stored `agingRoll`
- [ ] Aging effect tier is logged for follow-up investigation

## Report Focus

- **Rule correctness**: Do stored numerical results satisfy MGT2E expectations?
- **State correctness**: Does Yjs contain the same mechanical outcomes the UI implies?
- **Delta correctness**: Do skill and rank changes mutate by exactly one step, not zero or multiple steps?
- **Target correctness**: Are survival and advancement compared against the active career assignment's target values?
- **Regression signal**: Does the script fail with a concrete mismatch when mechanics drift?

## Pass Criteria

- Characteristic modifier checks match the MGT2E table exactly
- Survival roll exists, displays in the UI, meets target, and has non-negative computed margin
- Skill roll changes exactly one skill by +1
- Advancement roll exists and increases rank by exactly 1 after forced success
- Script exits 0 after capturing evidence and runtime cleanup warnings

## Fail Criteria

- Browser eval cannot inspect Yjs state or required runtime mechanics exports
- Any characteristic DM differs from the MGT2E expected value
- Survival total is below target, `survived` is false, or stored roll is missing
- Skill roll changes zero skills, multiple skills, or changes a skill by anything other than +1
- Advancement does not create an advancement roll, does not set `advanced`, or rank does not increase by exactly 1
- Any uncaught JavaScript exception occurs while running the mechanics checks

## Known Failure Modes

- **Yjs document not exposed** — app runtime may not make `getYDoc()` discoverable through webpack exports; G1 refuses rather than guessing from UI only
- **Characteristic DM drift** — incorrect modifier thresholds cause the pure function check to fail immediately
- **Personal table stat bonus** — rolling on Personal Development can change characteristics instead of skills; G1 intentionally uses Service Skills for skill delta verification
- **Event choice blocks skill phase** — career events that spawn entities or require choices may need additional UI handling before skill training appears
- **Aging not reached** — aging requires enough terms; G1 logs a warning if the optional probe cannot reach aging within the bounded attempt

## MGT2E Rule Coverage

| Rule                                             | Covered          |
| ------------------------------------------------ | ---------------- |
| Characteristic DM thresholds                     | Phase 2          |
| Career assignment survival target check          | Phase 3          |
| Survival success margin (`roll total - target`)  | Phase 3          |
| Skill table roll changes one skill by one level  | Phase 4          |
| Advancement success promotes by exactly one rank | Phase 5          |
| Aging check recorded after enough terms          | Phase 6 optional |
