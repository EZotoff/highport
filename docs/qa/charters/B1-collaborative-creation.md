---
id: B1
title: Collaborative character creation — entity visibility
persona: player
timebox_minutes: 12
tags: [multiplayer, creation, entity-pool, mgt2e]
enabled: true
xfail: false
---

# Charter B1 — Collaborative Character Creation

## Mission

Verify that when player1 creates a character and selects a background, player2 (in the same session) can observe the character appearing in the entity pool or wizard.

This is the first test of **real collaborative state** — not just presence, but actual character data flowing between browsers via Yjs.

## Preconditions

| Service    | Required |
| ---------- | -------- |
| web        | yes      |
| fastify    | yes      |
| hocuspocus | yes      |
| postgres   | yes      |
| rag        | optional |
| ollama     | optional |

## Steps

### Player 1 — Creates Character

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
2. **Navigate** to `/chargen`
3. **Wait** for wizard to render
4. **Capture invite URL**: `agent-browser get text [data-testid=invite-url]`
5. **Screenshot**: `screenshots/01-player1-wizard.png`
6. **Click** "Create New Character" button (if visible)
7. **Wait** for background step to render
8. **Read** the background options available:
   ```bash
   agent-browser snapshot
   ```
   Look for career/background cards (e.g., "Drifter", "Scholar", etc.)
9. **Select** any background by clicking its card or button (prefer "Drifter" if available — it's the only one in-repo per ROADMAP)
10. **Wait** 3-5 seconds for any Yjs sync to settle
11. **Screenshot**: `screenshots/02-player1-background-selected.png`
12. **Read** character name from wizard header (if available)

### Player 2 — Observes Shared State

13. **Sign out** via `/api/auth/signout`
14. **Log in** as `agent-qa-player2@example.com` / `test-password-123`
15. **Navigate** to the invite URL captured in step 4
16. **Wait** for SessionJoinModal
17. **Fill** "QA Player 2" name
18. **Click** "Join Session"
19. **Wait** for redirect to `/chargen` (up to 15 seconds)
20. **Screenshot**: `screenshots/03-player2-joined.png`
21. **Read** the entity pool panel:
    ```bash
    agent-browser get text [data-testid=entity-pool]
    ```
    OR fall back to reading the right rail of the wizard
22. **Look** for player1's character by name or "Drifter" background
23. **Screenshot**: `screenshots/04-player2-entity-pool.png`
24. **Read** the wizard main area:
    ```bash
    agent-browser snapshot
    ```
25. **Verify** shared state is visible — either:
    - Player1's character appears in entity pool, OR
    - Player1's character appears in the wizard canvas, OR
    - The participant list shows player1 has a character in progress

## Verification Checklist

- [ ] Player1 successfully created a character (wizard moved past initial state)
- [ ] Player1 selected a background
- [ ] Invite URL was captured and reused
- [ ] Player2 joined the same session
- [ ] Player2 can observe evidence of player1's character:
  - [ ] Character appears in entity pool, OR
  - [ ] Character appears in wizard canvas, OR
  - [ ] Background selection is visible in shared state
- [ ] No uncaught JavaScript exceptions
- [ ] All 4 screenshots captured

## Report Focus

- Did player1's character creation produce visible shared state?
- What did player2 see in the entity pool? (quote the text)
- What did player2 see in the wizard canvas?
- Did the participant list show both players?
- Did the Yjs doc sync correctly (any errors)?
- How long did sync take?

## Pass Criteria

- Player2's browser shows ANY evidence of player1's character (entity pool, wizard canvas, or shared character list)
- No JS exceptions

## Fail Criteria

- Player2 sees "No entities spawned yet" or empty state
- Player2's entity pool doesn't match player1's
- Yjs doc name mismatch (would indicate session bug not fixed)
- Player2 in a different session entirely

## Known Failure Modes

- **Session sharing still broken** (Phase A fix incomplete) — player2 ends up in fresh session
- **Entity pool not subscribed to Yjs updates** — entities are written but not read back
- **Background selection doesn't write to Yjs** — local-only state
- **Race condition** — player2 joins before player1's character is persisted

If the entity pool shows nothing despite correct session sharing, the bug is in entity pool wiring, not session sharing.

## MGT2E Rule Coverage Notes

This charter covers the **background step** of MGT2E chargen:

- Roll 2d6 for each of: Strength, Dexterity, Endurance, Intellect, Education, Social Standing
- Apply homeworld modifiers
- Select background skill package

Per ROADMAP, mechanics are ~95% complete. Only the Drifter career has data. Selecting Drifter is acceptable for this charter.
