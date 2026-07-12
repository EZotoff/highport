#!/usr/bin/env bash
# docs/qa/scripts/M2-reconnect.sh
#
# Reference charter: M2 Session Disconnect and Reconnect Recovery.
# Tests Hocuspocus WebSocket reconnect + Yjs state recovery after a full
# browser session close/reopen, which is stronger than page refresh.
#
# Exit codes:
#   0 = success (all steps passed, evidence captured)
#   1 = app_bug (a real defect was found, with investigation evidence)
#   2 = precondition_failure (a required precondition was not met)
#
# Usage:
#   bash docs/qa/scripts/M2-reconnect.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "M2-reconnect"

echo "=== M2: Session Disconnect & Reconnect Recovery ==="

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
qa-fill "$name_ref" "M2 Reconnect" "name"

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

# ---- Step 7: Capture pre-disconnect state ----
QA_STEP="07-capture-pre-disconnect"
url=$(qa_get_url)
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if echo "$snap" | grep -Fq "M2 Reconnect"; then
  qa_log "VERIFY | Pre-disconnect character name present | pass"
else
  qa_refuse "pre-disconnect character name not found in snapshot"
fi
assert_wizard_status "career_selection"
qa_log "VERIFY | Pre-disconnect wizard status career_selection | pass"
# Record skill state for later comparison
if echo "$snap" | grep -Fq "Selected: 3/3"; then
  qa_log "VERIFY | Pre-disconnect skills confirmed (Selected: 3/3) | pass"
fi
qa-screenshot "pre-disconnect"

# ---- Step 8: Close browser session (simulate disconnect) ----
QA_STEP="08-disconnect"
agent-browser --session "$QA_SESSION" close 2>/dev/null || true
qa_log "DISCONNECT | session=${QA_SESSION} | closed"

# ---- Step 9: Wait for disconnect period ----
QA_STEP="09-wait-disconnect"
sleep 3
qa_log "DISCONNECT_WAIT | 3s sleep complete"

# ---- Step 10: Reopen session & manual login ----
# NOTE: Cannot use qa-login here because it destroys /tmp/qa/${QA_SESSION}
#       (which holds IndexedDB for Yjs sync). We must preserve session data.
# NextAuth cookies may persist in the profile — if so, we skip login and go straight to chargen.
QA_STEP="10-reopen-login"
agent-browser --session "$QA_SESSION" \
  --profile "/tmp/qa/${QA_SESSION}" \
  --session-name "$QA_SESSION" \
  open "${QA_BASE_URL}/chargen" 2>/dev/null | tail -1
agent-browser --session "$QA_SESSION" wait 2000 2>/dev/null | tail -1

# Check if we landed on /chargen (cookies persisted) or got redirected to /login
reconnect_url=$(qa_get_url)
if [[ "$reconnect_url" == *"/chargen"* ]]; then
  qa_log "RECONNECT_AUTH | cookies persisted, skipped login | url=${reconnect_url} | pass"
else
  # Redirected to /login — cookies expired, need explicit login
  qa_log "RECONNECT_AUTH | cookies expired, performing login | url=${reconnect_url}"
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  email_ref=$(echo "$snap" | grep -i 'EMAIL' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  pass_ref=$(echo "$snap" | grep -i 'PASSWORD' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  signin_ref=$(echo "$snap" | grep -i 'Sign In' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)

  [[ -z "$email_ref" ]] && qa_refuse "reconnect: email field not found on login page"
  [[ -z "$pass_ref" ]] && qa_refuse "reconnect: password field not found on login page"
  [[ -z "$signin_ref" ]] && qa_refuse "reconnect: Sign In button not found on login page"

  agent-browser --session "$QA_SESSION" fill "$email_ref" "agent-qa-player1@example.com" 2>/dev/null | tail -1
  agent-browser --session "$QA_SESSION" fill "$pass_ref" "test-password-123" 2>/dev/null | tail -1
  agent-browser --session "$QA_SESSION" click "$signin_ref" 2>/dev/null | tail -1
  agent-browser --session "$QA_SESSION" wait 2000 2>/dev/null | tail -1

  reconnect_url=$(qa_get_url)
  if [[ "$reconnect_url" == *"/login"* ]]; then
    qa_refuse "reconnect login failed — still on /login page"
  fi
  qa_log "RECONNECT_LOGIN | url=${reconnect_url} | pass"
fi
qa_log "RECONNECT_LOGIN | url=${url} | pass"
qa-screenshot "reconnected-login"

# ---- Step 11: Navigate to chargen after reconnect ----
QA_STEP="11-navigate-after-reconnect"
qa-navigate "/chargen"
sleep 1
qa-wait-for-visual-state
qa-screenshot "chargen-after-reconnect"

# ---- Step 12: Verify character name survived disconnect ----
QA_STEP="12-verify-character"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if echo "$snap" | grep -Fq "M2 Reconnect"; then
  qa_log "VERIFY | Character name survived session disconnect | pass"
else
  qa_report_bug "Character name lost after browser session close/reopen — Hocuspocus/Yjs persistence failure"
fi

# ---- Step 13: Verify wizard state recovered ----
QA_STEP="13-verify-wizard-state"
status=$(qa_wizard_status)
if [[ "$status" == "career_selection" ]]; then
  qa_log "VERIFY | Wizard status recovered to career_selection | pass"
elif [[ "$status" == "background" ]]; then
  qa_report_bug "Wizard status fell back to background after session disconnect — expected career_selection, Yjs reconnection may have lost state"
else
  qa_report_bug "Wizard status unexpected after reconnect: expected='career_selection' actual='${status}'"
fi
qa-screenshot "wizard-state-verified"

# ---- Step 14: Verify background skills survived ----
QA_STEP="14-verify-skills"
if echo "$snap" | grep -Fq "Selected: 3/3"; then
  qa_log "VERIFY | Background skill count survived disconnect | pass"
elif echo "$snap" | grep -Fq "Admin" && echo "$snap" | grep -Fq "Animals" && echo "$snap" | grep -Fq "Art"; then
  qa_log "VERIFY | Background skill names survived disconnect | pass"
else
  qa_report_bug "Background skills lost after session disconnect — Hocuspocus/Yjs persistence failure"
fi

# ---- Step 15: Continue forward to term_resolution ----
QA_STEP="15-continue-forward"
# Select a career if at career_selection (none was chosen before disconnect)
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
career_ref=$(echo "$snap" | grep -iE 'Agent|Army|Citizen|Drifter|Entertainer|Marine|Merchant|Navy|Noble|Rogue|Scholar|Scout' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$career_ref" ]]; then
  agent-browser --session "$QA_SESSION" click "$career_ref" 2>/dev/null || true
  sleep 1
  qa-wait-for-visual-state
  qa_log "INFO | Selected career card for continuation"
fi
# Advance to term_resolution — the definitive proof recovery worked
qa-click-and-wait "Continue →" "wizard:term_resolution"
sleep 1
qa-screenshot "term-resolution-after-reconnect"
qa_log "VERIFY | Reached term_resolution after session reconnect | pass"

echo ""
echo "=== M2 DISCONNECT RECONNECT TEST COMPLETE ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
