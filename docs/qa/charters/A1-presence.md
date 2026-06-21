---
id: A1
title: Multi-player presence — player2 sees player1 in session
persona: player
timebox_minutes: 8
tags: [multiplayer, presence, session]
enabled: true
xfail: false
---

# Charter A1 — Multi-Player Presence

## Mission

Verify that when two players join the same chargen session via the invite URL, player2 can observe player1 listed in the ParticipantPanel. This tests basic session sync — presence only, no entity state.

**This is the foundational multi-player test.** If A1 fails, all B-series and C-series charters will also fail.

## Preconditions

| Service    | Required |
| ---------- | -------- |
| web        | yes      |
| fastify    | yes      |
| hocuspocus | yes      |
| postgres   | yes      |
| rag        | optional |
| ollama     | optional |

If hocuspocus is down → SKIP. Multi-player requires Yjs sync.

## Steps

### Player 1 — Host

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
2. **Navigate** to `http://localhost:18120/chargen`
3. **Wait** 2 seconds for session creation
4. **Screenshot**: `screenshots/01-player1-session.png`
5. **Read invite URL** from ParticipantPanel:
   ```bash
   agent-browser get text [data-testid=invite-url]
   ```
   Should return something like `http://localhost:18120/chargen/join/abc123xy`
6. **Capture** the session ID suffix (8-char string at end of URL)
7. **Read** participant list — should show "Agent QA Player 1" (or "Game Master" since first visitor becomes GM)
8. **Take action** if mission requires (e.g., click "Create New Character")
9. **Screenshot**: `screenshots/02-player1-state.png`

### Player 2 — Joiner

10. **Clear session** — navigate to `http://localhost:18120/api/auth/signout` (or use eval to clear localStorage/sessionStorage)
11. **Wait** 1 second
12. **Log in** as `agent-qa-player2@example.com` / `test-password-123`
13. **Navigate** to the invite URL captured in step 6
14. **Wait** up to 15 seconds for SessionJoinModal to render
15. **Screenshot**: `screenshots/03-player2-join-modal.png`
16. **Fill** name field with "QA Player 2"
17. **Click** "Join Session" button
18. **Wait** for redirect to `/chargen`
19. **Screenshot**: `screenshots/04-player2-joined.png`
20. **Read** participant list via `agent-browser get text [data-testid=participant-list]` (or similar selector)
21. **Verify** both players appear in the list

## Verification Checklist

- [ ] Player1 session created successfully
- [ ] Invite URL is visible and well-formed (8-char session ID)
- [ ] SessionJoinModal renders for player2 (NOT "Session Not Found")
- [ ] Player2 successfully joins session
- [ ] ParticipantPanel shows BOTH player1 AND player2
- [ ] No uncaught JavaScript exceptions in either player's session
- [ ] All 4 screenshots captured

## Report Focus

- Did the session creation succeed on `/chargen` for player1?
- Was the invite URL visible in ParticipantPanel?
- Did SessionJoinModal render correctly (not "Session Not Found")?
- After player2 joined, did ParticipantPanel show both players?
- How long did sync take (join → presence visible)?
- Any console errors during join flow?

## Pass Criteria

- Player1 sees their own entry in ParticipantPanel
- Player2 sees player1 AND self in ParticipantPanel after joining
- No JS exceptions

## Fail Criteria

- Invite URL not visible or malformed
- SessionJoinModal shows "Session Not Found"
- ParticipantPanel shows only one player (or neither) after join
- Yjs sync errors in console
- Player2 redirected to fresh `/chargen` (new session) instead of joining existing

## Known Failure Modes

- **Session not created**: `createSession()` in ChargenWizard wasn't called. Should be fixed post-Phase A.
- **Session storage mismatch**: Player2's browser has a different `highport_session_id:graph` in sessionStorage than the invite URL. Should be fixed post-Phase A.
- **IndexedDB persistence hang**: `initAndWaitForPersistence` can hang. The 3-second fallback timer should prevent this.

If any of these reproduce despite Phase A fix, mark XFAIL and capture the specific failure.
