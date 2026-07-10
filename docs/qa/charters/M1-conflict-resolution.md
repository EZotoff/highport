---
id: M1
title: Conflict Resolution — Simultaneous Edits, CRDT Merge, Entity Lifecycle
persona: player
timebox_minutes: 18
tags: [multiplayer, conflict-resolution, crdt, sync, entity-lifecycle, mgt2e]
enabled: true
xfail: false
---

# Charter M1 — Conflict Resolution & CRDT Merge

## Mission

Verify that the Yjs CRDT layer correctly handles simultaneous edits from two players, propagates entity lifecycle events (create, update, delete) across sessions, and maintains entity pool consistency without duplicates or lost updates.

This is the **deepest multiplayer test** — pushing past basic presence (A1) and shared visibility (B1) into real-time conflict resolution, independent wizard advancement, and entity lifecycle synchronization.

## Preconditions

| Service    | Required |
| ---------- | -------- |
| web        | yes      |
| fastify    | yes      |
| hocuspocus | yes      |
| postgres   | yes      |
| rag        | optional |
| ollama     | optional |

All required services must be up. Reject if any required service is unreachable.

## Key Context

- **CRDT layer**: Yjs via Hocuspocus (port 18121) handles conflict-free sync. All entity mutations flow through the shared Yjs document. The CRDT guarantees eventual consistency — conflicts are merged deterministically without data loss.
- **Entity pool**: The right-rail panel showing all characters in the session. Data flows: Player creates character → Yjs doc updated → Hocuspocus broadcasts → other clients receive update → entity pool re-renders.
- **Participant panel**: Shows all connected users in the session.
- **Sync latency**: On localhost, Yjs sync typically completes in <1s. The charter polls with 1s sleeps and expects updates within 3s.
- **Session names**: `qa` for Alpha, `qa-session-bravo` for Bravo.

## Steps

### Setup & Session Creation (Alpha)

1. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
2. **Navigate** to `/chargen`
3. **Wait** for wizard to render
4. **Capture** the invite URL from the participant panel or DOM
5. **Click** "Create New Character"
6. **Fill** character name: "M1 Alpha Agent"
7. **Select** background skills: Admin, Animals, Art
8. **Screenshot**: `alpha-background-complete`

### Bravo Joins & Mutual Presence (Shared Session)

9. **Log in** (separate session `qa-session-bravo`) as `agent-qa-player2@example.com`
10. **Navigate** to the invite URL captured in step 4
11. **Fill** name field with "M1 Bravo Operator"
12. **Click** "Join Session"
13. **Wait** for redirect to `/chargen`
14. **Verify** Bravo sees Alpha in participant panel
15. **Verify** Alpha sees Bravo in participant panel
16. **Screenshots**: `bravo-mutual-presence`, `alpha-mutual-presence`

### Real-Time Skill Sync (CRDT Propagation)

17. **Alpha** selects additional skills: Carouse, Deception, Drive
18. **Poll Bravo** 3 times with 1s sleeps — look for updated skill names or "Selected: 6" text
19. **Verify** Bravo detects the update within 2s (by poll #2)
20. **Screenshots**: `alpha-skills-updated`, `bravo-after-alpha-skills`

### Simultaneous Independent Advance (No State Corruption)

21. **Alpha** clicks "Continue →" to advance to career selection
22. **Bravo** also clicks "Continue" (independent wizard nav within shared session)
23. **Wait** 3s for sync propagation
24. **Verify** Alpha wizard shows career selection — no corruption
25. **Verify** Bravo snapshot contains no error markers (`error`, `corrupt`, `undefined`, `null`, `NaN`, `TypeError`, `Uncaught`)
26. **Screenshots**: `alpha-career-selection`, `bravo-after-simultaneous-advance`

### Entity Pool Expansion (Second Character Sync)

27. **Alpha** looks for "Create New Character" or "Add Character" control
28. If available: creates second character "M1 Recon Specialist" with skills Investigate, Recon
29. **Poll Bravo** up to 5s for entity pool update showing the second character
30. **Verify** no duplicate entities — "M1 Alpha Agent" appears exactly once
31. **Screenshots**: `alpha-second-character`, `bravo-entity-pool-after-second`

### Entity Deletion Sync (Bravo Removes Character)

32. **Bravo** locates delete/remove control for their character
33. If available: clicks delete, confirms if dialog appears
34. **Poll Alpha** up to 5s — "M1 Bravo Operator" should no longer appear
35. **Verify** Alpha's UI no longer shows Bravo's character
36. **Screenshots**: `bravo-after-delete`, `alpha-after-bravo-delete`

### Cleanup

37. Close Bravo's browser session
38. Remove Bravo's temp profile directory
39. Runtime assertions (console errors, network failures — warn only)
40. Exit 0

## Verification Checklist

- [ ] Alpha successfully created "M1 Alpha Agent" with background skills
- [ ] Invite URL captured and reused by Bravo
- [ ] Both players see each other in participant panel (mutual presence)
- [ ] Bravo detects Alpha's skill change within 3s (real-time sync)
- [ ] Alpha wizard advances to career selection without corruption
- [ ] Bravo shows no error/corruption markers after simultaneous advance
- [ ] Alpha's second character appears in Bravo's entity pool (if UI supports it)
- [ ] No duplicate entities in entity pool
- [ ] Bravo's character disappears from Alpha's view after deletion (if UI supports it)
- [ ] No uncaught JavaScript exceptions
- [ ] All screenshots captured
- [ ] Bravo session cleaned up (no daemon leak)

## Report Focus

- Did CRDT merge produce duplicates? (worst-case bug)
- Did any player see stale/conflicting state after simultaneous advances?
- What was the measured sync latency for skill propagation?
- Did entity lifecycle events (create, delete) propagate correctly?
- Were any error markers visible in the Bravo snapshot after the advance?
- Did the participant panel stay consistent across both sessions?

## Pass Criteria

- Bravo detects Alpha's skill update within 3s
- No corruption markers in Bravo after simultaneous advance
- No duplicate entities in entity pool
- Mutual presence confirmed (both see each other)
- No fatal console/network errors
- Bravo cleanup succeeds

## Fail Criteria

- CRDT produces duplicate entities (two "M1 Alpha Agent" entries)
- Bravo shows error state (`TypeError`, `null` reference, corrupted DOM) after simultaneous advance
- Entity creation not visible within 5s (sync broken)
- Entity deletion not propagated within 5s
- Yjs doc name mismatch (session sharing bug)
- Console errors with fatal severity

## Known Failure Modes

- **Duplicate entity spawn**: CRDT merge of simultaneous character creation produces two identical entities → duplicates list
- **Yjs sync stall**: Hocuspocus connection drops silently; one player's mutations never reach the other
- **Wizard state desync**: Bravo's wizard advances to a different phase than Alpha's, causing confusion
- **Entity pool not reactive**: Entity added but pool re-render doesn't fire → Bravo never sees it
- **Delete not propagated**: Delete event fires locally but Yjs doesn't broadcast the removal

## MGT2E Rule Coverage Notes

This charter does not validate specific MGT2E rules. It validates the **multiplayer infrastructure** that all subsequent charters depend on. The CRDT layer must be proven robust before gameplay-rule charters (B2, B3, B4, B5) can produce reliable results.

A CRDT failure here would corrupt any subsequent test's entity state, producing false positives/negatives across the entire multiplayer charter suite.
