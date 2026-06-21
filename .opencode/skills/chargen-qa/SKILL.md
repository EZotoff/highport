---
name: chargen-qa
description: Agentic QA for the Highport multi-player character creation flow. Drives a real browser through chargen charters via agent-browser, verifies multi-player sync, and scores UI readability. Use when the user says "chargen-qa", "test chargen", "run charter", or invokes /chargen-qa <id>.
user-invocable: true
argument-hint: '[charter-id|all|list]'
---

# Chargen QA — Agentic Test Harness

Run charter-driven QA against the live Highport web app at http://localhost:18120. Each charter is a markdown file in `docs/qa/charters/`. The agent (you) drives a real browser via `agent-browser`, takes screenshots, and writes a markdown report.

This is NOT a Playwright e2e. Non-deterministic OK. The point is to discover gaps a deterministic test cannot.

## Argument

- `/chargen-qa list` — list available charters
- `/chargen-qa S0` — run one charter by id
- `/chargen-qa all` — run every enabled charter sequentially
- `/chargen-qa` (no arg) — show the list and ask which to run

## Preconditions

Before running any charter:

1. **Probe services** — run `agent-browser open http://localhost:18122/health` and check for a healthy response. If fastify is down, the whole stack is probably down. Tell the user to start services and abort.
2. **Verify auth endpoint** — `agent-browser open http://localhost:18122/api/auth/verify` should return 401 (not connection refused).
3. If services are down, do NOT attempt charters. Report "Services not running" and suggest `pnpm dev` from repo root.

## Test Users (pre-registered)

These accounts already exist in the database (registered via Fastify `/api/auth/register`):

| Role    | Email                        | Password          | User ID prefix |
| ------- | ---------------------------- | ----------------- | -------------- |
| player1 | agent-qa-player1@example.com | test-password-123 | user_f0c51f... |
| player2 | agent-qa-player2@example.com | test-password-123 | user_7d6c9b... |

If a login fails with 401, re-register via:

```bash
curl -X POST http://localhost:18122/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent-qa-player1@example.com","password":"test-password-123","name":"Agent QA Player 1"}'
```

409 Conflict = already exists, that's fine. 400 = bad payload.

## Browser Automation Primer

Use `agent-browser` CLI. Key commands:

```bash
agent-browser open <url>              # navigate
agent-browser screenshot [path]       # PNG snapshot
agent-browser snapshot                # accessibility tree (for AI reading)
agent-browser click <sel>             # click by CSS selector
agent-browser fill <sel> <text>       # clear + type
agent-browser type <sel> <text>       # append type
agent-browser press Enter             # key press
agent-browser eval "js expression"    # run JS, get result
agent-browser get text <sel>          # read text content
agent-browser get url                 # current URL
agent-browser get title               # page title
agent-browser wait <sel|ms>           # wait for element or time
```

**Reading state**: prefer `agent-browser snapshot` (accessibility tree) over `eval` for understanding what's on screen. The snapshot is designed for AI consumption and includes element refs like `@btn-3`.

**Selectors**: prefer `data-testid` attributes, then ARIA roles, then text content. Avoid brittle CSS classes.

**Screenshots**: always capture after major state changes (login, navigation, button clicks that transition the wizard).

## Login Flow

All charters except `U1` (which can browse unauthenticated) require login.

```
1. agent-browser open http://localhost:18120/login
2. agent-browser snapshot
3. agent-browser fill [name=email] agent-qa-player1@example.com
4. agent-browser fill [name=password] test-password-123
5. agent-browser click button[type=submit]
6. agent-browser wait 2000
7. agent-browser get url
   - If URL contains /login → login failed, abort charter
   - If URL is / or /chargen → success
8. agent-browser screenshot
```

## Multi-Player Invite Flow (sequential, single browser)

For charters A1 and B1, two players must share a session. Sequential flow:

**Player 1 (host):**

```
1. Log in as player1
2. Navigate to /chargen
3. Read invite URL from ParticipantPanel:
   agent-browser get attr href [data-testid=invite-url]
   OR
   agent-browser get text [data-testid=invite-url]
   The URL looks like: http://localhost:18120/chargen/join/abc123xy
4. Capture the session ID (the 8-char suffix)
5. Perform player1's mission actions (create character, select background, etc.)
6. Take screenshot of state
```

**Player 2 (joiner):**

```
1. Log out (navigate to /api/auth/signout, or clear cookies via eval)
2. Log in as player2
3. Navigate to the invite URL captured above
4. SessionJoinModal should appear within 15 seconds
5. Fill name field with "Player 2 QA"
6. Click "Join Session" button
7. Verify redirect to /chargen
8. Verify ParticipantPanel shows both players
9. Perform player2's mission actions
10. Take screenshot of state
```

**Important**: The invite URL is regenerated on each page load. Capture it ONCE at the start of player1's flow and reuse it. Do NOT navigate to `/chargen` directly as player2 — that generates a new session.

### Alternative: parallel multi-browser (advanced)

For true cross-browser testing, spawn subagents:

```
task(subagent_type="general", description="Player 1 browser session", prompt="...")
task(subagent_type="general", description="Player 2 browser session", prompt="...")
```

Each subagent runs its own `agent-browser` instance with `--session-name playerN`. They coordinate via the invite URL (player1 captures, passes to player2 via the task prompt).

**Limitation**: `agent-browser --session-name` does NOT fully isolate cookies/localStorage between sessions today. For real isolation, use `--profile <name>` (requires daemon restart between profiles). Sequential single-browser is more reliable.

