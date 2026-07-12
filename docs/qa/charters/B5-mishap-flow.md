---
id: B5
title: Mishap and failure-path flow
persona: player
timebox_minutes: 12
tags: [failure-path, mishap, survival]
enabled: true
xfail: false
scope: [TermResolutionStep.tsx, ChargenWizard.tsx]
---

# Charter B5 — Mishap and Failure-Path Flow

## Mission

Test the chargen failure path by forcing a survival roll to fail, triggering a mishap, and verifying the wizard redirects to the correct destination after the mishap resolves.

The key question: after a forced survival failure and mishap, does the character enter `mustering_out` for career exit, or does the wizard incorrectly return to `career_selection`?

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

The QA dice failure hook must be available in the loaded MGT2E bundle: `qa-force-roll-failure` sets `window.__qaForceRollFailure = true`, causing targeted rolls such as survival rolls to fail.

## Steps

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123`.
2. **Clear runtime buffers** and capture a clean login screenshot review marker.
3. **Navigate** to `/chargen` and verify the wizard is on `background`.
4. **Install forced roll failure** with `qa-force-roll-failure` after the wizard has mounted.
5. **Create a new character** and wait for the background form.
6. **Fill name** with `B5 Mishap Test`.
7. **Select background skills**: Admin, Animals, Art; verify `Selected: 3/3`.
8. **Advance to career selection** and verify `career_selection`.
9. **Select Drifter**.
10. **Select a Drifter assignment** such as Wanderer, Scavenger, or Barbarian, then verify `term_resolution`.
11. **Roll Survival**. The forced failure hook should make this roll fail.
12. **Verify mishap evidence** appears in the page snapshot, such as `mishap`, `Mishap`, or related failure text.
13. **Accept the mishap** with `Accept Mishap & Leave Career` if that action is visible, because this is the action that triggers the career-exit redirect.
14. **Verify redirect destination** using the same wizard-status mechanism as `assert_wizard_status`:
    - If status is `career_selection`, report the known mishap redirect bug.
    - If status is `mustering_out`, log the correct redirect.
    - If status is neither, log the observed status for investigation.
15. **Check Continue button occlusion** with the shared warning assertion.
16. **Verify runtime cleanliness** and finish.

## Verification Checklist

- [ ] Login completed.
- [ ] `/chargen` loaded and rendered `background`.
- [ ] `qa-force-roll-failure` installed after wizard mount.
- [ ] Character background was completed with name and three skills.
- [ ] Career selection reached.
- [ ] Drifter career and assignment selected.
- [ ] Term resolution reached.
- [ ] Survival roll was attempted under forced failure.
- [ ] Mishap or failure evidence was recorded.
- [ ] Mishap career-exit action was accepted when visible.
- [ ] Redirect destination after mishap was classified.
- [ ] Runtime buffers checked.
- [ ] Screenshots captured at major state changes.

## Report Focus

Where does the wizard redirect after a forced survival-failure mishap?

Capture the URL, wizard status, and whether the destination is the correct `mustering_out` state or the known incorrect `career_selection` state.

## Pass Criteria

B5 passes when the charter drives the forced survival-failure path and correctly reports the redirect outcome. If the known bug is still present, B5 should detect and report it with `qa_report_bug`; if the bug is fixed, B5 should log that the redirect reaches `mustering_out`.

## Fail Criteria

The charter fails if it cannot reach the forced survival roll due to a precondition problem, cannot install the forced failure hook after wizard mount, cannot detect or classify the post-mishap redirect, or reports an unrelated app bug before reaching the redirect check.
