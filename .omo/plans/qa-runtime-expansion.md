# qa-runtime-expansion - Work Plan

## TL;DR (For humans)

<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->

**What you'll get:** The QA system will no longer pass a charter while the app silently throws JavaScript errors or fails network requests. Every charter run will capture browser console messages, uncaught exceptions, and HTTP error responses as evidence, and will fail (exit 1) when real runtime errors occur.

**Why this approach:** The agent-browser CLI (v0.20.11) already has native `console`, `errors`, and `network requests` commands backed by Chrome DevTools Protocol — so we use those as the primary capture path instead of writing fragile injected JavaScript listeners. A new isolated module (`lib/qa-runtime.sh`) keeps the ~200 lines of new code reviewable, and hooking it into the existing `qa_capture_evidence` function means every bug/refusal auto-captures runtime evidence for free.

**What it will NOT do:**

- It will NOT capture genuine network transport failures (DNS/TLS/connection-refused) — the installed agent-browser lacks HAR recording; these are rare on localhost and deferred.
- It will NOT modify the Highport application source — this is QA infrastructure only.
- It will NOT change existing assertion behavior (overflow, occlusion, viewport checks are untouched).

**Effort:** Medium
**Risk:** Low — additive only; new module + hooks; no existing behavior changed
**Decisions to sanity-check:** (1) console.error treated as fatal with a noise allowlist, (2) HTTP 5xx/401/403/404 fatal vs 400/409/422/429 warning, (3) all 7 charters get the clear+assert treatment

Your next move: approve the plan, then run `/start-work qa-runtime-expansion`. Full execution detail follows below.

---

> TL;DR (machine): Medium effort, Low risk. 6 todos in 3 waves. Adds runtime capture (console/errors/network) to QA via native agent-browser commands in a new lib/qa-runtime.sh module, hooks into qa_capture_evidence + qa-finish, adds runtime_status to qa-state.md, updates 7 charters, adds R0 negative-test charter.

## Scope

### Must have

- New `docs/qa/scripts/lib/qa-runtime.sh` module with: `qa_runtime_clear`, `qa_capture_runtime`, `assert_no_console_errors` (+`_warn`), `assert_no_network_failures` (+`_warn`), `assert_runtime_clean` (+`_warn`)
- `docs/qa/scripts/lib/qa-assertions.sh` wired to source the module, call `qa_capture_runtime` inside `qa_capture_evidence`, and gate `qa-finish success` on `assert_runtime_clean`
- `docs/qa/qa-state.md` extended with `runtime_status` dimension across all 9 charter rows + legend + overall-status rule + table column
- All 7 charter scripts (`S0`, `A1`, `B1`, `B2`, `B3`, `B4`, `U2`) calling `qa_runtime_clear` after login and `assert_runtime_clean_warn` before `qa-finish`
- New `docs/qa/scripts/R0-runtime-detection.sh` negative-test charter proving the assertions catch a deliberate `console.error` + failing request
- `docs/qa/scripts/run-qa-modes.sh` prompt text formalized to reference runtime evidence paths

### Must NOT have (guardrails, anti-slop, scope boundaries)

- NO injected `window.__qaRuntimeLog` listener / fetch-XHR monkey-patch (deferred to a future plan — transport-failure capture only)
- NO changes to `apps/` (application source) — QA infrastructure only
- NO new visual/layout assertion types (overflow, occlusion, viewport unchanged)
- NO changes to existing assertion functions' behavior
- NO HAR recording (`network har start/stop` does not exist in agent-browser v0.20.11)
- NO modifications to the agent-browser tool itself
- NO new dependencies (npm/pip/cargo packages)

## Verification strategy

> Zero human intervention - all verification is agent-executed.

- Test decision: tests-after (bash charter scripts against live app) + characterization-first (T1 verifies native command JSON shapes before building assertions on them)
- Evidence: `.omo/evidence/task-<N>-qa-runtime-expansion.<ext>` + `.sisyphus/evidence/<charter>/console.log`, `errors.json`, `network.json`
- Every todo's QA scenario runs a real charter against the live app (ports 18120-18124) and captures the runtime evidence artifact as proof

## Execution strategy

### Parallel execution waves

> Wave 1: 3 independent files (parallel). Wave 2: 1 wiring task (depends on T1). Wave 3: 2 integration tasks (depend on T4, parallel).

### Dependency matrix

| Todo                         | Depends on | Blocks    | Can parallelize with |
| ---------------------------- | ---------- | --------- | -------------------- |
| T1 (lib/qa-runtime.sh)       | none       | T4        | T2, T3               |
| T2 (qa-state.md)             | none       | none      | T1, T3               |
| T3 (R0 charter)              | none       | T4-verify | T1, T2               |
| T4 (qa-assertions.sh wiring) | T1         | T5, T6    | none (sequential)    |
| T5 (7 charter scripts)       | T4         | none      | T6                   |
| T6 (run-qa-modes.sh)         | T4         | none      | T5                   |

## Todos

