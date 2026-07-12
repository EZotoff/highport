#!/usr/bin/env bash
# docs/qa/scripts/B5-mishap-flow.sh
#
# Reference charter: B5 Mishap and Failure-Path Flow.
# Tests the intentional failure path:
#   1. Login → /chargen → Create New Character → fill name + 3 skills
#   2. Continue to career selection → select Drifter → select assignment
#   3. Force survival roll failure → verify mishap → classify redirect
#
# Exit codes:
#   0 = success (redirect checked and no app bug reported)
#   1 = app_bug (known mishap redirect bug or another real defect found)
#   2 = precondition_failure (a required precondition was not met)
#
# Usage:
#   bash docs/qa/scripts/B5-mishap-flow.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "B5-mishap-flow"

echo "=== B5: Mishap and Failure-Path Flow ==="

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

# ---- Step 3: Install forced roll failure ----
QA_STEP="03-install-force-failure"
qa-force-roll-failure

# ---- Step 4: Create New Character ----
QA_STEP="04-create-character"
qa-click "Create New Character"
sleep 1
qa-wait-for-visual-state
qa-screenshot "background-form"

# ---- Step 5: Fill name ----
QA_STEP="05-fill-name"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
name_ref=$(echo "$snap" | grep 'CHARACTER NAME' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
[[ -n "$name_ref" ]] || qa_refuse "name input not found in snapshot"
qa-fill "$name_ref" "B5 Mishap Test" "name"

# ---- Step 6: Select 3 background skills ----
QA_STEP="06-select-skills"
qa-select-skill "Admin"
qa-select-skill "Animals"
qa-select-skill "Art"
assert_text_visible "Selected: 3/3"
qa-screenshot "skills-selected"

# ---- Step 7: Advance to career selection ----
QA_STEP="07-advance-to-careers"
qa-click-and-wait "Continue →" "wizard:career_selection"
sleep 1
qa-screenshot "career-selection"
assert_wizard_status "career_selection"

# ---- Step 8: Select Drifter career ----
QA_STEP="08-select-drifter"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
drifter_ref=$(echo "$snap" | grep -i 'button.*Drifter' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
# Use qa-click (has eval fallback for SciFiButton) — native click may not fire onClick
qa-click "Drifter"
sleep 1
qa-screenshot "drifter-selected"

# ---- Step 9: Verify transition to term resolution ----
# Note: becomeDrifter() auto-assigns 'barbarian' and transitions to term_resolution immediately.
# No separate assignment selection step is needed for Drifters.
QA_STEP="09-verify-term-resolution"
sleep 2
qa-wait-for-visual-state
status=$(qa_wizard_status)
if [[ "$status" == "term_resolution" ]]; then
  qa_log "VERIFY | Drifter selection auto-transitioned to term_resolution | pass"
elif [[ "$status" == "career_selection" ]]; then
  # Fallback: if Drifter showed assignment options instead of auto-transitioning
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  assign_ref=$(echo "$snap" | grep -iE 'Wanderer|Scavenger|Barbarian|Belter|Belters|Roughneck|Roughnecks' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  if [[ -n "$assign_ref" ]]; then
    agent-browser --session "$QA_SESSION" click "$assign_ref" 2>/dev/null || true
    sleep 2
    qa-wait-for-visual-state
  else
    # Try clicking Continue if present
    continue_ref=$(echo "$snap" | grep -i 'Continue' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
    if [[ -n "$continue_ref" ]]; then
      agent-browser --session "$QA_SESSION" click "$continue_ref" 2>/dev/null || true
      sleep 2
      qa-wait-for-visual-state
    fi
  fi
fi
assert_wizard_status "term_resolution"
qa-screenshot "term-resolution"

# ---- Step 10: Roll survival under forced failure ----
QA_STEP="10-roll-survival-forced-fail"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
survival_ref=$(echo "$snap" | grep -i 'button.*Roll Survival\|Roll Survival' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
[[ -n "$survival_ref" ]] || qa_refuse "Roll Survival button not found"
agent-browser --session "$QA_SESSION" click "$survival_ref" 2>/dev/null || true
qa-wait-for-visual-state
sleep 2
qa-screenshot "after-survival-fail"

# ---- Step 11: Verify mishap fired ----
QA_STEP="11-verify-mishap"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if echo "$snap" | grep -qi 'mishap'; then
  qa_log "VERIFY | Mishap fired after survival failure | pass"
elif echo "$snap" | grep -qi 'failed\|did not survive\|survival'; then
  qa_report_bug "Survival failure text found but no mishap text matched — mishap may not have triggered properly"
else
  qa_report_bug "No mishap text found after forced survival failure — mishap may not have triggered"
fi

accept_ref=$(echo "$snap" | grep -i 'Accept Mishap' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$accept_ref" ]]; then
  agent-browser --session "$QA_SESSION" click "$accept_ref" 2>/dev/null || true
  sleep 2
  qa-wait-for-visual-state
  qa_log "ACTION | Accepted mishap to trigger career-exit redirect"
else
  qa_log "WARN | Accept Mishap button not found before redirect check"
fi

# ---- Step 12: Verify redirect destination ----
QA_STEP="12-verify-redirect"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
current_url=$(qa_get_url)
qa_log "REDIRECT_CHECK | url=${current_url}"

wizard_status=$(qa_wizard_status)
qa_log "REDIRECT_CHECK | wizard_status=${wizard_status:-unknown}"

# The known bug: mishap redirects to career_selection instead of mustering_out.
if [[ "$wizard_status" == "career_selection" ]]; then
  qa_report_bug "Mishap redirected to career_selection instead of mustering_out — B2 bug confirmed still present"
elif [[ "$wizard_status" == "mustering_out" ]]; then
  qa_log "VERIFY | Mishap redirect goes to mustering_out (correct) | pass"
else
  qa_report_bug "Mishap redirect went to unexpected status: ${wizard_status:-unknown} — expected mustering_out or career_selection"
fi

# ---- Step 13: Assert occlusion ----
QA_STEP="13-assert-occlusion"
assert_not_occluded_warn '[data-testid="main-content"] > div:last-child > button:last-child' "Continue button"

# ---- Step 14: Runtime and finish ----
QA_STEP="14-runtime-clean"
assert_runtime_clean_warn
qa-finish success
