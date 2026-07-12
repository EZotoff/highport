#!/usr/bin/env bash
# docs/qa/scripts/S0-smoke.sh
#
# Reference charter: S0 Smoke Test.
# Demonstrates the qa-assertions.sh library on the simplest flow:
# login -> navigate to chargen -> create character -> fill name + 3 skills
# -> advance to career selection -> verify state.
#
# This is the canonical example of how to write a charter script.
# Copy this structure for all other charters.
#
# Exit codes:
#   0 = success (all steps passed, evidence captured)
#   1 = app_bug (a real defect was found, with investigation evidence)
#   2 = precondition_failure (a required precondition was not met)
#
# Usage:
#   ./docs/qa/scripts/run-qa.sh   # sets loop guard thresholds
#   bash docs/qa/scripts/S0-smoke.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "S0-smoke"

echo "=== S0 Smoke Test ==="

# ---- Step 1: Login ----
QA_STEP="01-login"
qa-login
qa_runtime_clear
assert_screenshot_clean "login"

# ---- Step 2: Navigate to chargen ----
QA_STEP="02-navigate-chargen"
qa-navigate "/chargen"
assert_wizard_status "background"
qa-wait-for-visual-state
qa-screenshot "chargen-initial"
assert_screenshot_clean "chargen-background-step"

# ---- Step 3: Create New Character ----
# This is the button that requires the eval .click() fallback.
# qa-click handles it automatically: tries native first, falls back to eval.
QA_STEP="03-create-character"
qa-click "Create New Character"
sleep 1

# Verify character creation form appeared
agent-browser --session "$QA_SESSION" eval \
  "document.querySelector('input[placeholder=\"Enter character name\"]')?.outerHTML || 'NOT FOUND'" \
  2>/dev/null | tail -1 | grep -q 'input' \
  || qa_report_bug "Create New Character did not produce the name input field (tried native click + eval .click() fallback)"

qa_log "VERIFY | name input field present after Create New Character | pass"

# ---- Step 4: Fill name ----
QA_STEP="04-fill-name"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
name_ref=$(echo "$snap" | grep 'CHARACTER NAME' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
[[ -n "$name_ref" ]] || qa_refuse "name input not found in snapshot"
qa-fill "$name_ref" "S0 Smoke Test Character" "name"

# ---- Step 5: Select 3 background skills ----
QA_STEP="05-select-skills"
qa-select-skill "Admin"
qa-select-skill "Animals"
qa-select-skill "Art"
assert_text_visible "Selected: 3/3"
assert_screenshot_clean "skills-selected"

# ---- Step 6: Advance wizard to Career Selection ----
QA_STEP="06-advance-to-careers"

# T9: Warn if GM Controls bar occludes the Continue button (P0 bug)
assert_not_occluded_warn '[data-testid="main-content"] > div:last-child > button:last-child' "Continue → button"
qa-click-and-wait "Continue →" "wizard:career_selection"
qa-wait-for-visual-state
qa-screenshot "career-selection"

# ---- Step 7: Verify career selection UI ----
QA_STEP="07-verify-career-step"
assert_text_visible "Career Selection"
qa_log "VERIFY | career selection heading visible | pass"
assert_screenshot_clean "career-selection"

echo ""
echo "=== S0 SMOKE TEST PASSED ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
