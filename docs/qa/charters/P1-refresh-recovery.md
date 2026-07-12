---
id: P1
title: Page refresh and state recovery
persona: player
timebox_minutes: 10
tags: [persistence, recovery, yjs]
enabled: true
xfail: false
scope: [ChargenWizard.tsx, lib/sync.ts]
---

# Charter P1 — Page Refresh and State Recovery

## Mission

Create a new character, complete the background step, refresh the browser page, and verify the character state survives the refresh via Yjs and IndexedDB persistence.

The run specifically verifies that the character name, wizard status, and selected background skills remain available after reloading the current `/chargen` URL.

## Preconditions

| Service    | Required |
| ---------- | -------- |
| web        | yes      |
| fastify    | yes      |
| hocuspocus | yes      |
| postgres   | yes      |
| rag        | optional |
| ollama     | optional |

If any required service is down → SKIP with reason `"services not running"`. Hocuspocus is required because this charter tests Yjs-backed recovery, and Postgres is required for authenticated chargen state.

## Steps

1. **Open** `http://localhost:18120/login`
2. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
3. **Navigate** to `http://localhost:18120/chargen`
4. **Verify** the wizard starts on the Background step
5. **Create** a new character
6. **Fill** the character name with `P1 Test`
7. **Select** exactly three background skills: Admin, Animals, and Art
8. **Verify** `Selected: 3/3` is visible
9. **Continue** to Career Selection
10. **Capture** the current URL, wizard status, and pre-refresh character evidence
11. **Refresh** by opening the captured current URL again in the same browser session
12. **Wait** for the visual state to settle
13. **Verify** the wizard is still on `career_selection`
14. **Verify** the character name `P1 Test` is still present
15. **Verify** the selected background skills survived, either via `Selected: 3/3` or visible skill names
16. **Screenshot** each major state transition

## Verification Checklist

- [ ] Login completed (URL is not `/login`)
- [ ] `/chargen` loaded without redirect to `/login`
- [ ] Background wizard step rendered
- [ ] Character named `P1 Test` was created
- [ ] Admin, Animals, and Art were selected as background skills
- [ ] Wizard advanced to `career_selection`
- [ ] Refresh completed on the captured current URL
- [ ] Wizard status remained `career_selection` after refresh
- [ ] Character name survived refresh
- [ ] Background skill selections survived refresh
- [ ] No uncaught JavaScript exceptions or fatal network failures
- [ ] Screenshots captured

## Report Focus

- Did the reload preserve the active chargen session?
- Did Yjs/IndexedDB restore the current wizard step without returning to Background?
- Did the character name remain visible after refresh?
- Did selected background skills remain visible or otherwise detectable after refresh?
- Were there runtime errors, sync errors, or visible loading stalls during recovery?

## Pass Criteria

All verification checklist items pass. After refresh, the wizard is still on `career_selection`, `P1 Test` is present, and the selected skills are still represented by either the selection count or visible skill names.

## Fail Criteria

Any checklist item fails. Common failure modes:

- Page reload starts a new chargen session instead of restoring the existing one
- Wizard status changes from `career_selection` back to `background`
- Character name `P1 Test` is missing after refresh
- Background skills Admin, Animals, and Art are missing after refresh
- Hocuspocus or IndexedDB recovery stalls indefinitely
- Console/runtime errors occur during refresh recovery
