---
id: C1
title: Career matrix mechanics verification
persona: player
timebox_minutes: 20
tags: [chargen, careers, mgt2e, mechanics]
enabled: true
xfail: false
scope:
  [
    packages/mgt2e/src/data/srd/careers,
    apps/web/components/chargen/steps/CareerSelectionStep.tsx,
    apps/web/components/chargen/steps/TermResolutionStep.tsx,
    apps/web/components/chargen/steps/MusteringOutStep.tsx,
  ]
---

# Charter C1 — Career Matrix Mechanics Verification

## Mission

Verify that one parameterized career charter can exercise career-specific MGT2E chargen mechanics without maintaining twelve separate scripts. Run `docs/qa/scripts/C1-career-matrix.sh` with `CAREER=<name>` to confirm the selected career qualifies correctly, uses the expected assignment survival target, renders career-specific skill outcomes, progresses rank or officer status where applicable, fires career-flavored events, and produces mustering-out benefits from that career's benefit table.

This charter covers:

- Qualification and assignment selection for the selected career
- Survival target display for the selected assignment
- Skill table rendering and career-specific skill gain from Assignment Skills
- Rank progression, including Navy commission path when applicable
- Career event content from the selected career data
- Mustering-out benefit output from the selected career benefit table

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

- Script path: `docs/qa/scripts/C1-career-matrix.sh`
- The script reads the career under test from `CAREER`, defaulting to `Drifter`.
- Initial matrix careers: `Army`, `Navy`, `Merchant`, and `Scholar`; `Drifter` remains available as the default control path.
- Career data comes from `packages/mgt2e/src/data/srd/careers/*.ts`.
- The script enables `qa-force-roll-success` after the wizard mounts; because qualification and 1d6 table rolls are currently untargeted dice calls, it retries qualification and verifies broad per-career result patterns instead of depending on one fixed roll.
- Qualification cards show the career qualification target; assignment cards show the assignment survival and advancement targets.
- The Skill Training UI renders table buttons in `TermResolutionStep.tsx`; the selected Assignment Skills result must match the selected career/assignment, not Drifter data.
- Mustering Out renders the selected career name, rolls remaining, cash rolls, and collected benefits in `MusteringOutStep.tsx`.
- Test user: `agent-qa-player1@example.com` / `test-password-123`

## Steps

### Phase 1: Select Career Under Test

1. **Set** the career under test, for example:
   ```bash
   CAREER=Army bash docs/qa/scripts/C1-career-matrix.sh
   ```
2. **Log in** as `agent-qa-player1@example.com` / `test-password-123`.
3. **Navigate** to `/chargen`.
4. **Create** a new character.
5. **Complete** the background step by filling a name and selecting three background skills.
6. **Advance** to career selection.
7. **Verify** the career qualification target for the selected career is visible.

### Phase 2: Qualification and Assignment

8. **Select** the requested career by locating its card in the snapshot and clicking its career-local join control.
9. **For non-Drifter careers**, force roll success, retry if the untargeted qualification roll still fails, and verify the qualified state renders.
10. **Choose** the configured assignment for that career.
11. **Verify** `data-chargen-status` = `"term_resolution"`.
12. **Verify** the assignment survival target is visible in Phase 1: Survival.

### Phase 3: Survival, Event, and Skill Table

13. **Roll Survival** with QA success forcing enabled.
14. **Verify** the survival result shows `SURVIVED`.
15. **Roll Event** and verify the result against the selected career's event text patterns.
16. **Verify** event text contains career-specific content for the selected career.
17. **Continue** from the event phase.
18. **Verify** Phase 3: Skill Training renders.
19. **Verify** Personal Development, Service Skills, and Assignment Skills table buttons are visible and not overflowing.
20. **Select** Assignment Skills.
21. **Roll 1d6** for a skill.
22. **Verify** the gained skill matches the selected career's configured assignment skill table.

### Phase 4: Rank Progression

23. **For Navy**, attempt commission and verify the officer path shows an officer rank result.
24. **For other careers with commission controls**, skip commission to test standard advancement.
25. **Roll Advancement** when advancement is available.
26. **Verify** rank progression output appears for the selected career.
27. **Screenshot** the rank result.

### Phase 5: Mustering Out

28. **Click** Muster Out from the completed term panel.
29. **Verify** `data-chargen-status` = `"mustering_out"`.
30. **Verify** the mustering panel names the selected career.
31. **Roll Benefits** and verify the result against the selected career's benefit table patterns.
32. **Verify** the collected benefit matches the selected career's benefit table.
33. **Screenshot** the mustering benefit state.