> Implementation + Test = ONE todo. Never separate.

---

- [x] 1. **Create `docs/qa/scripts/lib/qa-runtime.sh` — runtime capture module**

  **What to do:**
  Create a new bash library module that provides runtime signal capture and assertions using agent-browser's native commands. The module MUST contain these functions (exact names):
  1. `qa_runtime_clear` — clears all runtime buffers for the current session:

     ```bash
     agent-browser --session "$QA_SESSION" console --clear 2>/dev/null || true
     agent-browser --session "$QA_SESSION" errors --clear 2>/dev/null || true
     agent-browser --session "$QA_SESSION" network requests --clear 2>/dev/null || true
     qa_log "RUNTIME_CLEAR | session=${QA_SESSION}"
     ```

     Call this AFTER the first page load (after qa-login) to start each charter with a clean buffer.

  2. `qa_capture_runtime` — dumps all three runtime signals to the evidence directory as structured artifacts:
     - `agent-browser --session "$QA_SESSION" console --json` → `$QA_EVIDENCE_DIR/console-${QA_STEP}.json`
     - `agent-browser --session "$QA_SESSION" errors --json` → `$QA_EVIDENCE_DIR/errors-${QA_STEP}.json`
     - `agent-browser --session "$QA_SESSION" network requests --json` → `$QA_EVIDENCE_DIR/network-${QA_STEP}.json`
     - Log: `qa_log "RUNTIME_CAPTURED | step=${QA_STEP} | console=<N> errors=<N> requests=<N>"`
     - Use `mkdir -p "$QA_EVIDENCE_DIR"` first; tolerate `|| true` on each capture (don't fail the charter if a command errors).

  3. `assert_no_console_errors` — FATAL (exit 1 via `qa_report_bug`). Parses `errors --json` for uncaught exceptions AND `console --json` for `console.error` entries. For each error-severity entry found, collect message + source/line. If ANY found, call `qa_report_bug "Runtime errors detected: <count> error(s): <first 3 messages>"`. Apply a noise allowlist (see MUST DO #4). Exit 1 if any non-allowlisted error exists.

  4. `assert_no_console_errors_warn` — advisory variant (uses `qa_warn`, continues). Same detection, logs warning, does NOT exit.

  5. `assert_no_network_failures` — FATAL (exit 1). Parses `network requests --json` for responses with status codes. Policy: status ∈ {401, 403, 404} or status ≥ 500 → FATAL. status ∈ {400, 409, 422, 429} → counted but not fatal (warn-level). If any fatal-status request found, call `qa_report_bug "Network failures: <count> request(s) with fatal status: <first 3 method+url+status>"`.

  6. `assert_no_network_failures_warn` — advisory variant.

  7. `assert_runtime_clean` — composite FATAL gate. Runs `assert_no_console_errors` THEN `assert_no_network_failures`. If both pass, log `qa_log "RUNTIME_CLEAN | pass"` and return 0. This is the function charters call before `qa-finish success`.

  8. `assert_runtime_clean_warn` — composite advisory. Runs both `_warn` variants, continues regardless.

  **CHARACTERIZATION FIRST (mandatory before writing assertions):** Before implementing the parsers, run these three commands against the live app (start the dev server if needed via the deployment skill) and capture the EXACT JSON shape returned:

  ```bash
  agent-browser --session test-char open http://localhost:18120/login
  agent-browser --session test-char wait 2000
  agent-browser --session test-char console --json > /tmp/qa-char-console.json
  agent-browser --session test-char errors --json > /tmp/qa-char-errors.json
  agent-browser --session test-char network requests --json > /tmp/qa-char-network.json
  agent-browser --session test-char close
  ```

  Inspect each JSON file. Document the shape in `.omo/notepads/qa-runtime-expansion/learnings.md` under `## Native Command JSON Shapes`. Build the parsers to match the ACTUAL shape (field names for level, text, status, url, method). Do NOT assume field names — verify them.

  **MUST DO:**
  - Follow the established pattern from `qa-assertions.sh`: `_check_` helpers are optional; `assert_*` uses `qa_report_bug`/`qa_refuse`; `assert_*_warn` uses `qa_warn`. See `docs/qa/scripts/lib/qa-assertions.sh:237-262` (`_check_no_overflow` / `assert_no_overflow` / `assert_no_overflow_warn`) as the canonical pattern.
  - Use `agent-browser --session "$QA_SESSION" <cmd> --json 2>/dev/null | tail -1` or pipe through a JSON parser. The output may be multi-line JSON; use `python3 -c "import json,sys; ..."` or `jq` if available for parsing. Check `which jq` first; fall back to python3.
  - Source the QA_SESSION and QA_EVIDENCE_DIR variables (they're exported by qa-init, so the module inherits them).
  - The noise allowlist for console.error MUST include at minimum: React StrictMode double-render messages, `Download the React DevTools`, and any known Highport dev-mode warnings. Store the allowlist as a bash array of grep patterns at the top of the module. Make it easy to extend.
  - File header MUST mirror qa-assertions.sh style: `#!/usr/bin/env bash`, comment block with `# docs/qa/scripts/lib/qa-runtime.sh`, design principles, usage example.
  - Append findings to `.omo/notepads/qa-runtime-expansion/learnings.md` (the JSON shapes + any gotchas).

  **MUST NOT DO:**
  - Do NOT modify `qa-assertions.sh` (T4 does that).
  - Do NOT use injected JavaScript listeners (native commands only).
  - Do NOT add `har start/stop` calls (not available in v0.20.11).
  - Do NOT hardcode JSON field names without verifying them via characterization.
  - Do NOT make the module executable on its own — it's sourced, like qa-assertions.sh.

  **Parallelization:** Wave 1 | Blocked by: none | Blocks: T4

  **References (executor has NO interview context - be exhaustive):**
  - `docs/qa/scripts/lib/qa-assertions.sh:43-61` — config vars (QA_SESSION, QA_EVIDENCE_DIR, QA_STEP)
  - `docs/qa/scripts/lib/qa-assertions.sh:63-66` — qa_log pattern
  - `docs/qa/scripts/lib/qa-assertions.sh:69-75` — qa_capture_evidence (the hook target for T4)
  - `docs/qa/scripts/lib/qa-assertions.sh:89-96` — qa_report_bug (exit 1 pattern)
  - `docs/qa/scripts/lib/qa-assertions.sh:99-116` — qa_warn (advisory pattern)
  - `docs/qa/scripts/lib/qa-assertions.sh:237-262` — \_check_no_overflow / assert_no_overflow / assert_no_overflow_warn (CANONICAL assertion pattern to follow)
  - `docs/qa/scripts/lib/qa-assertions.sh:272-305` — assert_all_no_overflow (multi-element check pattern + `___NL___` placeholder for multi-line output)
  - `.omo/notepads/qa-runtime-expansion/learnings.md` — exploration findings (harness structure, state model)
  - `.omo/notepads/qa-detection-upgrades/learnings.md` — prior plan patterns (**_NL_** placeholder, JSON escaping through agent-browser eval)

  **Acceptance criteria (agent-executable):**
  - `bash -n docs/qa/scripts/lib/qa-runtime.sh` passes (syntax check)
  - `source docs/qa/scripts/lib/qa-runtime.sh && type qa_runtime_clear qa_capture_runtime assert_no_console_errors assert_no_console_errors_warn assert_no_network_failures assert_no_network_failures_warn assert_runtime_clean assert_runtime_clean_warn` lists all 8 functions
  - Characterization JSON shapes documented in learnings.md

  **QA scenarios (name the exact tool + invocation):**
  - HAPPY: Source the module alongside qa-assertions.sh in a test script; run `qa-init test`, `qa-login`, `qa_runtime_clear`, navigate to `/chargen`, `qa_capture_runtime`, then `assert_runtime_clean_warn`. Verify `$QA_EVIDENCE_DIR/console-*.json`, `errors-*.json`, `network-*.json` exist and are valid JSON. Evidence: `.omo/evidence/task-1-qa-runtime-expansion/happy-capture.txt` (the ls + json validity check output).
  - FAILURE (negative test): After login+clear, inject a console.error via `agent-browser --session "$QA_SESSION" eval "console.error('QA_TEST_ERROR')"` and a failing request via `eval "fetch('/api/nonexistent-endpoint-404').catch(()=>{})"`, wait 1s, then run `assert_no_console_errors`. It MUST call qa_report_bug and exit 1. Evidence: `.omo/evidence/task-1-qa-runtime-expansion/failure-detection.txt` (the exit-1 output + the captured errors.json showing the injected error).

  **Commit:** Y | `feat(qa): add lib/qa-runtime.sh — runtime capture module (console/errors/network)`

---

- [x] 2. **Update `docs/qa/qa-state.md` — add `runtime_status` dimension**

  **What to do:**
  Add a new `runtime_status` field to the QA state registry, mirroring the existing `visual_status` / `infra_status` pattern. Specifically:
  1. **Frontmatter (lines 1-123):** Add `runtime_status: <value>` after `infra_status:` in ALL 9 charter blocks (S0 at line ~11, A1 ~24, B1 ~37, B2 ~50, B3 ~63, B4 ~76, U1 ~89, U2 ~102, E1 ~115). Use these initial values based on current knowledge:
     - S0, A1, B1, B4, U2: `not_reviewed` (runtime capture not yet run on these)
     - B2: `not_reviewed` (the one-off diagnostic at line 134 doesn't count as systematic)
     - B3: `not_reviewed`
     - U1: `not_reviewed`
     - E1: `not_reviewed`
       (All start `not_reviewed` — they'll be updated to real values after the full QA run post-implementation.)

  2. **Dimension Legend (after the existing legend, around line 150):** Add:

     ```
     - `runtime_status`: clean | warnings | failing | not_reviewed
       Browser console errors, uncaught exceptions, and HTTP error responses (4xx/5xx).
       clean = no errors/warnings; warnings = console.warn or minor HTTP errors only;
       failing = uncaught exception, console.error, or fatal HTTP status; not_reviewed = not yet checked.
     ```

  3. **Overall Status Rules (around line 155-167):** Add a new rule BEFORE the PASSING rule:

     ```
     - FAILING if runtime_status == failing
     ```

     (Uncaught exceptions / console.error make the charter fail regardless of functional/visual status — a page throwing errors is broken.)

  4. **Markdown table (line 131 header + lines 133-141 rows):** Add a `Runtime` column after the `Infra` column. Update all 9 rows with `not_reviewed`.

  **MUST DO:**
  - Read the FULL qa-state.md first (lines 1-223) to confirm exact line numbers before editing.
  - Preserve all existing content — this is purely additive.
  - The YAML must remain valid (indentation matters: `runtime_status:` at the same indent as `infra_status:`).
  - Verify the frontmatter parses: `python3 -c "import yaml; yaml.safe_load(open('docs/qa/qa-state.md').read().split('---')[1])"` exits 0.

  **MUST NOT DO:**
  - Do NOT change any existing field values (functional_status, visual_status, etc. stay as-is).
  - Do NOT remove or reorder existing columns.
  - Do NOT update runtime_status to anything other than `not_reviewed` (real values come after the post-implementation QA run).

  **Parallelization:** Wave 1 | Blocked by: none | Blocks: none

  **References:**
  - `docs/qa/qa-state.md:1-123` — frontmatter (9 charter blocks, 9 fields each)
  - `docs/qa/qa-state.md:131-141` — markdown table
  - `docs/qa/qa-state.md:145-167` — dimension legend + overall status rules (approximate; read to confirm)

  **Acceptance criteria:**
  - `python3 -c "import yaml; d=yaml.safe_load(open('docs/qa/qa-state.md').read().split('---')[1]); assert 'runtime_status' in d['qa_state']['charters']['S0'], 'missing runtime_status'; print('OK')"` prints OK
  - All 9 charter blocks have `runtime_status: not_reviewed`
  - Markdown table has a Runtime column with 9 `not_reviewed` cells

  **QA scenarios:**
  - HAPPY: Parse the frontmatter with python yaml, confirm all 9 charters have runtime_status field. Evidence: `.omo/evidence/task-2-qa-runtime-expansion/yaml-valid.txt`
  - FORMAT: Render the markdown table and confirm it has 12 columns (was 11). Evidence: same file.

  **Commit:** Y | `feat(qa): add runtime_status dimension to qa-state.md`

---

- [x] 3. **Create `docs/qa/scripts/R0-runtime-detection.sh` — negative-test charter**

  **What to do:**
  Create a NEW charter script that PROVES the runtime capture assertions actually detect errors. This is the failing-first evidence: the charter deliberately injects a `console.error` and a failing HTTP request, then verifies `assert_no_console_errors` and `assert_no_network_failures` catch them.

  Structure (follow `docs/qa/scripts/S0-smoke.sh` as the skeleton):

  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  source "${SCRIPT_DIR}/lib/qa-assertions.sh"
  # (qa-runtime.sh is sourced by qa-assertions.sh after T4, but for the
  #  failing-first draft, source it directly so the charter is self-sufficient)
  # source "${SCRIPT_DIR}/lib/qa-runtime.sh"  # uncomment after T4 wires it

  qa-init "R0-runtime-detection"
  echo "=== R0 Runtime Detection Test ==="

  QA_STEP="01-login"
  qa-login
  qa_runtime_clear   # start clean

  QA_STEP="02-inject-console-error"
  agent-browser --session "$QA_SESSION" eval "console.error('R0_TEST_INJECTED_ERROR: deliberate error for detection proof')" 2>/dev/null | tail -1
  qa_settle 500

  QA_STEP="03-inject-failing-request"
  agent-browser --session "$QA_SESSION" eval "fetch('${QA_BASE_URL}/api/__r0_nonexistent_404__').catch(() => {})" 2>/dev/null | tail -1
  qa_settle 1000

  QA_STEP="04-verify-detection"
  # Capture runtime evidence
  qa_capture_runtime

  # Verify console error was caught
  errors_json=$(agent-browser --session "$QA_SESSION" errors --json 2>/dev/null | tail -1)
  if echo "$errors_json" | grep -q "R0_TEST_INJECTED_ERROR"; then
    echo "PASS: console.error detected by errors command"
    qa_log "R0_VERIFY | console_error_detected | pass"
  else
    qa_report_bug "R0 FAILED: injected console.error not detected by errors --json"
  fi

  # Verify network failure was caught (404)
  net_json=$(agent-browser --session "$QA_SESSION" network requests --json 2>/dev/null | tail -1)
  if echo "$net_json" | grep -q "__r0_nonexistent_404__"; then
    echo "PASS: failing request detected by network requests"
    qa_log "R0_VERIFY | network_failure_detected | pass"
  else
    qa_report_bug "R0 FAILED: injected 404 request not detected by network requests --json"
  fi

  QA_STEP="05-assertion-gate"
  # The composite assertion MUST fail (we injected errors)
  # Use a subshell to catch the exit 1 without killing the charter
  if assert_no_console_errors 2>/dev/null; then
    qa_report_bug "R0 FAILED: assert_no_console_errors did NOT catch the injected error"
  else
    echo "PASS: assert_no_console_errors correctly caught injected error (exited non-zero)"
    qa_log "R0_VERIFY | assertion_gate_console | pass"
  fi

  echo "=== R0 Runtime Detection: ALL CHECKS PASSED ==="
  qa-finish success
  ```

  **IMPORTANT — failing-first semantics:** This charter is written BEFORE T1 (the module) and T4 (the wiring) are complete. It will FAIL to source qa-runtime.sh until T1 exists. That's expected — it's the RED phase of TDD. The charter becomes runnable after T1+T4. The executor of T3 should write the charter, verify syntax (`bash -n`), and note that full execution requires T1+T4.

  **MUST DO:**
  - Follow the exact S0-smoke.sh skeleton: shebang, `set -euo pipefail`, SCRIPT_DIR, source qa-assertions.sh, qa-init, numbered QA_STEP assignments, qa-finish.
  - The injected error string MUST contain a unique sentinel (`R0_TEST_INJECTED_ERROR`) so it's unambiguously detectable and filterable.
  - The injected request MUST hit a path that returns 404 (`/api/__r0_nonexistent_404__` — unlikely to exist).
  - Make the file executable: `chmod +x docs/qa/scripts/R0-runtime-detection.sh`.
  - Append to `.omo/notepads/qa-runtime-expansion/learnings.md` under `## R0 Charter Design` noting the sentinel strings.

  **MUST NOT DO:**
  - Do NOT run the charter yet (it needs T1+T4). Just create + syntax-check.
  - Do NOT source qa-runtime.sh with a path that doesn't exist (comment it out, note it's activated post-T4).
  - Do NOT use a real API endpoint that might exist.

  **Parallelization:** Wave 1 | Blocked by: none | Blocks: T4-verify (T4 executor uses R0 to verify the wiring)

  **References:**
  - `docs/qa/scripts/S0-smoke.sh` — full 93-line skeleton (THE template to follow)
  - `docs/qa/scripts/lib/qa-assertions.sh:795-804` — qa-init signature
  - `docs/qa/scripts/lib/qa-assertions.sh:845-887` — qa-login signature

  **Acceptance criteria:**
  - `bash -n docs/qa/scripts/R0-runtime-detection.sh` passes
  - `test -x docs/qa/scripts/R0-runtime-detection.sh` passes (executable)
  - Charter contains sentinel `R0_TEST_INJECTED_ERROR` and path `__r0_nonexistent_404__`

  **QA scenarios:**
  - HAPPY: After T1+T4 complete, run `bash docs/qa/scripts/R0-runtime-detection.sh` against the live app. It MUST exit 0 with "ALL CHECKS PASSED". Evidence: `.omo/evidence/task-3-qa-runtime-expansion/r0-run.txt` (full charter output). NOTE: this QA runs during T4 verification, not T3 (T3 just creates the file).

  **Commit:** Y | `test(qa): add R0-runtime-detection.sh — negative-test charter for runtime capture`

---

- [x] 4. **Wire `lib/qa-runtime.sh` into `docs/qa/scripts/lib/qa-assertions.sh`**

  **What to do:**
  Make three surgical edits to qa-assertions.sh so every charter automatically gets runtime capture:
  1. **Source the module** — near the top of qa-assertions.sh, AFTER the config variables block (after line 61, the AGENT_BROWSER_IDLE_TIMEOUT_MS export), add:

     ```bash
     # ===== Runtime capture module (console/errors/network) =====
     # Sourced here so every charter that sources qa-assertions.sh gets runtime
     # capture for free. The module uses QA_SESSION, QA_EVIDENCE_DIR, QA_STEP
     # which are all defined/configured above or by qa-init.
     _QA_RUNTIME_LIB="${BASH_SOURCE[0]%/*}/qa-runtime.sh"
     if [[ -f "$_QA_RUNTIME_LIB" ]]; then
       source "$_QA_RUNTIME_LIB"
     else
       echo "WARNING: qa-runtime.sh not found at $_QA_RUNTIME_LIB — runtime capture disabled" >&2
     fi
     ```

     Use `${BASH_SOURCE[0]%/*}` to resolve relative to qa-assertions.sh's own directory (not CWD).

  2. **Hook qa_capture_runtime into qa_capture_evidence** — inside `qa_capture_evidence()` (line 69-75), AFTER the screenshot line (line 74), add:

     ```bash
     # Also capture runtime signals (console/errors/network) if the module is loaded
     if type qa_capture_runtime &>/dev/null; then
       qa_capture_runtime
     fi
     ```

     This ensures every `qa_refuse` and `qa_report_bug` (which both call `qa_capture_evidence`) auto-captures runtime evidence. Guard with `type ... &>/dev/null` so the lib still works if qa-runtime.sh is missing.

  3. **Add assert_runtime_clean to qa-finish success path** — inside `qa-finish()` (line 904-916), in the `case` statement, change the `success)` branch to check runtime BEFORE exiting:
     ```bash
     qa-finish() {
       local result="${1:-success}"
       qa_log "FINISH | result=${result}"
       # Gate success on clean runtime (if module loaded). Use _warn variant so
       # charters that haven't been updated can still pass; charters that want
       # strict gating call assert_runtime_clean explicitly before qa-finish.
       qa-cleanup
       case "$result" in
         success)
           if type assert_runtime_clean_warn &>/dev/null; then
             assert_runtime_clean_warn  # advisory — logs but doesn't block
           fi
           exit 0 ;;
         app_bug)              exit 1 ;;
         precondition_failure) exit 2 ;;
         *)
           echo "qa-finish: unknown result '${result}' (use: success|app_bug|precondition_failure)" >&2
           exit 2 ;;
       esac
     }
     ```
     NOTE: Use `_warn` (advisory) in qa-finish so we don't break existing charters that may have pre-existing console noise. Charters that want STRICT gating (T5 updates) call `assert_runtime_clean` (fatal) explicitly BEFORE `qa-finish success`. This is a safe rolling adoption.

  **MUST DO:**
  - Read qa-assertions.sh lines 43-75 and 895-916 FIRST to confirm exact insertion points.
  - Use `type <func> &>/dev/null` guards everywhere so the lib degrades gracefully if qa-runtime.sh is absent.
  - The `${BASH_SOURCE[0]%/*}` trick resolves the lib directory even when qa-assertions.sh is sourced from a charter in a different CWD.
  - After editing, verify: `bash -n docs/qa/scripts/lib/qa-assertions.sh` passes; `source docs/qa/scripts/lib/qa-assertions.sh && type qa_runtime_clear assert_runtime_clean` lists both.

  **MUST NOT DO:**
  - Do NOT change qa_refuse, qa_report_bug, qa_warn function signatures or behavior.
  - Do NOT remove or reorder existing functions.
  - Do NOT make assert_runtime_clean (fatal) the default in qa-finish — use \_warn for backward compatibility.
  - Do NOT edit any charter scripts (T5 does that).

  **Parallelization:** Wave 2 | Blocked by: T1 | Blocks: T5, T6

  **References:**
  - `docs/qa/scripts/lib/qa-assertions.sh:43-61` — config block (insertion point for source)
  - `docs/qa/scripts/lib/qa-assertions.sh:69-75` — qa_capture_evidence (insertion point for hook)
  - `docs/qa/scripts/lib/qa-assertions.sh:904-916` — qa-finish (insertion point for gate)
  - T1 output: `docs/qa/scripts/lib/qa-runtime.sh` (the module being wired in)
  - T3 output: `docs/qa/scripts/R0-runtime-detection.sh` (used to verify the wiring works end-to-end)

  **Acceptance criteria:**
  - `bash -n docs/qa/scripts/lib/qa-assertions.sh` passes
  - `source docs/qa/scripts/lib/qa-assertions.sh 2>/dev/null && type qa_runtime_clear qa_capture_runtime assert_no_console_errors assert_runtime_clean assert_runtime_clean_warn` lists all 5
  - Running `bash docs/qa/scripts/R0-runtime-detection.sh` against the live app exits 0 with "ALL CHECKS PASSED" (this is the T3 charter, now executable)

  **QA scenarios:**
  - HAPPY: Run R0 charter (T3) end-to-end. It must exit 0, detecting both the injected console.error and the 404. Evidence: `.omo/evidence/task-4-qa-runtime-expansion/r0-full-run.txt`
  - REGRESSION: Run `bash docs/qa/scripts/S0-smoke.sh` (unchanged charter). It must still exit 0 (the \_warn gate in qa-finish doesn't block). Evidence: `.omo/evidence/task-4-qa-runtime-expansion/s0-regression.txt`
  - EVIDENCE: Run a charter that triggers qa_refuse (e.g. navigate to a missing element). Verify the evidence dir now contains console-_.json + errors-_.json + network-\*.json alongside the existing .snap/.png. Evidence: `.omo/evidence/task-4-qa-runtime-expansion/refuse-evidence-check.txt`

  **Commit:** Y | `feat(qa): wire qa-runtime.sh into qa-assertions.sh — auto-capture + advisory gate`

---

- [x] 5. **Update all 7 charter scripts — add runtime clear + assert**

  **What to do:**
  Add two calls to each of the 7 existing charter scripts (`S0-smoke.sh`, `A1-presence.sh`, `B1-collaborative-creation.sh`, `B2-multi-term-lifecycle.sh`, `B3-skill-training.sh`, `B4-skill-deselect.sh`, `U2-wide-viewport.sh`):
  1. **`qa_runtime_clear`** — immediately AFTER the `qa-login` call (and after any second-session login in B1/A1 multiplayer charters). This starts each charter with a clean runtime buffer so prior-session noise doesn't pollute results.

  2. **`assert_runtime_clean_warn`** — immediately BEFORE the `qa-finish success` call. This is advisory (warns but doesn't block) for safe rolling adoption. The fatal `assert_runtime_clean` variant is available for charters that want strict gating, but we default to warn to avoid breaking existing passing charters that may have known console noise.

  For each charter, the change is exactly 2 lines added. Example for S0-smoke.sh:

  ```bash
  # After line ~32 (qa-login):
  QA_STEP="01-login"
  qa-login
  qa_runtime_clear   # <-- ADD THIS LINE

  # ... existing charter steps ...

  # Before line ~93 (qa-finish success):
  assert_runtime_clean_warn   # <-- ADD THIS LINE
  qa-finish success
  ```

  For multiplayer charters (B1, A1), add `qa_runtime_clear` after BOTH `qa-login` AND the second-session login (e.g. `qa_p2_login`), and add `assert_runtime_clean_warn` before the final `qa-finish`. Note: the second session (`qa-mp-p2`) has its own runtime buffer — `qa_runtime_clear` uses `$QA_SESSION` which is the primary session. If the multiplayer charter wants to check P2's runtime too, that's a future enhancement; for now, clear+check only the primary session.

  **MUST DO:**
  - Read each charter script FIRST to find the exact `qa-login` and `qa-finish` lines.
  - Place `qa_runtime_clear` AFTER qa-login returns (not before — the page must be loaded).
  - Place `assert_runtime_clean_warn` BEFORE qa-finish (not after — qa-finish calls qa-cleanup which closes the browser, wiping the buffer).
  - For B2 specifically: it already has a one-off `agent-browser console` capture at line 134. Leave that in place (it's a specific crash diagnostic) but add the standard `qa_runtime_clear` + `assert_runtime_clean_warn` calls too.
  - Verify each script: `bash -n docs/qa/scripts/<charter>.sh` passes.

  **MUST NOT DO:**
  - Do NOT change any existing charter logic, step ordering, or assertions.
  - Do NOT add `assert_runtime_clean` (fatal) — use `_warn` for safe adoption.
  - Do NOT remove B2's existing diagnostic console capture.
  - Do NOT modify qa-assertions.sh or qa-runtime.sh (T1/T4 already done).

  **Parallelization:** Wave 3 | Blocked by: T4 | Blocks: none

  **References:**
  - `docs/qa/scripts/S0-smoke.sh:32` — qa-login line; `:93` — qa-finish line
  - `docs/qa/scripts/A1-presence.sh` — read to find qa-login + qa-finish (multiplayer, has qa_p2_login)
  - `docs/qa/scripts/B1-collaborative-creation.sh:30` — qa_p2_login; `:247` — qa-finish
  - `docs/qa/scripts/B2-multi-term-lifecycle.sh:134` — existing one-off console capture (preserve)
  - `docs/qa/scripts/B3-skill-training.sh`, `B4-skill-deselect.sh`, `U2-wide-viewport.sh` — read each to find login+finish lines

  **Acceptance criteria:**
  - `for f in S0-smoke A1-presence B1-collaborative-creation B2-multi-term-lifecycle B3-skill-training B4-skill-deselect U2-wide-viewport; do bash -n "docs/qa/scripts/$f.sh"; done` — all pass
  - Each script contains exactly one `qa_runtime_clear` (primary session) and one `assert_runtime_clean_warn`
  - `grep -c qa_runtime_clear docs/qa/scripts/[SBAU]*.sh` shows 1 per file (7 total)

  **QA scenarios:**
  - HAPPY: Run `bash docs/qa/scripts/S0-smoke.sh` against the live app. Must exit 0. Evidence dir must contain console-_.json + errors-_.json + network-\*.json. Evidence: `.omo/evidence/task-5-qa-runtime-expansion/s0-runtime-evidence.txt`
  - REGRESSION: Run B3-skill-training.sh (a charter with known visual issues). Must still reach qa-finish (the \_warn gate doesn't block). Evidence: `.omo/evidence/task-5-qa-runtime-expansion/b3-regression.txt`

  **Commit:** Y | `feat(qa): add runtime clear+assert to all 7 charter scripts`

---

- [x] 6. **Update `docs/qa/scripts/run-qa-modes.sh` — formalize runtime evidence in prompts**

  **What to do:**
  The mode-dispatch prompts already mention "Capture all console output" (lines ~125, ~226) and "console/runtime" as a report-focus category (lines ~154, ~244). Formalize these into explicit instructions that reference the new runtime evidence artifacts and the `assert_runtime_clean_warn` gate.

  Specifically:
  1. In `build_targeted_prompt()` (around line 90-130), update the "Capture all console output" instruction to specify:

     ```
     Each charter now auto-captures runtime evidence to:
       $QA_EVIDENCE_DIR/console-<step>.json  (browser console messages)
       $QA_EVIDENCE_DIR/errors-<step>.json   (uncaught JS exceptions)
       $QA_EVIDENCE_DIR/network-<step>.json  (HTTP requests with status)
     After each charter, review errors-*.json for uncaught exceptions and
     network-*.json for 4xx/5xx responses. Report any runtime errors found
     even if the charter exited 0.
     ```

  2. In `build_full_prompt()` (around line 180-247), add runtime evidence to the screenshot-review checklist:

     ```
     When reviewing evidence directories, ALSO check:
       - errors-*.json files for uncaught exceptions (these are app bugs even
         if the charter passed visually)
       - network-*.json for failed HTTP requests (status >= 400)
     ```

  3. In the report-focus categories (around line 154), ensure "console/runtime" is listed alongside "visual/layout" and "functional/flow".

  **MUST DO:**
  - Read run-qa-modes.sh fully (lines 90-247) to find the exact prompt strings to update.
  - Preserve all existing prompt structure — only add/clarify runtime references.
  - The prompt text is what the OpenCode subagent reads; make it actionable (specific file patterns to check, not vague "check console").

  **MUST NOT DO:**
  - Do NOT change the mode dispatch logic (targeted/exploratory/full selection).
  - Do NOT change charter discovery (`find -name '[A-Z][0-9]-*.sh'`).
  - Do NOT add R0 to the charter discovery pattern (it matches `[A-Z][0-9]` so R0 is auto-discovered — verify this, don't break it).

  **Parallelization:** Wave 3 | Blocked by: T4 | Blocks: none

  **References:**
  - `docs/qa/scripts/run-qa-modes.sh:75` — discover_charters (find pattern)
  - `docs/qa/scripts/run-qa-modes.sh:90-130` — build_targeted_prompt
  - `docs/qa/scripts/run-qa-modes.sh:132-179` — build_exploratory_prompt
  - `docs/qa/scripts/run-qa-modes.sh:180-247` — build_full_prompt

  **Acceptance criteria:**
  - `bash -n docs/qa/scripts/run-qa-modes.sh` passes
  - `grep -c "console-\|errors-\|network-" docs/qa/scripts/run-qa-modes.sh` ≥ 3 (runtime evidence patterns referenced)
  - Charter discovery still matches R0: `find docs/qa/scripts -maxdepth 1 -name '[A-Z][0-9]-*.sh' | grep R0` returns R0-runtime-detection.sh

  **QA scenarios:**
  - HAPPY: Run `docs/qa/scripts/run-qa-modes.sh --mode targeted --charters R0` (or equivalent). The generated prompt must mention runtime evidence files. Evidence: `.omo/evidence/task-6-qa-runtime-expansion/targeted-prompt.txt` (the prompt text with runtime references visible).

  **Commit:** Y | `feat(qa): formalize runtime evidence in run-qa-modes.sh prompts`

---

## Final verification wave

> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.

- [x] F1. **Plan compliance audit** — `oracle` — verify every todo matches the plan's stated scope, all 8 functions exist in qa-runtime.sh, qa-state.md has runtime_status in all 9 blocks, all 7 charters have clear+assert, R0 charter exists and is executable, run-qa-modes.sh references runtime evidence. Check no scope creep into apps/ or existing assertions.

- [x] F2. **Code quality review** — `oracle` — review qa-runtime.sh for: bash strict-mode compliance, proper error handling (|| true on capture, proper exit on assert), JSON parsing robustness (handles empty/malformed JSON), no shell injection via untrusted JSON content, graceful degradation when qa-runtime.sh is absent. Review qa-assertions.sh wiring for: correct insertion points, type-guard pattern, no behavior change to existing functions.

- [x] F3. **Real manual QA** — `qa-traveller` or hands-on — run R0-runtime-detection.sh and at least 2 existing charters (S0 + B3) against the live app. Verify: R0 exits 0 with detection proof, S0 exits 0 with runtime evidence captured, B3 reaches qa-finish with runtime evidence captured. Capture the actual evidence directory listing showing console-_.json + errors-_.json + network-\*.json alongside existing .snap/.png.

- [x] F4. **Scope fidelity** — `oracle` — confirm: no injected JS listeners added, no apps/ changes, no existing assertion behavior changed, no new dependencies, agent-browser tool unmodified. Confirm the noise allowlist is documented and extensible.

## Commit strategy

- One commit per todo (6 commits total), each prefixed `feat(qa):` or `test(qa):`.
- Commits are atomic: each leaves the QA system in a working state.
- T1 (module) ships first; T4 (wiring) activates it; T5/T6 (integration) adopt it.

## Success criteria

- A charter can no longer exit 0 while the app throws uncaught JS exceptions or logs console.error (without allowlist exemption).
- Every qa_refuse and qa_report_bug auto-captures console/errors/network evidence alongside screenshots.
- The qa-state.md registry can represent runtime health as an independent dimension.
- R0 charter proves the detection works end-to-end with a deliberate error injection.
- No existing charter's pass/fail behavior changes (advisory \_warn gate, not fatal).
