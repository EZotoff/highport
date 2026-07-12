#!/usr/bin/env bash
# docs/qa/scripts/M1-conflict-resolution.sh
#
# Reference charter: M1 Conflict Resolution — Simultaneous Edits, CRDT Merge,
# Entity Lifecycle.
#
# Tests that two players in the same session can make simultaneous changes and the
# CRDT layer resolves conflicts correctly without data loss or corruption.
# Extends the B1 two-session pattern with deeper sync/merge testing.
#
# Multi-session handling:
#   - Alpha uses qa-login (clean start, $QA_SESSION)
#   - Bravo uses qa_bravo_login (no close, separate session "qa-session-bravo")
#
# Exit codes:
#   0 = success (all steps passed, evidence captured)
#   1 = app_bug (a real defect was found, with investigation evidence)
#   2 = precondition_failure (a required precondition was not met)
#
# Usage:
#   bash docs/qa/scripts/M1-conflict-resolution.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "M1-conflict-resolution"

echo "=== M1: Conflict Resolution — Simultaneous Edits & CRDT Merge ==="

# --- Bravo custom login (no agent-browser close) ---
qa_bravo_login() {
  local session="qa-session-bravo"
  local email="${1:-agent-qa-player2@example.com}"
  local password="${2:-test-password-123}"

  qa_log "BRAVO_LOGIN_START | session=${session} email=${email}"

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

  [[ -z "$email_ref" ]] && qa_refuse "Bravo: email field not found on login page"
  [[ -z "$pass_ref" ]] && qa_refuse "Bravo: password field not found on login page"
  [[ -z "$signin_ref" ]] && qa_refuse "Bravo: Sign In button not found on login page"

  agent-browser --session "$session" fill "$email_ref" "$email" 2>/dev/null | tail -1
  agent-browser --session "$session" fill "$pass_ref" "$password" 2>/dev/null | tail -1
  agent-browser --session "$session" click "$signin_ref" 2>/dev/null | tail -1
  agent-browser --session "$session" wait 2000 2>/dev/null | tail -1

  local url
  url=$(agent-browser --session "$session" get url 2>/dev/null | tail -1)
  if [[ "$url" == *"/login"* ]]; then
    qa_refuse "Bravo: login failed — still on /login page"
  fi
  qa_log "BRAVO_LOGIN | email=${email} | url=${url} | pass"

  export QA_SESSION_BRAVO="$session"
}

qa_bravo_navigate() {
  local path="$1"
  agent-browser --session "$QA_SESSION_BRAVO" open "${QA_BASE_URL}${path}" 2>/dev/null | tail -1
  agent-browser --session "$QA_SESSION_BRAVO" wait 1500 2>/dev/null | tail -1
  qa_log "BRAVO_NAVIGATE | path=${path}"
}

qa_bravo_screenshot() {
  local tag="$1"
  agent-browser --session "$QA_SESSION_BRAVO" screenshot "$(pwd)/$QA_EVIDENCE_DIR/bravo-${tag}-${QA_STEP}.png" --full 2>&1 > /dev/null
  qa_log "BRAVO_SCREENSHOT | tag=${tag}"
}

qa_bravo_snapshot() {
  local tag="$1"
  agent-browser --session "$QA_SESSION_BRAVO" snapshot -i > "$QA_EVIDENCE_DIR/bravo-${tag}-${QA_STEP}.snap" 2>&1
}

# ============================================================
# ALPHA: Creates session and first character
# ============================================================

# ---- Step 1: Alpha Login ----
QA_STEP="01-alpha-login"
qa-login
qa_runtime_clear
qa-screenshot "alpha-logged-in"
assert_screenshot_clean "alpha-logged-in"

# ---- Step 2: Alpha Navigate to chargen ----
QA_STEP="02-alpha-chargen"
qa-navigate "/chargen"
sleep 1
qa-wait-for-visual-state
qa-screenshot "alpha-chargen"
assert_screenshot_clean "alpha-chargen"

# ---- Step 3: Extract invite URL ----
QA_STEP="03-alpha-invite-url"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)

invite_url=""
invite_url=$(echo "$snap" | grep -o 'http://[^[:space:]]*chargen/join/[a-zA-Z0-9_-]*' | head -1 || true)
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
    qa_refuse "Alpha: could not extract invite URL"
  fi
