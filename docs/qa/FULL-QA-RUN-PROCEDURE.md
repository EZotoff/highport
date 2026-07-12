# Full QA Run Procedure

> Complete runbook for executing the Highport QA validation system.
> Any agent can follow this to run the full QA suite end-to-end.

**Last Updated**: 2026-07-09
**QA System Version**: 2.0

---

## Prerequisites

Before running any charter, verify that all required services are up and the build is current.

### 1. Start Services

All 4 core services must be running:

```bash
# PostgreSQL
docker compose up -d

# All dev servers (web + hocuspocus + fastify in one command)
pnpm dev

# Or start individually if needed:
pnpm --filter web dev          # port 18120
pnpm --filter hocuspocus dev   # port 18121
pnpm --filter server dev       # port 18122
```

The RAG service (port 18124) and Ollama are optional for most charters.

### 2. Build mgt2e

The web app consumes the built mgt2e package, not source directly:

```bash
pnpm --filter @highport/mgt2e build
```

### 3. Verify Service Health

```bash
curl -s http://localhost:18120/        # Web — should return HTML
curl -s http://localhost:18122/health    # Fastify — should return {"status":"ok"}
```

### 4. Test User

The QA charters log in as:

- **Email**: `agent-qa-player1@example.com`
- **Password**: `test-password-123`

This account must exist in the local database. If it does not, register it manually via `/login` before running charters.

### 5. agent-browser

`agent-browser` must be installed and available on `PATH`. It is the browser automation driver used by every charter script. Verify with:

```bash
agent-browser --version
```

### 6. QA Launcher Wrapper

The `run-qa.sh` wrapper raises OpenCode subagent-loop-guard thresholds so legitimate QA flows are not killed mid-run:

```bash
# This sets OMO_LOOP_GUARD_N_A=100 and OMO_LOOP_GUARD_N_B=100
bash docs/qa/scripts/run-qa.sh
```

---

## Step 1 — Mode A: Run All Charters

Mode A executes every charter script sequentially. Charters share a single browser session via `qa-login`, so they **must run sequentially**, never in parallel.

### Option A: Run via the Mode Dispatcher (Full Mode)

The `run-qa-modes.sh` script builds an OpenCode prompt that runs all targeted charters, then reviews their evidence:

```bash
bash docs/qa/scripts/run-qa-modes.sh --mode full
```

This delegates to `run-qa.sh`, which launches OpenCode with the constructed prompt.

### Option B: Run Individual Charters Directly

For manual or debugging runs, execute each charter script directly:

```bash
bash docs/qa/scripts/S0-smoke.sh
bash docs/qa/scripts/A1-presence.sh
bash docs/qa/scripts/A2-keyboard-flow.sh
bash docs/qa/scripts/B1-collaborative-creation.sh
bash docs/qa/scripts/B2-multi-term-lifecycle.sh
bash docs/qa/scripts/B3-skill-training.sh
bash docs/qa/scripts/B4-skill-deselect.sh
bash docs/qa/scripts/B5-mishap-flow.sh
bash docs/qa/scripts/P1-refresh-recovery.sh
bash docs/qa/scripts/R0-runtime-detection.sh
bash docs/qa/scripts/R1-mobile-viewport.sh
bash docs/qa/scripts/U2-wide-viewport.sh
```

**Note**: E1 (exploratory) and U1 (UI critique) do not have bash scripts. E1 is executed via the exploratory mode prompt (see `run-qa-modes.sh --mode exploratory`). U1 is a visual critique charter run via `look_at` review.

### Exit Code Meanings

Every charter script exits with one of these codes:

| Code | Meaning              | Action                                                                                      |
| ---- | -------------------- | ------------------------------------------------------------------------------------------- |
| `0`  | Success              | All assertions passed, evidence captured                                                    |
| `1`  | App bug              | A real defect was found. Document with `qa_report_bug` and continue                         |
| `2`  | Precondition failure | Required precondition not met (e.g., dice-dependent flow blocked). Not a code bug. Continue |

### Evidence Location

After each charter finishes, its evidence is in:

```
.sisyphus/evidence/<ID>-<name>/
```

Files captured per charter:

- `actions.log` — Every agent-browser action with timestamp
- `screenshots/` — All screenshots taken during the run
- `console-<step>.json` — Browser console output per step
- `errors-<step>.json` — Uncaught JavaScript exceptions per step
- `network-<step>.json` — HTTP request log per step

The `<step>` token is set by the charter script (e.g., `after-login`, `after-background`, `after-career-selection`).

### Sequential Execution Requirement

Charters **must** run sequentially because they share one browser session established by `qa-login` in `docs/qa/scripts/lib/qa-assertions.sh`. Running two charters in parallel would collide on session state, cookies, and local storage. Always run them one at a time.

