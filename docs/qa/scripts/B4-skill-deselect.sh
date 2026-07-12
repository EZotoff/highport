#!/usr/bin/env bash
# docs/qa/scripts/B4-skill-deselect.sh
#
# Reference charter: B4 Skill Selection and Deselection Verification.
# Tests skill selection (background skills) and documents that deselection
# is NOT IMPLEMENTED in the codebase — a known feature gap.
#
# Exit codes:
#   0 = success (all steps passed, evidence captured)
#   1 = app_bug (a real defect was found, with investigation evidence)
#   2 = precondition_failure (a required precondition was not met)
#
# Usage:
#   bash docs/qa/scripts/B4-skill-deselect.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "B4-skill-deselect"

echo "=== B4: Skill Selection and Deselection Verification ==="

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
qa-fill "$name_ref" "B4 Deselect Test" "name"

# ---- Step 5: Test skill selection ----
QA_STEP="05-select-skill"
qa-select-skill "Admin"
assert_text_visible "Selected: 1/3"
qa_log "VERIFY | Skill 'Admin' selected successfully | pass"
qa-screenshot "skill-selected"

# ---- Step 6: Verify skill appears in CharacterPreview (if visible) ----
QA_STEP="06-verify-preview"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if echo "$snap" | grep -qi 'Admin'; then
  qa_log "VERIFY | Skill 'Admin' visible in UI | pass"
else
  qa_log "WARN | Skill 'Admin' not confirmed in snapshot"
fi

# ---- Step 7: Select 2 more skills (3/3) ----
QA_STEP="07-select-more"
qa-select-skill "Animals"
qa-select-skill "Art"
assert_text_visible "Selected: 3/3"
qa-screenshot "three-skills-selected"
assert_screenshot_clean "three-skills-selected"

# ---- Step 8: Test deselection (feature gap) ----
QA_STEP="08-test-deselect"
# Background skill selection uses a toggle pattern (checkbox/button).
# Try clicking Admin again to deselect — if it doesn't work, this is a feature gap.
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
admin_ref=$(echo "$snap" | grep -i 'Admin' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)

if [[ -n "$admin_ref" ]]; then
  # Try native click
  agent-browser --session "$QA_SESSION" click "$admin_ref" 2>/dev/null || true
  sleep 1
  
  # Check if deselection worked — read count from DOM (a11y snapshot doesn't reliably include counter text)
  count_after=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { const m = document.body.innerText.match(/Selected:\\s*(\\d)\\/3/); return m ? m[1] : 'unknown'; })()" \
    2>/dev/null | tail -1 | tr -d '"')
  
  if [[ "$count_after" == "2" ]]; then
    qa_log "VERIFY | Skill deselection works (count decreased to 2/3) | pass"
  else
    # Try eval click as fallback (skill controls are label elements, not always captured by ref)
    agent-browser --session "$QA_SESSION" eval \
      "(() => { const els = Array.from(document.querySelectorAll('button, label, [role=button], [role=checkbox]')); const el = els.find(e => e.textContent.includes('Admin')); if (el) { el.click(); return 'clicked'; } return 'not_found'; })()" \
      2>/dev/null > /dev/null || true
    sleep 1
    
    count_after=$(agent-browser --session "$QA_SESSION" eval \
      "(() => { const m = document.body.innerText.match(/Selected:\\s*(\\d)\\/3/); return m ? m[1] : 'unknown'; })()" \
      2>/dev/null | tail -1 | tr -d '"')
    
    if [[ "$count_after" == "2" ]]; then
      qa_log "VERIFY | Skill deselection works via eval click | pass"
    else
      qa_log "APP_BUG | Skill deselection not working — count is ${count_after}/3 after click attempt"
      qa-screenshot "deselection-failed"
    fi
  fi
fi


# ---- Step 9: Document the feature gap ----
QA_STEP="09-document-gap"
# Read current count from DOM (more reliable than snapshot text matching)
current_count=$(agent-browser --session "$QA_SESSION" eval \
  "(() => { const m = document.body.innerText.match(/Selected:\\s*(\\d)\\/3/); return m ? m[0] : 'unknown'; })()" \
  2>/dev/null | tail -1 | tr -d '"')

# Check if skill deselection worked by looking at current count
if [[ "$current_count" == "Selected: 3/3" ]]; then
  qa_log "APP_BUG | Skill deselection not working — all 3 skills remain selected after click attempt"
  qa-screenshot "deselection-feature-gap"
  qa_report_bug "Skill deselection not working — skills cannot be deselected once selected in background step."
else
  qa_log "VERIFY | Skill deselection functional (count: $current_count) | pass"
  qa-screenshot "deselection-success"
fi

# T9: Warn if GM Controls bar occludes the Continue button (P0 bug)
assert_not_occluded_warn '[data-testid="main-content"] > div:last-child > button:last-child' "Continue → button"
echo ""
echo "=== B4 SKILL DESELECTION TEST COMPLETE ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