## Verification Checklist

### Parameterization

- [ ] `CAREER` defaults to `Drifter` when unset
- [ ] `CAREER=Army` selects Army and Support assignment
- [ ] `CAREER=Navy` selects Navy and Line/Crew assignment
- [ ] `CAREER=Merchant` selects Merchant and Merchant Marine assignment
- [ ] `CAREER=Scholar` selects Scholar and Scientist assignment
- [ ] Unsupported career names exit with precondition failure code `2`

### Qualification and Survival

- [ ] Non-Drifter qualification roll reaches the qualified state
- [ ] Drifter path uses auto-qualification without rolling qualification
- [ ] Qualification target text matches the selected career
- [ ] Survival target text matches the selected assignment
- [ ] Roll Survival succeeds under QA force-success mode

### Career-Specific Mechanics

- [ ] Event text contains selected career content
- [ ] Skill table buttons render without overflow
- [ ] Assignment Skills roll yields a skill from the selected career assignment
- [ ] Skill result is not from an unrelated Drifter-only assignment table
- [ ] Rank progression or officer commission result appears when applicable
- [ ] Mustering-out benefit matches the selected career benefit table

### Exit Protocol and Evidence

- [ ] Script exits `0` on success
- [ ] Script exits `1` through `qa_report_bug` for confirmed app defects
- [ ] Script exits `2` through `qa_refuse` for precondition failures
- [ ] Evidence screenshots and `actions.log` are written under `.sisyphus/evidence/C1-career-matrix-<career>/`
- [ ] `assert_runtime_clean_warn` runs before `qa-finish success`

## Report Focus

- **Matrix coverage**: Which `CAREER` value was tested, and which assignment path did it exercise?
- **Career data fidelity**: Did qualification, survival, skills, event text, ranks, and benefits match `packages/mgt2e` career data?
- **Drifter separation**: Did non-Drifter skill results come from the selected career instead of the Drifter fallback path?
- **Officer/rank path**: Did Navy commission or standard advancement produce the expected rank output?
- **Mustering benefits**: Did benefit output come from the selected career's benefit table?

Record the exact `CAREER` value, assignment selected, survival target observed, skill gained, rank output, event excerpt, and benefit received.

## Pass Criteria

- The script is syntactically valid under `bash -n`.
- The script sources `qa-assertions.sh` and uses QA wrapper helpers for browser actions and assertions.
- `CAREER` parameterization selects the requested supported career.
- Qualification succeeds for non-Drifter careers and Drifter auto-qualifies.
- Survival target, event text, skill result, rank output, and mustering benefit all match the selected career data.
- Runtime cleanup warning check and `qa-finish success` execute on the success path.

## Fail Criteria

- `CAREER` is ignored or all runs select Drifter.
- Non-Drifter qualification cannot reach the assignment chooser under QA success forcing.
- Survival target text does not match the selected assignment.
- Skill Training renders Drifter-only skill output for a non-Drifter career.
- Rank progression or Navy commission controls are missing when expected.
- Mustering out shows a benefit outside the selected career benefit table.
- Any uncaught JavaScript exception blocks the career flow.

## Known Failure Modes

- **Qualification force hook mismatch** — qualification currently computes success outside a target-aware dice call, so the script retries the career join path if an untargeted qualification roll fails despite `qa-force-roll-success` being enabled.
- **Career event choices or spawned entities** — some event rolls can require extra UI handling; the script seeds event rolls to a deterministic path with simple continuation for the initial matrix careers.
- **Mustering benefit randomness** — benefit rolls are 1d6 table rolls, so the script checks the collected result against the career's full benefit pattern rather than one expected fixed result.
- **No `data-chargen-status` fallback** — this charter relies on the wizard status attribute for top-level FSM state checks.

## MGT2E Rule Coverage

| Rule                                  | Covered |
| ------------------------------------- | ------- |
| Career qualification                  | Phase 2 |
| Assignment survival target            | Phase 2 |
| Survival roll                         | Phase 3 |
| Career event roll                     | Phase 3 |
| Assignment skill table roll           | Phase 3 |
| Commission/officer path for Navy      | Phase 4 |
| Standard advancement/rank progression | Phase 4 |
| Mustering-out benefit table           | Phase 5 |