---

## Step 2 — Mode B: Visual Review via look_at

Mode B reviews the screenshots captured during Mode A for visual defects. This is a manual (agent-driven) review using the `look_at` tool.

### Pass 1: Comprehensive Review

For every key screenshot identified by `qa-key-screenshots.sh`, run `look_at` with the **Comprehensive** prompt from `docs/qa/scripts/lib/qa-review-prompts.md`:

```bash
# List key screenshots for a charter's evidence directory
bash docs/qa/scripts/lib/qa-key-screenshots.sh .sisyphus/evidence/S0-smoke/
```

Then, for each screenshot path returned:

```
look_at --file "<screenshot-path>" --goal "You are a QA engineer reviewing a web app screenshot. List every visual problem: text overflow, cramped layout, empty/wasted space, misaligned elements, text that doesn't fit in its container, overlapping elements, clipped content. Use these severity definitions: CRITICAL = blocks task completion. MAJOR = significant visual problem on primary user path. MODERATE = cosmetic issue on secondary element. For each issue found, list: severity, location, description."
```

### Pass 2: Focused Reviews

For any screenshot where Pass 1 found issues, run focused prompts to dig deeper:

| If Pass 1 found...       | Run focused prompt...     |
| ------------------------ | ------------------------- |
| Text overflow / clipping | `Focused-text-overflow`   |
| Layout / width issues    | `Focused-layout-width`    |
| Element overlap          | `Focused-element-overlap` |

The focused prompt text is also in `docs/qa/scripts/lib/qa-review-prompts.md`.

### Severity Categories

Document every finding with one of these severities:

- **P0 (Critical/Major)**: Blocks task completion or is a significant visual problem on the primary user path. Examples: overlapping elements that hide buttons, clipped content that hides required text.
- **P1 (Major)**: Significant visual problem but does not block the primary path. Examples: text overflow in secondary panels, cramped layout that makes reading difficult.
- **P2 (Moderate)**: Cosmetic issue on a secondary element. Examples: minor misalignment, slightly wasted space, scrollbar visible with limited content.

---

## Step 3 — State Check

After Mode A and Mode B complete, read the QA state registry to see the current status of every charter.

### Read the Registry

```bash
cat docs/qa/qa-state.md
```

The registry uses a 5-dimension model. Each charter has these independent dimensions:

| Dimension           | Values                                           | Meaning                                                                                   |
| ------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `functional_status` | passing, partial, failing, feature_gap, untested | Did the charter script complete and assert what it intended?                              |
| `visual_status`     | clean, warnings, failing, not_reviewed           | Result of Mode B look_at review. `failing` = P0 defects present. `warnings` = P1/P2 only. |
| `evidence_status`   | complete, partial, missing, invalid              | Are screenshots and logs sufficient to reproduce the result?                              |
| `infra_status`      | healthy, degraded, down                          | Were all required services up during the run?                                             |
| `runtime_status`    | clean, warnings, failing, not_reviewed           | Browser console errors, uncaught exceptions, and HTTP error responses (4xx/5xx).          |

### Overall Status Rules

The Overall column is computed, never manually overridden:

1. **FAILING** if any dimension is failing:
   - `functional_status == failing`, OR
   - `visual_status == failing`, OR
   - `evidence_status == missing / invalid`, OR
   - `infra_status == down`, OR
   - `runtime_status == failing`
2. **FEATURE_GAP** if `functional_status == feature_gap` (and no dimension is failing)
3. **PARTIAL** if any dimension is partial, warnings, degraded, or not_reviewed (and no dimension is failing or feature_gap)
4. **PASSING** only when all dimensions are clean: functional == passing, visual == clean, evidence == complete, infra == healthy, runtime == clean
5. **UNTESTED** if `functional_status == untested`

### Identify FAILING Charters

Scan the registry table for any charter with Overall = **FAILING**. These are the charters that need developer attention. As of the last update (2026-07-06), the following charters are FAILING:

- **S0** — visual failing (GM CONTROLS overlap, bottom content clipping)
- **B1** — visual failing (GM CONTROLS overlap)
- **B2** — functional partial, visual failing (multi-term flow blocked by dice, GM CONTROLS overlap)
- **B4** — functional feature_gap, visual failing (skill deselect not implemented)
- **U2** — visual failing (width utilization 43%, content clipping)
- **E1** — functional partial, visual failing, evidence partial

---

## Step 4 — Bug Comparison

Compare the findings against the known bug inventory. Each known bug has a charter that should detect it:

