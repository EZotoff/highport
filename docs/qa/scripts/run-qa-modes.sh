#!/usr/bin/env bash
# docs/qa/scripts/run-qa-modes.sh
#
# Wrapper that accepts a --mode argument and dispatches the correct QA workflow,
# then delegates to run-qa.sh for the actual opencode invocation.
#
# Modes:
#   targeted     — Run specified charter script(s) via bash through opencode subagents.
#   exploratory  — Perform exploratory visual QA (E1 charter) + review of prior evidence.
#   full         — Targeted charters first, then exploratory review of captured screenshots.
#
# Usage:
#   ./docs/qa/scripts/run-qa-modes.sh --help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_QA="$SCRIPT_DIR/run-qa.sh"

# ---- Defaults ----
MODE="targeted"
CHARTER_FILTER=""
EVIDENCE_DIRS=()
DRY_RUN=false

# ---- Usage ----
show_usage() {
  cat <<'USAGE'
run-qa-modes.sh — Dispatch QA workflows by mode.

Usage:
  run-qa-modes.sh [options]

Modes:
  --mode targeted      Run charter script(s) via bash through opencode subagents.
                       Default mode. Use --charter to filter which scripts run.

  --mode exploratory   Perform exploratory visual QA following the E1 charter,
                       then review key screenshots from prior evidence dirs.

  --mode full          Targeted charters first, then exploratory review of
                       screenshots captured during Phase 1.

Options:
  --charter <id>       Charter ID or prefix to run (e.g., B2, B, S0).
                       Only meaningful in targeted and full modes.
                       Default: all enabled charter scripts.

  --evidence-dir <path>
                       Path to an evidence directory containing actions.log
                       and screenshots for review. Repeatable for multiple dirs.
                       In exploratory mode, these dirs are reviewed after the
                       E1 exploration. In full mode, they supplement the screenshots
                       captured during Phase 1.
                       Default: none.

  --dry-run            Print the constructed prompt and the call that would be
                       made, without executing anything.

  --help               Show this message and exit.

Examples:
  run-qa-modes.sh
  run-qa-modes.sh --mode targeted --charter S0
  run-qa-modes.sh --mode targeted
  run-qa-modes.sh --mode exploratory
  run-qa-modes.sh --mode exploratory --evidence-dir .sisyphus/evidence/qa/B3-skill-training
  run-qa-modes.sh --mode full
  run-qa-modes.sh --mode full --charter B --dry-run
USAGE
}

# ---- Charter discovery ----
# Outputs matching charter script paths, one per line, sorted.
discover_charters() {
  local pattern="${1:-}"

  while IFS= read -r -d '' f; do
    local basename
    basename="$(basename "$f")"
    if [[ -z "$pattern" ]] || [[ "$basename" == "$pattern"* ]]; then
      printf '%s\n' "$f"
    fi
  done < <(find "$SCRIPT_DIR" -maxdepth 1 -name '[A-Z][0-9]-*.sh' -print0 | sort -z)
}

# ---- Prompt builders ----

