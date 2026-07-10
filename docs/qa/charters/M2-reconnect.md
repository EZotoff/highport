---
id: M2
title: Session Disconnect and Reconnect Recovery
persona: player
timebox_minutes: 12
tags: [persistence, hocuspocus, yjs, reconnect, websocket]
enabled: true
xfail: false
scope: [ChargenWizard.tsx, lib/sync.ts, hocuspocus]
---

# Charter M2 — Session Disconnect and Reconnect Recovery

## Mission

Create a new character, complete the background step, advance to career selection, close the ENTIRE browser session (simulating a client disconnect), wait, reopen the session and log in again, then verify the character state survives via Hocuspocus WebSocket reconnection and Yjs/IndexedDB-based recovery.

This is a stronger test than P1 (page refresh). Closing the browser session tears down the Hocuspocus WebSocket connection entirely. On reopen, the client must reconnect to Hocuspocus and re-sync the Yjs document from server-side persistence. P1 only tests HTTP page reload; M2 tests full WebSocket disconnect/reconnect.

## Preconditions

| Service    | Required |
| ---------- | -------- |
| web        | yes      |
| fastify    | yes      |
| hocuspocus | yes      |
| postgres   | yes      |
| rag        | optional |
| ollama     | optional |

If any required service is down → SKIP with reason `"services not running"`. Hocuspocus is required because this charter tests WebSocket-backed CRDT recovery, and Postgres is required for authenticated chargen state persistence.

## Key Context

- **Session profile**: `~/.agent-browser/sessions/$QA_SESSION` persists IndexedDB data across browser close/reopen cycles. The `/tmp/qa/$QA_SESSION` profile directory must survive the disconnect period.
- **Reconnect flow**: After `agent-browser --session "$QA_SESSION" close`, the Hocuspocus WebSocket disconnects. On reopen, the client reconnects and Yjs syncs from the server-side document (stored in PostgreSQL via Hocuspocus persistence).
- **Manual login required**: The `qa-login` helper destroys session data (`rm -rf /tmp/qa/$QA_SESSION`), so M2 uses a manual login after reopen that preserves the IndexedDB state needed for Yjs sync.
- **Known bug from P1 (2026-07-09)**: "Background skills not persisted across refresh" — skills Admin/Animals/Art selected before refresh are gone after refresh. M2 may detect this same bug through a stronger disconnect.
- **Test user**: `agent-qa-player1@example.com` / `test-password-123`

## Steps

1. **Login** as player1 and navigate to `/chargen`
2. **Create** a new character named `M2 Reconnect`
3. **Select** three background skills: Admin, Animals, Art
4. **Continue** to Career Selection (`career_selection`)
5. **Capture** pre-disconnect state: character name, wizard status, skill selections
6. **Close** the browser session: `agent-browser --session "$QA_SESSION" close`
7. **Wait** 3 seconds (simulates client disconnect duration)
8. **Reopen** the browser session with the same `--profile` to preserve IndexedDB
9. **Log in** again manually (preserving session data)
10. **Navigate** to `/chargen`
11. **Verify** the character name `M2 Reconnect` is still present
12. **Verify** the wizard status is `career_selection` (not fallen back to `background`)
13. **Verify** background skills survived (either `Selected: 3/3` count or individual skill names)
14. **Select** a career and **Continue** to `term_resolution` — proves the wizard is fully functional after reconnect
15. **Screenshot** each major state transition

## Verification Checklist

- [ ] Initial login completed
- [ ] Wizard started at `background`
- [ ] Character named `M2 Reconnect` created
- [ ] Three background skills selected (Admin, Animals, Art)
- [ ] Wizard advanced to `career_selection`
- [ ] Pre-disconnect evidence captured (name, status, skills)
- [ ] Browser session closed successfully
- [ ] 3-second disconnect wait completed
- [ ] Browser session reopened with preserved profile
- [ ] Re-login succeeded (URL is not `/login`)
- [ ] `/chargen` loaded without redirect to `/login`
- [ ] Character name `M2 Reconnect` survived session disconnect
- [ ] Wizard status recovered to `career_selection` (not `background`)
- [ ] Background skill selections survived
- [ ] Career selected and wizard advanced to `term_resolution`
- [ ] No uncaught JavaScript exceptions or fatal network failures
- [ ] Screenshots captured at each verification point

## Pass Criteria

All verification checklist items pass. After session close/reopen:

- The character `M2 Reconnect` is still present
- The wizard status is `career_selection`
- The selected background skills (Admin, Animals, Art) are preserved
- The wizard can be advanced forward to `term_resolution`

## Fail Criteria

Any checklist item fails. Common failure modes:

- Session close/reopen resets state — new chargen session instead of restoring existing one
- Wizard status falls back from `career_selection` to `background`
- Character name `M2 Reconnect` is missing after reconnect
- Background skills Admin, Animals, Art are missing after reconnect
- Hocuspocus WebSocket reconnection stalls indefinitely (>10s)
- Yjs document fails to sync from server (IndexedDB stale, server document lost)
- Login after reopen redirects to unexpected page
- Wizard cannot advance to `term_resolution` after reconnect (broken continuation)

## Report Focus

- Did the Hocuspocus WebSocket reconnect successfully within 3 seconds?
- Did Yjs restore the wizard state from server-side persistence without falling back to `background`?
- Did the character name remain visible after reconnect?
- Did selected background skills remain visible or otherwise detectable after reconnect?
- Were there WebSocket connection errors, sync errors, or visible loading stalls during recovery?
- Was the wizard still fully functional — could it advance to `term_resolution`?

## Relationship to P1

| Aspect             | P1 Page Refresh                            | M2 Session Reconnect                              |
| ------------------ | ------------------------------------------ | ------------------------------------------------- |
| Trigger            | `agent-browser open <same-url>`            | `agent-browser close` + reopen                    |
| Connection         | HTTP stays alive (WebSocket may reconnect) | WebSocket fully torn down and re-established      |
| IndexedDB          | Survives page reload                       | Survives session close/reopen (profile persisted) |
| Test scope         | Client-side state via IndexedDB only       | Server-side persistence + WebSocket reconnection  |
| Known bug coverage | Background skills lost on refresh          | May detect same bug through stronger disconnect   |