| Bug                                                         | Charter      | Expected Detection                                         |
| ----------------------------------------------------------- | ------------ | ---------------------------------------------------------- |
| Layout cramped (width utilization <70%)                     | U2           | `assert_utilizes_width` fails                              |
| Text overflow                                               | B3, R1       | `assert_all_no_overflow` / `assert_no_overflow_warn` fails |
| Skill deselect not implemented                              | B4           | `feature_gap` reported via `qa_report_bug`                 |
| Mishap redirect (career_selection instead of mustering_out) | B5           | `qa_report_bug` on redirect check                          |
| GM Controls overlap (covers Continue button)                | ALL charters | `assert_not_occluded_warn` fires                           |
| Console errors / runtime failures                           | R0           | `assert_no_console_errors` detects injected errors         |
| Persistence loss on refresh                                 | P1           | `qa_report_bug` if state lost after refresh                |
| Keyboard navigation failures                                | A2           | `qa_report_bug` for keyboard traps / missing focus rings   |
| Horizontal scroll on mobile                                 | R1           | `assert_page_no_horizontal_scroll` fails                   |

If a known bug is **not** detected by its assigned charter, that is itself a QA system bug. The assertion may be broken, the charter script may be skipping the check, or the app behavior may have changed. Document this as a finding in the report.

---

## Step 5 — Report Generation

Compile all findings into a single report.

### Evidence Directory

Create the report directory:

```bash
mkdir -p .sisyphus/evidence/full-qa-$(date +%Y%m%d)/
```

### Report Structure

Write `report.md` inside that directory with these sections:

#### 1. Charters Run

List every charter executed with its exit code and timestamp:

```markdown
| Charter | Exit Code | Time             | Notes                          |
| ------- | --------- | ---------------- | ------------------------------ |
| S0      | 0         | 2026-07-06 20:17 | Smoke test passed              |
| A1      | 0         | 2026-07-06 20:18 | Multiplayer presence confirmed |
| ...     | ...       | ...              | ...                            |
```

#### 2. Pass/Fail Per Charter

A table showing each charter's 5 dimensions and Overall status, copied from `docs/qa/qa-state.md`:

```markdown
| Charter | Functional | Visual  | Evidence | Infra   | Runtime      | Overall     |
| ------- | ---------- | ------- | -------- | ------- | ------------ | ----------- |
| S0      | passing    | failing | complete | healthy | not_reviewed | **FAILING** |
| ...     | ...        | ...     | ...      | ...     | ...          | ...         |
```

#### 3. Bugs Found

Two subsections:

- **New bugs**: Any defect found that is not in the known bug inventory (Step 4 table). Include severity, charter that found it, and reproduction steps.
- **Known bugs**: Each known bug from Step 4, with whether it was detected and any new observations.

#### 4. Severity Counts

Tally all P0, P1, and P2 findings across all charters:

```markdown
| Severity | Count | Charters Affected              |
| -------- | ----- | ------------------------------ |
| P0       | 7     | S0, B1, B2, B4, U2, E1         |
| P1       | 7     | B2, U2, E1                     |
| P2       | 8     | S0, A1, B1, B2, B3, B4, U2, E1 |
```

#### 5. Coverage Gaps Remaining

List any areas not yet covered by the charter suite:

- Runtime status dimension is `not_reviewed` for all charters (R0 exists but is not yet fully wired)
- U1 visual_status is `not_reviewed` (UI critique charter needs Mode B execution)
- E1 evidence_status is `partial` (exploratory phase 2 at 1920x1080 deferred)
- No charter covers campaign graph interaction
- No charter covers RAG / AI assistant flows
- No charter covers Foundry VTT integration

### How to Generate

1. Create the evidence directory: `mkdir -p .sisyphus/evidence/full-qa-$(date +%Y%m%d)/`
2. Copy the current `docs/qa/qa-state.md` table into the report as Section 2
3. Append Mode A exit codes and timestamps from the charter run logs
4. Append Mode B findings (P0/P1/P2 issues) from the `look_at` reviews
5. Cross-reference with the known bug table (Step 4) to classify findings as new or known
6. Write the final `report.md` file in the evidence directory

---

## Appendix: Charter Reference Table

