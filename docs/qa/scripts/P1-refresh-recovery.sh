#!/usr/bin/env bash
# docs/qa/scripts/P1-refresh-recovery.sh
#
# Reference charter: P1 Page Refresh and State Recovery.
# Exit codes:
#   0 = success (all steps passed, evidence captured)
#   1 = app_bug (a real defect was found, with investigation evidence)
#   2 = precondition_failure (a required precondition was not met)
#
# Usage:
#   bash docs/qa/scripts/P1-refresh-recovery.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "P1-refresh-recovery"

echo "=== P1: Page Refresh and State Recovery ==="

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

# ---- Step 3: Create New Character ----
QA_STEP="03-create-character"
qa-click "Create New Character"
sleep 1
qa-wait-for-visual-state
qa-screenshot "background-form"

# ---- Step 4: Fill name ----
QA_STEP="04-fill-name"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
name_ref=$(echo "$snap" | grep 'CHARACTER NAME' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
[[ -n "$name_ref" ]] || qa_refuse "name input not found in snapshot"
qa-fill "$name_ref" "P1 Test" "name"

# ---- Step 5: Select 3 background skills ----
QA_STEP="05-select-skills"
qa-select-skill "Admin"
qa-select-skill "Animals"
qa-select-skill "Art"
assert_text_visible "Selected: 3/3"
qa-screenshot "background-skills-selected"

# ---- Step 6: Advance wizard to Career Selection ----
QA_STEP="06-advance"
qa-click-and-wait "Continue →" "wizard:career_selection"
sleep 1
qa-screenshot "career-selection"
assert_wizard_status "career_selection"

# ---- Step 7: Capture pre-refresh state ----
QA_STEP="07-capture-pre-refresh"
url=$(qa_get_url)
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if echo "$snap" | grep -Fq "P1 Test"; then
  qa_log "VERIFY | Pre-refresh character name present | pass"
else
  qa_refuse "pre-refresh character name not found in snapshot"
fi
assert_wizard_status "career_selection"
qa_log "VERIFY | Pre-refresh URL captured | url=${url}"
qa_log "VERIFY | Pre-refresh wizard status career_selection | pass"

# ---- Step 8: Refresh current page ----
QA_STEP="08-refresh"
agent-browser --session "$QA_SESSION" open "$url" 2>/dev/null | tail -1
agent-browser --session "$QA_SESSION" wait 3000 2>/dev/null | tail -1
qa-wait-for-visual-state
qa-screenshot "after-refresh"

# ---- Step 9: Verify recovered state ----
QA_STEP="09-verify-recovery"
assert_wizard_status "career_selection"

# Verify character name survived refresh (DOM eval)
name_found=$(agent-browser --session "$QA_SESSION" eval \
  "(() => { return document.body.innerText.includes('P1 Test') ? 'yes' : 'no'; })()" \
  2>/dev/null | tail -1 | tr -d '"')
if [[ "$name_found" == "yes" ]]; then
  qa_log "VERIFY | Character name survived refresh | pass"
else
  qa_report_bug "Character name lost after page refresh — persistence failure"
fi

# Go back to background step to verify skills survived (skill counter is only visible there)
qa-click "Back"
sleep 2
qa-wait-for-visual-state

# Wait for state rehydration from localStorage snapshot (async after refresh)
recovered=false
for attempt in $(seq 1 10); do
  skill_count=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { const m = document.body.innerText.match(/Selected:\\s*(\\d)\\/3/); return m ? m[1] : '0'; })()" \
    2>/dev/null | tail -1 | tr -d '"')
  if [[ "$skill_count" == "3" ]]; then
    recovered=true
    break
  fi
  sleep 1
done

# Verify background skills survived refresh
if [[ "$recovered" == "true" ]]; then
  qa_log "VERIFY | Background skill count survived refresh (${skill_count}/3 after ${attempt}s on background step) | pass"
else
  qa_report_bug "Background skills lost after page refresh — persistence failure (count: ${skill_count}/3 after 10s)"
fi

# ---- Step 10: Assert Continue button is not occluded ----
QA_STEP="10-assert-occlusion"
assert_not_occluded_warn '[data-testid="main-content"] > div:last-child > button:last-child' "Continue button"

echo ""
echo "=== P1 REFRESH RECOVERY TEST PASSED ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