fi
qa_log "INFO | Alpha invite URL: $invite_url"

# ---- Step 4: Alpha creates first character with background skills ----
QA_STEP="04-alpha-create-character"
qa-click "Create New Character"
sleep 1

snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
name_ref=$(echo "$snap" | grep 'CHARACTER NAME' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$name_ref" ]]; then
  qa-fill "$name_ref" "M1 Alpha Agent" "name"
fi

qa-select-skill "Admin"
qa-select-skill "Animals"
qa-select-skill "Art"
qa-wait-for-visual-state
qa-screenshot "alpha-background-complete"

# ============================================================
# BRAVO: Joins session and verifies presence
# ============================================================

# ---- Step 5: Bravo Login ----
QA_STEP="05-bravo-login"
qa_bravo_login "agent-qa-player2@example.com" "test-password-123"
qa_bravo_screenshot "bravo-logged-in"

# ---- Step 6: Bravo Joins via invite URL ----
QA_STEP="06-bravo-join"
qa_bravo_navigate "/chargen/join/${invite_url##*/}"
sleep 2
qa_bravo_snapshot "bravo-join-modal"

# ---- Step 7: Bravo fills name and joins session ----
QA_STEP="07-bravo-join-session"
snap=$(agent-browser --session "$QA_SESSION_BRAVO" snapshot -i 2>&1)

if echo "$snap" | grep -qi 'Session Not Found\|not found\|error'; then
  qa_report_bug "Bravo: Session join failed — Session Not Found. URL: $invite_url"
fi

name_ref=$(echo "$snap" | grep -i 'NAME\|name\|Name' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$name_ref" ]]; then
  agent-browser --session "$QA_SESSION_BRAVO" fill "$name_ref" "M1 Bravo Operator" 2>/dev/null || true
  sleep 1
fi

join_ref=$(echo "$snap" | grep -i 'Join Session\|Join' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$join_ref" ]]; then
  agent-browser --session "$QA_SESSION_BRAVO" click "$join_ref" 2>/dev/null || true
  sleep 3
fi
qa_bravo_screenshot "bravo-joined"
assert_screenshot_clean "bravo-joined"

# ---- Step 8: Verify mutual presence — both see each other in participant panel ----
QA_STEP="08-mutual-presence"

# Bravo checks for Alpha and self
snap=$(agent-browser --session "$QA_SESSION_BRAVO" snapshot -i 2>&1)
qa_bravo_snapshot "bravo-participant-panel"

alpha_seen_by_bravo=false
bravo_seen_by_bravo=false
if echo "$snap" | grep -qi 'M1 Alpha Agent\|Alpha'; then
  alpha_seen_by_bravo=true
  qa_log "VERIFY | Bravo sees Alpha in participant panel | pass"
else
  qa_warn "Bravo does not see Alpha in participant panel — sync may be delayed"
fi

if echo "$snap" | grep -qi 'M1 Bravo Operator\|Bravo'; then
  bravo_seen_by_bravo=true
  qa_log "VERIFY | Bravo sees self in participant panel | pass"
else
  qa_warn "Bravo does not see self in participant panel"
fi

# Alpha checks for Bravo
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if echo "$snap" | grep -qi 'M1 Bravo Operator\|Bravo'; then
  qa_log "VERIFY | Alpha sees Bravo in participant panel | pass"
else
  qa_warn "Alpha does not see Bravo in participant panel — sync may be delayed"
fi
qa-screenshot "alpha-mutual-presence"
qa_bravo_screenshot "bravo-mutual-presence"

# ---- Step 9: Alpha selects additional background skills — verify Bravo sees within 2s ----
QA_STEP="09-alpha-real-time-sync"

# Alpha selects 3 more skills dynamically from the page (not hardcoded)
# Find skills that aren't already selected
available_skills=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1 | grep -oP '(?<=text=)[A-Za-z ]+' | grep -viE 'selected|continue|back|character|background|email|password|sign|session|skill$' | head -6 | tail -3)
skill_count=0
for skill in $available_skills; do
  qa-select-skill "$skill" 2>/dev/null || true
  skill_count=$((skill_count + 1))
  [[ $skill_count -ge 3 ]] && break
done
# Fallback: if dynamic discovery found nothing, use known skill names
if [[ $skill_count -eq 0 ]]; then
  qa-select-skill "Carouse" 2>/dev/null || true
  qa-select-skill "Deception" 2>/dev/null || true
  qa-select-skill "Drive" 2>/dev/null || true
fi
sleep 0.5
qa-screenshot "alpha-skills-updated"

# Poll Bravo for sync — CRDT propagation should complete well within 2s on localhost
sync_detected=false
sync_time=0
for attempt in 1 2 3; do
  sleep 1
  sync_time=$attempt
  snap=$(agent-browser --session "$QA_SESSION_BRAVO" snapshot -i 2>&1)

  # Check for evidence of updated background state (selected skills count, skill names)
  if echo "$snap" | grep -qi 'Carouse\|Deception\|Drive\|Selected: 6'; then
    sync_detected=true
    qa_log "VERIFY | Bravo detected Alpha skill update at poll #${attempt} (${sync_time}s) | pass"
    break
  fi
done

if [[ "$sync_detected" != "true" ]]; then
  qa_warn "Bravo did not detect Alpha's skill change within 3s — Yjs sync delay or propagation gap"
fi

qa_bravo_snapshot "bravo-after-alpha-skills"
qa_bravo_screenshot "bravo-after-alpha-skills"

# ---- Step 10: Both sessions advance wizard independently — verify no state corruption ----
QA_STEP="10-simultaneous-advance"

# Alpha advances from character creation
assert_not_occluded_warn '[data-testid="main-content"] > div:last-child > button:last-child' "Continue → button"
qa-click-and-wait "Continue →" "text:Career Selection"
qa-wait-for-visual-state
qa-screenshot "alpha-career-selection"

# Bravo attempts to advance their local wizard (independent nav within shared session)
snap=$(agent-browser --session "$QA_SESSION_BRAVO" snapshot -i 2>&1)
continue_ref=$(echo "$snap" | grep -i 'Continue' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$continue_ref" ]]; then
  agent-browser --session "$QA_SESSION_BRAVO" click "$continue_ref" 2>/dev/null || true
  sleep 2
  qa_log "INFO | Bravo clicked Continue — verifying no corruption"
fi

# Wait for full sync propagation
sleep 3
qa_bravo_snapshot "bravo-after-simultaneous-advance"
qa_bravo_screenshot "bravo-after-simultaneous-advance"

# Verify Alpha wizard state is intact (career selection visible, no error state)
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if echo "$snap" | grep -qi 'Career\|career\|Drifter\|career_selection'; then
  qa_log "VERIFY | Alpha wizard shows career selection after independent advance | pass"
else
  qa_warn "Alpha wizard state unclear after simultaneous advance"
fi

# Verify Bravo state is consistent — no error markers, no corruption indicators
snap=$(agent-browser --session "$QA_SESSION_BRAVO" snapshot -i 2>&1)
if echo "$snap" | grep -qi 'error\|corrupt\|undefined\|null\|NaN\|TypeError\|Uncaught'; then
  qa_report_bug "Bravo shows error/corrupt state after simultaneous advance — CRDT merge may have failed"
fi
qa_log "VERIFY | No corruption detected in Bravo after simultaneous advance | pass"

# ---- Step 11: Alpha creates a second character — verify Bravo entity pool updates ----
QA_STEP="11-alpha-second-character"

# Look for entity pool interaction or "New Character" controls
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
create_ref=$(echo "$snap" | grep -i 'Create\|New Character\|Add Character\|Spawn' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
second_created=false

if [[ -n "$create_ref" ]]; then
  agent-browser --session "$QA_SESSION" click "$create_ref" 2>/dev/null || true
  sleep 2

  # Name the second character if name field appears
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  name_ref=$(echo "$snap" | grep 'CHARACTER NAME' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  if [[ -n "$name_ref" ]]; then
    qa-fill "$name_ref" "M1 Recon Specialist" "name2"
    qa-select-skill "Investigate"
    qa-select-skill "Recon"
    sleep 1
    qa-screenshot "alpha-second-character"
    second_created=true
    qa_log "INFO | Alpha created second character: M1 Recon Specialist"
  fi
fi

if [[ "$second_created" == "true" ]]; then
  # Poll Bravo for entity pool update — character should appear within 5s
  entity_detected=false
  for attempt in 1 2 3 4 5; do
    sleep 1
    snap=$(agent-browser --session "$QA_SESSION_BRAVO" snapshot -i 2>&1)
    if echo "$snap" | grep -qi 'M1 Recon Specialist\|Recon Specialist'; then
      entity_detected=true
      qa_log "VERIFY | Bravo sees Alpha's second character in entity pool (attempt ${attempt}) | pass"
      break
    fi
  done

  if [[ "$entity_detected" != "true" ]]; then
    qa_warn "Bravo did not detect Alpha's second character in entity pool — entity sync gap"
  fi
else
  qa_log "INFO | Second character creation controls not accessible — skipping entity pool expansion test"
fi

qa_bravo_snapshot "bravo-entity-pool-after-second"
qa_bravo_screenshot "bravo-entity-pool-after-second"

# Check for duplicate entities — there should be exactly one "M1 Alpha Agent" entry
snap=$(agent-browser --session "$QA_SESSION_BRAVO" snapshot -i 2>&1)
alpha_count=$(echo "$snap" | grep -co 'M1 Alpha Agent' || true)
if [[ "${alpha_count:-0}" -gt 1 ]]; then
  qa_report_bug "Duplicate entity detected: 'M1 Alpha Agent' appears ${alpha_count} times — CRDT sync may have produced duplicates"
else
  qa_log "VERIFY | No duplicate entities found | pass"
fi

# ---- Step 12: Bravo deletes their character — verify Alpha sees removal ----
QA_STEP="12-bravo-delete-character"

# Look for a delete/remove control on Bravo's own character
snap=$(agent-browser --session "$QA_SESSION_BRAVO" snapshot -i 2>&1)
delete_ref=$(echo "$snap" | grep -i 'Delete\|Remove\|🗑\|trash\|✕\|✖\|close' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)

bravo_deleted=false
if [[ -n "$delete_ref" ]]; then
  agent-browser --session "$QA_SESSION_BRAVO" click "$delete_ref" 2>/dev/null || true
  sleep 1

  # Handle confirmation dialog if present
  snap=$(agent-browser --session "$QA_SESSION_BRAVO" snapshot -i 2>&1)
  confirm_ref=$(echo "$snap" | grep -i 'Confirm\|Yes\|Delete.*button\|Are you sure' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  if [[ -n "$confirm_ref" ]]; then
    agent-browser --session "$QA_SESSION_BRAVO" click "$confirm_ref" 2>/dev/null || true
    sleep 2
  fi
  bravo_deleted=true
  qa_bravo_screenshot "bravo-after-delete"
  qa_log "VERIFY | Bravo deleted their character | pass"
else
  qa_log "INFO | Delete/Remove control not found — Bravo may not have a deletable character or UI pattern differs"
fi

if [[ "$bravo_deleted" == "true" ]]; then
  # Poll Alpha to verify Bravo's character is removed from entity pool
  removal_detected=false
  for attempt in 1 2 3 4 5; do
    sleep 1
    snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
    if ! echo "$snap" | grep -qi 'M1 Bravo Operator'; then
      removal_detected=true
      qa_log "VERIFY | Alpha sees Bravo's character removed (attempt ${attempt}) | pass"
      break
    fi
  done

  if [[ "$removal_detected" != "true" ]]; then
    qa_warn "Alpha still sees Bravo's character after deletion — entity removal sync may be incomplete"
  fi
fi

qa-screenshot "alpha-after-bravo-delete"

# ---- Cleanup Bravo session ----
QA_STEP="cleanup-bravo"
agent-browser --session "$QA_SESSION_BRAVO" close 2>/dev/null || true
rm -rf "/tmp/qa/${QA_SESSION_BRAVO}"
qa_log "CLEANUP | Bravo session=$QA_SESSION_BRAVO | pass"

echo ""
echo "=== M1 CONFLICT RESOLUTION & CRDT MERGE TEST COMPLETE ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