# build_targeted_prompt: construct the prompt for targeted mode.
build_targeted_prompt() {
  local pattern="${1:-}"
  local -a charters=()
  local script

  while IFS= read -r script; do
    charters+=("$script")
  done < <(discover_charters "$pattern")

  if [[ ${#charters[@]} -eq 0 ]]; then
    echo "Error: no charter scripts found matching pattern '${pattern}'" >&2
    echo "  Discovered: run-qa-modes.sh --dry-run to see what would match" >&2
    exit 1
  fi

  local script_list=""
  for script in "${charters[@]}"; do
    script_list+=$'\n    bash "'"$script"'"'
  done

  cat <<PROMPT
You are a QA subagent running charter scripts for the Highport app.

**Precondition**: All required services must be running before starting:
  - Web (port 18120), Fastify (port 18122), Hocuspocus (port 18121), PostgreSQL (port 18123)

Run the following QA charter scripts **in order**. For each script:

  1. Execute it: \`bash "<path>"\`
  2. Check the exit code:
     - 0  = success (all assertions passed, evidence captured)
     - 1  = app\_bug (a real defect was found with investigation evidence)
     - 2  = precondition\_failure (required precondition not met, not a code bug)
  3. If exit code is 1, document the bug but **continue** with the remaining scripts.
  4. If exit code is 2, note the failure and continue — the next script may work.
  5. Capture runtime evidence after each script:
     a. Save console output to $QA_EVIDENCE_DIR/console-<step>.json;
        review for warnings and errors.
     b. Check runtime errors in $QA_EVIDENCE_DIR/errors-<step>.json;
        report any uncaught exceptions found.
     c. Check network failures in $QA_EVIDENCE_DIR/network-<step>.json;
        report any failed requests (status >= 400).
  6. Even if a charter exits 0, examine its errors-*.json and network-*.json
     for silent runtime failures that did not trigger an assertion.

Charter scripts (run in this exact order):${script_list}
PROMPT
}

# build_exploratory_prompt: construct the prompt for exploratory mode.
build_exploratory_prompt() {
  local -a review_dirs=("$@")

  cat <<PROMPT
You are a QA subagent running exploratory visual QA for the Highport app.

**Precondition**: All required services must be running before starting:
  - Web (port 18120), Fastify (port 18122), Hocuspocus (port 18121), PostgreSQL (port 18123)

## Phase 1: Exploratory Testing (E1 Charter)

Read and follow the E1 exploratory charter at \`docs/qa/charters/E1-exploratory.md\`.

Key actions:
  1. Log in as \`agent-qa-player1@example.com\` / \`test-password-123\`
  2. Freely drive the chargen wizard at \`/chargen\`
  3. Visit all FSM states: background → career_selection → term_resolution → mustering_out → finalized
  4. Capture screenshots at every wizard state transition
  5. Test at BOTH 1280×720 and 1920×1080 viewports
  6. Test edge cases: long names, rapid clicking, back navigation, page refresh, empty selection, max-length input
  7. Run \`assert_no_overflow\`, \`assert_utilizes_width\`, and \`assert_screenshot_clean\` from \`docs/qa/scripts/lib/qa-assertions.sh\`
  8. Use \`look_at\` with the **Comprehensive** prompt from \`docs/qa/scripts/lib/qa-review-prompts.md\` for every screenshot review
  9. Document every finding per the E1 Report Focus categories:
     - visual/layout: overflow/clipping, layout/spacing, overlap/misalignment
     - functional/flow: responsive, edge cases
     - console/runtime: console errors, network failures

## Phase 2: Screenshot Review of Prior Evidence
PROMPT

  if [[ ${#review_dirs[@]} -gt 0 ]]; then
    echo ""
    echo "For each evidence directory below, review its key screenshots:"
    echo ""
    for dir in "${review_dirs[@]}"; do
      echo "  Evidence dir: $dir"
      echo "    1. Run: bash docs/qa/scripts/lib/qa-key-screenshots.sh \"$dir\""
      echo "    2. The script outputs paths to key screenshots"
      echo "    3. For each path, run look_at with the Comprehensive prompt"
      echo "       from docs/qa/scripts/lib/qa-review-prompts.md"
      echo "    4. Document all findings"
      echo ""
    done
  else
    echo ""
    echo "  (No evidence directories specified for review. Run Phase 1 only.)"
    echo ""
  fi
}

# build_full_prompt: construct the prompt for full mode.
build_full_prompt() {
  local pattern="${1:-}"
  shift || true
  local -a extra_dirs=("$@")
  local -a charters=()
  local script

  while IFS= read -r script; do
    charters+=("$script")
  done < <(discover_charters "$pattern")

  if [[ ${#charters[@]} -eq 0 ]]; then
    echo "Error: no charter scripts found matching pattern '${pattern}'" >&2
    exit 1
  fi

  local script_list=""
  for script in "${charters[@]}"; do
    script_list+=$'\n    bash "'"$script"'"'
  done

  local extra_review=""
  if [[ ${#extra_dirs[@]} -gt 0 ]]; then
    extra_review=$'\nAdditional directories to include in the review:'
    for dir in "${extra_dirs[@]}"; do
      extra_review+=$'\n  - '"$dir"
    done
  fi

  cat <<PROMPT
You are a QA subagent running the **complete** QA workflow for the Highport app.

**Precondition**: All required services must be running before starting:
  - Web (port 18120), Fastify (port 18122), Hocuspocus (port 18121), PostgreSQL (port 18123)

---

## Phase 1: Targeted Charter Execution

Run the following QA charter scripts **in order**. For each script:

  1. Execute it: \`bash "<path>"\`
  2. Check the exit code:
     - 0  = success
     - 1  = app\_bug (document and continue)
     - 2  = precondition\_failure (note and continue)
  3. Capture all console output.

Charter scripts (run in this exact order):${script_list}

---

## Phase 2: Screenshot Review of Captured Evidence

After all Phase 1 charter scripts complete, review the screenshots they captured:

  1. Scan for evidence directories created by the charters under \`.sisyphus/evidence/\`.
     Each charter creates its own subdirectory (e.g., \`.sisyphus/evidence/S0-smoke/\`).
  2. For EACH evidence directory found:
     a. Run: \`bash docs/qa/scripts/lib/qa-key-screenshots.sh <dir>\`
     b. The script outputs paths to key screenshots
     c. For each path, run \`look_at\` with the **Comprehensive** prompt
        from `docs/qa/scripts/lib/qa-review-prompts.md`
     d. Document all findings per the E1 Report Focus categories
        (overflow/clipping, layout/spacing, overlap/misalignment, responsive, console/runtime)
     e. For the same evidence directory, check runtime evidence files:
        - errors-*.json: look for uncaught JavaScript exceptions
        - network-*.json: look for failed HTTP requests (status >= 400)
        Report any runtime failures found, even if Phase 1 charters exited 0.
  3. Compile a summary report of all findings from both phases.${extra_review}
PROMPT
}

# ---- Parse arguments ----
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      show_usage
      exit 0
      ;;
    --mode)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --mode requires an argument" >&2
        exit 1
      fi
      MODE="$2"
      shift 2
      ;;
    --charter)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --charter requires an argument" >&2
        exit 1
      fi
      CHARTER_FILTER="$2"
      shift 2
      ;;
    --evidence-dir)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --evidence-dir requires an argument" >&2
        exit 1
      fi
      EVIDENCE_DIRS+=("$2")
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Error: unknown option '$1'" >&2
      show_usage >&2
      exit 1
      ;;
  esac
done

# ---- Validate mode ----
case "$MODE" in
  targeted|exploratory|full) ;;
  *)
    echo "Error: --mode must be 'targeted', 'exploratory', or 'full' (got: '$MODE')" >&2
    exit 1
    ;;
esac

if [[ "$MODE" == "exploratory" ]] && [[ -n "$CHARTER_FILTER" ]]; then
  echo "[run-qa-modes] Warning: --charter is ignored in exploratory mode" >&2
fi

if [[ "$MODE" == "targeted" ]] && [[ ${#EVIDENCE_DIRS[@]} -gt 0 ]]; then
  echo "[run-qa-modes] Warning: --evidence-dir is ignored in targeted mode" >&2
fi

# ---- Verify run-qa.sh exists ----
if [[ ! -x "$RUN_QA" ]]; then
  echo "Error: run-qa.sh not found or not executable at '$RUN_QA'" >&2
  exit 1
fi

# ---- Build the prompt ----
PROMPT=""

case "$MODE" in
  targeted)
    PROMPT="$(build_targeted_prompt "$CHARTER_FILTER")"
    ;;
  exploratory)
    PROMPT="$(build_exploratory_prompt "${EVIDENCE_DIRS[@]}")"
    ;;
  full)
    PROMPT="$(build_full_prompt "$CHARTER_FILTER" "${EVIDENCE_DIRS[@]}")"
    ;;
esac

# ---- Dry-run or dispatch ----
if [[ "$DRY_RUN" == "true" ]]; then
  echo "==================== DRY RUN ===================="
  echo "Mode:           $MODE"
  echo "Charter filter: ${CHARTER_FILTER:-<all>}"
  echo "Evidence dirs:  ${EVIDENCE_DIRS[*]:-<none>}"
  echo ""
  echo "=== PROMPT ==="
  echo "$PROMPT"
  echo ""
  echo "=== Would execute ==="
  echo "  $RUN_QA --task <prompt>"
  echo "==================== END DRY RUN ===================="
  exit 0
fi

echo "[run-qa-modes] Mode: $MODE — delegating to run-qa.sh" >&2

# Delegate to run-qa.sh (which sets OMO_LOOP_GUARD_* env vars and exec's opencode)
exec "$RUN_QA" --task "$PROMPT"
