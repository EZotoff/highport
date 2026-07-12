---
id: A2
title: Keyboard-only navigation
persona: player
timebox_minutes: 15
tags: [accessibility, keyboard, a11y]
enabled: true
xfail: false
scope: [ChargenWizard.tsx, all step components]
---

# Charter A2 — Keyboard-only Navigation

## Mission

Verify that a player can complete the chargen Background step and advance to Career Selection using keyboard input only: Tab to move focus, Enter to activate buttons, Space to toggle background skills, and typed text for the character name.

> **Scope note**: This charter tests keyboard-only navigation through the **chargen background step** (post-login). Login uses the standard `qa-login` function for reliability. A separate keyboard-login test can be added when the login form's keyboard interaction is stabilized.

This is an accessibility charter. It should find keyboard traps, unreachable controls, missing focus indicators, or controls that require a mouse.

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

## Steps

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123` using the harness baseline login helper.
2. **Navigate** to `http://localhost:18120/chargen`.
3. **Verify** the wizard is on the Background step.
4. **Track focus** with `document.activeElement` after each keyboard action.
5. **Focus** the `Create New Character` button and activate it with Enter.
6. **Tab** through the Background form until focus reaches the character name input.
7. **Type** `A2 Keyboard Test` into the focused name input using keyboard input.
8. **Tab** to the Admin skill control and toggle it with Space.
9. **Tab** to the Animals skill control and toggle it with Space.
10. **Tab** to the Art skill control and toggle it with Space.
11. **Verify** the page reports `Selected: 3/3`.
12. **Tab** to the Continue button.
13. **Verify** the focused Continue button has a visible focus indicator.
14. **Activate** Continue with Enter.
15. **Verify** the wizard advances to `career_selection`.
16. **Capture** screenshots and runtime state.

## Verification Checklist

- [ ] Focus order is logical from the Background entry point through name, skills, and Continue.
- [ ] Focus ring or equivalent visible focus indicator appears on the active control.
- [ ] No keyboard trap prevents reaching required controls.
- [ ] Create New Character is reachable and activatable by keyboard.
- [ ] Name input is reachable and editable by keyboard.
- [ ] Required skill controls are reachable and toggle with Space.
- [ ] Continue is reachable and activates with Enter.
- [ ] Wizard advances from Background to Career Selection.

## Report Focus

- Which elements received focus, in order?
- Did `document.activeElement` ever become stuck on one control while Tab was pressed?
- Did focused controls show an outline or box-shadow focus indicator?
- Were Admin, Animals, and Art reachable by keyboard?
- Did Space toggle each selected skill?
- Did Enter activate Create New Character and Continue?
- Any console or runtime errors?

## Pass Criteria

All required controls are reachable and operable with keyboard input only, focus remains visible, no keyboard trap occurs, and the wizard advances from `background` to `career_selection`.

## Fail Criteria

Any checklist item fails. Common failure modes:

- A required control cannot be reached with Tab.
- Focus becomes trapped before the Continue button.
- Focus reaches a required control but no visible focus indicator is present.
- Enter does not activate Create New Character or Continue.
- Space does not toggle a focused skill control.
- The flow requires a mouse click or eval `.click()` to proceed.
- Wizard remains on Background after keyboard activation of Continue.