## Chargen FSM (Finite State Machine)

The wizard has 5 states. Each step must complete before advancing.

| Status             | Meaning                                                | How to detect (DOM)                                          |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------ |
| `background`       | Rolling characteristics + picking background           | URL=/chargen, "Background" heading, dice roll panels visible |
| `career_selection` | Choosing career + assignment                           | "Career Selection" heading, career cards/list visible        |
| `term_resolution`  | Resolving a term (survival, event, skill, advancement) | "Term Resolution" heading, 4-phase flow visible              |
| `mustering_out`    | Mustering out benefits                                 | "Mustering Out" heading, benefit roll table visible          |
| `finalized`        | Character complete                                     | "Finalized" heading, character sheet visible, no wizard nav  |

Valid forward transitions (only):

- background → career_selection
- career_selection → term_resolution
- term_resolution → mustering_out
- mustering_out → finalized

Skip transitions (background → finalized, etc.) are INVALID. If the wizard jumps a state, that's a bug.

There is no `data-chargen-status` attribute exposed today (would be a great enhancement — issue to file). State must be inferred from headings/URL/content.

## Report Format

Every charter run writes a report to:

```
.sisyphus/evidence/chargen-qa/{YYYY-MM-DD}/{charter_id}-{HHMMSSZ}/report.md
```

Create the directory with `mkdir -p` first. Screenshots go in a `screenshots/` subdirectory.

### Report structure

```markdown
# Charter {id}: {title}

**Outcome**: PASS | FAIL | XFAIL | SKIP
**Duration**: ~{N} minutes
**Started**: {ISO timestamp}
**Persona**: {player|gm|ui-critic}

## Mission

{quote from charter}

## Preconditions

| Service    | Required | Status |
| ---------- | -------- | ------ |
| web        | yes      | up     |
| fastify    | yes      | up     |
| hocuspocus | yes      | down   |

If any required service is down → SKIP, do not proceed.

## Timeline

| Step | Timestamp | Action      | Result |
| ---- | --------- | ----------- | ------ |
| 1    | 17:30:45  | Open /login | OK     |
| 2    | 17:30:48  | Fill email  | OK     |
| ...  |           |             |        |

## Verification Checklist

- [x] Login completed
- [ ] Wizard shell rendered (FAIL: redirected to /login)
- [x] No console errors

## Findings

Describe what happened, what worked, what didn't. Quote any error messages verbatim. Reference screenshots by relative path.

If UI critique dimensions apply (U1), include the scorecard:

- Readability: 4/5 — comment
- Hierarchy: 3/5 — comment
- Layout: 4/5 — comment
- Color: 3/5 — comment
- Interaction: 4/5 — comment
- Accessibility: 3/5 — comment
- **Overall: N/100**

## Artifacts

- screenshots/login-success.png
- screenshots/wizard-render.png
- console-log.txt (if captured)

## Anomalies / Bugs Found

- {description with reproduction steps}
```

### Outcome semantics

- **PASS**: All verification checklist items passed
- **FAIL**: One or more items failed (the harness found a bug)
- **XFAIL**: Charter marked `xfail: true` in frontmatter AND a known failure mode reproduced
- **SKIP**: Preconditions not met (services down). Do not run the charter.

## Known Issues (watch for these)

These are pre-existing bugs in the app. Report them if observed, but they are not charter failures unless the charter specifically tests for them.

1. **No `data-chargen-status` attribute** — state must be inferred from headings
2. **BentoGrid component exists but is minimal** — uses GlassPanel `variant="subtle"`, not broken
3. **GMControlPanel mounts but isGM is usually false** — GM controls render but self-hide
4. **ConnectionSuggestions ported but with no reject button** — closing editor = implicit reject
5. **AI verbosity modes lack inline explanation** — Minimal/Structured/Rich have no tooltips or descriptions
6. **rag-service may be down** — rag is optional for most charters, do not block on it
7. **Existing Playwright e2e tests in apps/web/e2e/ are stale** — do not reference them as source of truth

## Charters

Available charters live in `docs/qa/charters/`:

| ID  | File                           | Purpose                                         |
| --- | ------------------------------ | ----------------------------------------------- |
| S0  | `S0-smoke.md`                  | Smoke test: login + wizard renders              |
| A1  | `A1-presence.md`               | Multi-player presence: player2 sees player1     |
| B1  | `B1-collaborative-creation.md` | Player2 sees player1's character in entity pool |
| U1  | `U1-ui-critique.md`            | UI design critique (6-dimension scorecard)      |

Run `/chargen-qa list` to see them. To add a new charter, copy the template structure from S0.

## Execution Discipline

1. **Read the charter file FIRST** before opening the browser
2. **Probe services** before any browser work
3. **Capture state frequently**: screenshots after every major action
4. **Verify checkpoints**: don't just click through — actually read the DOM to verify the expected state
5. **Report honestly**: if something is broken, say so. If it's broken but expected, mark XFAIL.
6. **Do not fix bugs mid-run** — note them, continue the charter, fix after
7. **Be non-deterministic**: you may click different buttons on different runs. That's fine. The mission is what matters, not the path.

## After the Run

1. Write the report markdown
2. Print a summary line: `[PASS|FAIL|XFAIL|SKIP] {charter_id}: {one-line finding}`
3. If FAIL or XFAIL, list concrete reproduction steps
4. Suggest next charters to run if relevant