| ID  | Title                           | Script Path                                                       | Charter Doc                                     | What It Tests                                                    | Known Bugs It Detects                                 |
| --- | ------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| S0  | Harness smoke test              | `docs/qa/scripts/S0-smoke.sh`                                     | `docs/qa/charters/S0-smoke.md`                  | Login, wizard shell renders, background step visible             | GM Controls overlap, bottom content clipping          |
| A1  | Multi-player presence           | `docs/qa/scripts/A1-presence.sh`                                  | `docs/qa/charters/A1-presence.md`               | Player2 sees player1 in session via invite URL                   | GM Controls overlap                                   |
| A2  | Keyboard-only navigation        | `docs/qa/scripts/A2-keyboard-flow.sh`                             | `docs/qa/charters/A2-keyboard-flow.md`          | Complete background step using only keyboard (Tab, Enter, Space) | Keyboard traps, missing focus rings                   |
| B1  | Collaborative creation          | `docs/qa/scripts/B1-collaborative-creation.sh`                    | `docs/qa/charters/B1-collaborative-creation.md` | Player2 observes player1's character in entity pool              | GM Controls overlap                                   |
| B2  | Full multi-term lifecycle       | `docs/qa/scripts/B2-multi-term-lifecycle.sh`                      | `docs/qa/charters/B2-multi-term-lifecycle.md`   | 4 terms, commission, aging, mustering out, finalization          | Text overflow, GM Controls overlap, bottom clipping   |
| B3  | Skill training                  | `docs/qa/scripts/B3-skill-training.sh`                            | `docs/qa/charters/B3-skill-training.md`         | Skill table selection, rolling, state update, CharacterPreview   | Text overflow                                         |
| B4  | Skill deselect                  | `docs/qa/scripts/B4-skill-deselect.sh`                            | `docs/qa/charters/B4-skill-deselect.md`         | Select/deselect toggle, CharacterPreview accuracy                | Skill deselect not implemented, GM Controls overlap   |
| B5  | Mishap and failure-path         | `docs/qa/scripts/B5-mishap-flow.sh`                               | `docs/qa/charters/B5-mishap-flow.md`            | Forced survival failure, mishap, redirect check                  | Mishap redirect bug                                   |
| E1  | Exploratory visual QA           | _(no bash script — run via `run-qa-modes.sh --mode exploratory`)_ | `docs/qa/charters/E1-exploratory.md`            | Free-form traversal of all wizard states at both viewports       | Overflow, clipping, layout, overlap, edge cases       |
| P1  | Page refresh and state recovery | `docs/qa/scripts/P1-refresh-recovery.sh`                          | `docs/qa/charters/P1-refresh-recovery.md`       | Yjs/IndexedDB persistence after page reload                      | Persistence loss on refresh                           |
| R0  | Runtime detection               | `docs/qa/scripts/R0-runtime-detection.sh`                         | _(no charter doc — negative test script)_       | Proves runtime assertions detect injected console/HTTP errors    | Console errors, runtime failures                      |
| R1  | Mobile and tablet responsive    | `docs/qa/scripts/R1-mobile-viewport.sh`                           | `docs/qa/charters/R1-mobile-viewport.md`        | 375x667 and 768x1024 viewports, no horizontal scroll             | Text overflow, horizontal scroll                      |
| U1  | UI design critique              | _(no bash script — visual critique via `look_at`)_                | `docs/qa/charters/U1-ui-critique.md`            | Readability, polish, interaction quality scoring                 | Visual design issues                                  |
| U2  | Wide viewport layout            | `docs/qa/scripts/U2-wide-viewport.sh`                             | `docs/qa/charters/U2-wide-viewport.md`          | 1920x1080 layout, width utilization, containment                 | Layout cramped, GM Controls overlap, content clipping |

---

## Quick Reference: File Paths

| File                    | Path                                        |
| ----------------------- | ------------------------------------------- |
| QA state registry       | `docs/qa/qa-state.md`                       |
| Charter documents       | `docs/qa/charters/<ID>-<name>.md`           |
| Charter scripts         | `docs/qa/scripts/<ID>-<name>.sh`            |
| Assertion library       | `docs/qa/scripts/lib/qa-assertions.sh`      |
| Runtime capture module  | `docs/qa/scripts/lib/qa-runtime.sh`         |
| Review prompt templates | `docs/qa/scripts/lib/qa-review-prompts.md`  |
| Key screenshot finder   | `docs/qa/scripts/lib/qa-key-screenshots.sh` |
| OpenCode launcher       | `docs/qa/scripts/run-qa.sh`                 |
| Mode dispatcher         | `docs/qa/scripts/run-qa-modes.sh`           |
| Evidence root           | `.sisyphus/evidence/`                       |

---

## Quick Reference: Service Ports

| Service                | Port  | Health Check                         |
| ---------------------- | ----- | ------------------------------------ |
| Web (Next.js)          | 18120 | `curl http://localhost:18120/`       |
| Hocuspocus (WebSocket) | 18121 | Connect via WebSocket                |
| Fastify (REST API)     | 18122 | `curl http://localhost:18122/health` |
| PostgreSQL             | 18123 | `docker compose ps`                  |
| RAG Service            | 18124 | Optional for most charters           |
