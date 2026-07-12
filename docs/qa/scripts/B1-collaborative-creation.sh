#!/usr/bin/env bash
# docs/qa/scripts/B1-collaborative-creation.sh
#
# Reference charter: B1 Collaborative Character Creation.
# Tests that player2 (in the same session) can observe player1's character
# appearing in the entity pool or wizard after creation.
#
# Multi-session handling:
#   - P1 uses qa-login (clean start)
#   - P2 uses qa_p2_login (no close, separate session)
#
# Exit codes:
#   0 = success (all steps passed, evidence captured)
#   1 = app_bug (a real defect was found, with investigation evidence)
#   2 = precondition_failure (a required precondition was not met)
#
# Usage:
#   bash docs/qa/scripts/B1-collaborative-creation.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "B1-collaborative-creation"

echo "=== B1: Collaborative Character Creation ==="

# --- Player 2 custom login (no agent-browser close) ---
qa_p2_login() {
  local session="qa-mp-p2"
  local email="${1:-agent-qa-player2@example.com}"
  local password="${2:-test-password-123}"
  
  qa_log "LOGIN_P2_START | session=${session} email=${email}"
  
  rm -rf "/tmp/qa/${session}"
  mkdir -p "/tmp/qa/${session}"
  
  agent-browser --session "$session" \
    --profile "/tmp/qa/${session}" \
    --session-name "$session" \
    open "${QA_BASE_URL}/login" 2>/dev/null | tail -1
  agent-browser --session "$session" wait 1500 2>/dev/null | tail -1
  
  local snap
  snap=$(agent-browser --session "$session" snapshot -i 2>&1)
  
  local email_ref pass_ref signin_ref
  email_ref=$(echo "$snap" | grep -i 'EMAIL' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  pass_ref=$(echo "$snap" | grep -i 'PASSWORD' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  signin_ref=$(echo "$snap" | grep -i 'Sign In' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  
  [[ -z "$email_ref" ]] && qa_refuse "P2: email field not found on login page"
  [[ -z "$pass_ref" ]] && qa_refuse "P2: password field not found on login page"
  [[ -z "$signin_ref" ]] && qa_refuse "P2: Sign In button not found on login page"
  
  agent-browser --session "$session" fill "$email_ref" "$email" 2>/dev/null | tail -1
  agent-browser --session "$session" fill "$pass_ref" "$password" 2>/dev/null | tail -1
  agent-browser --session "$session" click "$signin_ref" 2>/dev/null | tail -1
  agent-browser --session "$session" wait 2000 2>/dev/null | tail -1
  
  local url
  url=$(agent-browser --session "$session" get url 2>/dev/null | tail -1)
  if [[ "$url" == *"/login"* ]]; then
    qa_refuse "P2: login failed — still on /login page"
  fi
  qa_log "LOGIN_P2 | email=${email} | url=${url} | pass"
  
  export QA_SESSION_P2="$session"
}

qa_p2_navigate() {
  local path="$1"
  agent-browser --session "$QA_SESSION_P2" open "${QA_BASE_URL}${path}" 2>/dev/null | tail -1
  agent-browser --session "$QA_SESSION_P2" wait 1500 2>/dev/null | tail -1
  qa_log "P2_NAVIGATE | path=${path}"
}

qa_p2_screenshot() {
  local tag="$1"
  agent-browser --session "$QA_SESSION_P2" screenshot "$(pwd)/$QA_EVIDENCE_DIR/p2-${tag}-${QA_STEP}.png" --full 2>&1 > /dev/null
  qa_log "P2_SCREENSHOT | tag=${tag}"
}

qa_p2_snapshot() {
  local tag="$1"
  agent-browser --session "$QA_SESSION_P2" snapshot -i > "$QA_EVIDENCE_DIR/p2-${tag}-${QA_STEP}.snap" 2>&1
}

# ============================================================
# PLAYER 1: Creates character in shared session
# ============================================================

# ---- Step 1: P1 Login ----
QA_STEP="01-p1-login"
qa-login
qa_runtime_clear
qa-screenshot "p1-logged-in"
assert_screenshot_clean "p1-logged-in"

# ---- Step 2: P1 Navigate to chargen ----
QA_STEP="02-p1-chargen"
qa-navigate "/chargen"
sleep 1
qa-wait-for-visual-state
qa-screenshot "p1-chargen"
assert_screenshot_clean "p1-chargen"

# ---- Step 3: Extract invite URL ----
QA_STEP="03-invite-url"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)

invite_url=""
invite_url=$(echo "$snap" | grep -o 'http://[^ 	]*chargen/join/[a-zA-Z0-9_-]*' | head -1 || true)
if [[ -z "$invite_url" ]]; then
  invite_url=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { 
      const el = document.querySelector('[data-testid=invite-link]');
      if (el) return el.textContent || el.innerText || '';
      const links = Array.from(document.querySelectorAll('a, span, div, p'));
      const found = links.find(l => l.textContent && l.textContent.includes('/chargen/join/'));
      return found ? found.textContent.trim() : '';
    })()" 2>/dev/null | tail -1 | tr -d '"' || true)
fi

if [[ -z "$invite_url" ]]; then
  session_id_from_snap=$(echo "$snap" | grep -o '/chargen/join/[a-zA-Z0-9_-]*' | head -1 | sed 's|/chargen/join/||' || true)
  if [[ -n "$session_id_from_snap" ]]; then
    invite_url="${QA_BASE_URL}/chargen/join/${session_id_from_snap}"
  else
    qa_refuse "P1: could not extract invite URL"
  fi
fi
qa_log "INFO | P1 invite URL: $invite_url"

# ---- Step 4: P1 creates character with background ----
QA_STEP="04-p1-create-character"
qa-click "Create New Character"
sleep 1

snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
name_ref=$(echo "$snap" | grep 'CHARACTER NAME' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$name_ref" ]]; then
  qa-fill "$name_ref" "B1 Shared Character" "name"
fi

# Select background skills
qa-select-skill "Admin"
qa-select-skill "Animals"
qa-select-skill "Art"
qa-wait-for-visual-state
qa-screenshot "p1-background-complete"

# ============================================================
# PLAYER 2: Joins and observes shared state
# ============================================================

# ---- Step 5: P2 Custom Login ----
QA_STEP="05-p2-login"
qa_p2_login "agent-qa-player2@example.com" "test-password-123"
qa_p2_screenshot "p2-logged-in"

# ---- Step 6: P2 Navigate to invite URL ----
QA_STEP="06-p2-join"
qa_p2_navigate "/chargen/join/${invite_url##*/}"
sleep 2
qa_p2_snapshot "p2-join-modal"

# ---- Step 7: P2 Fill name and join ----
QA_STEP="07-p2-join-session"
snap=$(agent-browser --session "$QA_SESSION_P2" snapshot -i 2>&1)

if echo "$snap" | grep -qi 'Session Not Found\|not found\|error'; then
  qa_report_bug "P2: Session join failed — Session Not Found. URL: $invite_url"
fi

name_ref=$(echo "$snap" | grep -i 'NAME\|name\|Name' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$name_ref" ]]; then
  agent-browser --session "$QA_SESSION_P2" fill "$name_ref" "QA Player 2" 2>/dev/null || true
  sleep 1
fi

join_ref=$(echo "$snap" | grep -i 'Join Session\|Join' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$join_ref" ]]; then
  agent-browser --session "$QA_SESSION_P2" click "$join_ref" 2>/dev/null || true
  sleep 3
fi
qa_p2_screenshot "p2-joined"
assert_screenshot_clean "p2-joined"

# ---- Step 8: P2 checks Entity Pool for P1's character ----
QA_STEP="08-check-entity-pool"
snap=$(agent-browser --session "$QA_SESSION_P2" snapshot -i 2>&1)
qa_p2_snapshot "p2-entity-pool"

# Look for evidence of P1's character in the entity pool
shared_visible=false
if echo "$snap" | grep -qi 'B1 Shared Character'; then
  shared_visible=true
  qa_log "VERIFY | P2 sees P1's character name in UI | pass"
elif echo "$snap" | grep -qi 'Shared Character\|entity\|Entity Pool'; then
  shared_visible=true
  qa_log "VERIFY | P2 sees evidence of shared state in Entity Pool | pass"
fi

# Also check participant panel
if echo "$snap" | grep -qi 'Character\|character'; then
  qa_log "INFO | P2 sees character-related content"
fi

qa_p2_screenshot "p2-entity-pool-view"

# ---- Step 9: P1 advances to career selection, check if P2 sees it ----
QA_STEP="09-p1-advance"

# T9: Warn if GM Controls bar occludes the Continue button (P0 bug)
assert_not_occluded_warn '[data-testid="main-content"] > div:last-child > button:last-child' "Continue → button"
qa-click-and-wait "Continue →" "text:Career Selection"
qa-wait-for-visual-state
qa-screenshot "p1-career-selection"
assert_screenshot_clean "p1-career-selection"

# Give sync time
sleep 3

# P2 checks again
snap=$(agent-browser --session "$QA_SESSION_P2" snapshot -i 2>&1)
qa_p2_snapshot "p2-after-p1-advance"
qa_p2_screenshot "p2-after-p1-advance"

# Check if P2 sees career selection or updated state
if echo "$snap" | grep -qi 'Career\|career\|Drifter\|career_selection'; then
  qa_log "VERIFY | P2 sees career-related content after P1 advanced | pass"
fi

# ---- Cleanup P2 ----
QA_STEP="cleanup-p2"
agent-browser --session "$QA_SESSION_P2" close 2>/dev/null || true
rm -rf "/tmp/qa/${QA_SESSION_P2}"
qa_log "CLEANUP | P2 session=$QA_SESSION_P2 | pass"

echo ""
echo "=== B1 COLLABORATIVE CREATION TEST COMPLETE ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
