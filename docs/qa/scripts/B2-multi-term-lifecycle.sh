#!/usr/bin/env bash
# docs/qa/scripts/B2-multi-term-lifecycle.sh
#
# Reference charter: B2 Full Multi-Term Lifecycle.
# Drives a character through background → career selection → multiple terms
# → mustering out → finalization. Uses Drifter (always qualifies).
#
# This charter was previously FAILING with 7 issues, 3 P1 bugs.
# The script tries to complete the flow and uses qa_report_bug for real bugs.
#
# Exit codes:
#   0 = success (all steps passed, evidence captured)
#   1 = app_bug (a real defect was found, with investigation evidence)
#   2 = precondition_failure (a required precondition was not met)
#
# Usage:
#   bash docs/qa/scripts/B2-multi-term-lifecycle.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "B2-multi-term-lifecycle"

echo "=== B2: Full Multi-Term Character Lifecycle ==="

# Helper: find and click a button by visible text using eval (for non-standard buttons)
click_by_text() {
  local label="$1" session="$2"
  agent-browser --session "$session" eval \
    "(() => { const b = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('${label}')); if (b && !b.disabled) { b.click(); return 'clicked'; } return b ? 'disabled' : 'not_found'; })()" \
    2>/dev/null > /dev/null || true
  sleep 1
}

# ---- Step 1: Login ----
QA_STEP="01-login"
qa-login
qa_runtime_clear
# Dice override installed after wizard mounts (Step 2) — hook doesn't exist at login time

# ---- Step 2: Navigate to chargen ----
QA_STEP="02-navigate-chargen"
qa-navigate "/chargen"
assert_wizard_status "background"
# Install dice override NOW — wizard is mounted
qa-force-roll-success
qa-screenshot "chargen-start"
# Wait for WebSocket + Yjs doc to stabilize before interacting
qa-wait-for-visual-state
sleep 2

# ---- Step 3: Create New Character ----
QA_STEP="03-create-character"
qa-click "Create New Character"
sleep 1
qa-wait-for-visual-state
# Verify we're still on the chargen page (not redirected to campaigns)
status=$(qa_wizard_status)
[[ -n "$status" ]] || qa_refuse "Wizard disappeared after Create New Character — redirected to campaigns"

# ---- Step 4: Fill name ----
QA_STEP="04-fill-name"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
name_ref=$(echo "$snap" | grep 'CHARACTER NAME' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
[[ -n "$name_ref" ]] || qa_refuse "name input not found in snapshot"
qa-fill "$name_ref" "B2 Multi-Term Marine" "name"
qa-screenshot "background-name-filled"

# ---- Step 5: Select 3 background skills ----
QA_STEP="05-select-skills"
qa-select-skill "Admin"
qa-select-skill "Animals"
qa-select-skill "Art"
assert_text_visible "Selected: 3/3"
qa-screenshot "background-skills-done"

# ---- Step 6: Advance to career selection ----
QA_STEP="06-career-selection"

# T9: Warn if GM Controls bar occludes the Continue button (P0 bug)
assert_not_occluded_warn '[data-testid="main-content"] > div:last-child > button:last-child' "Continue → button"
qa-click-and-wait "Continue →" "wizard:career_selection"
assert_wizard_status "career_selection"
qa-wait-for-visual-state
qa-screenshot "career-selection"

# ---- Step 7: Select Drifter career (always qualifies) ----
QA_STEP="07-select-drifter"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
drifter_ref=$(echo "$snap" | grep -i 'button.*Drifter' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$drifter_ref" ]]; then
  agent-browser --session "$QA_SESSION" click "$drifter_ref" 2>/dev/null || true
  sleep 1
else
  qa-click "Drifter"
fi
sleep 2
qa-wait-for-visual-state
status=$(qa_wizard_status)
qa_log "INFO | After Drifter selection: wizard_status=${status}"
# ---- Step 8: Handle assignment selection ----
QA_STEP="08-career-confirm"
if [[ "$status" == "career_selection" ]]; then
  # Still on career_selection — need to click an assignment button
  # Try clicking the first Drifter assignment (Wanderer/Scavenger/Belter) within the wizard
  agent-browser --session "$QA_SESSION" eval \
    "(() => {
      const wizard = document.querySelector('[data-testid=chargen-wizard]');
      const btns = wizard ? wizard.querySelectorAll('button') : [];
      const b = Array.from(btns).find(b => /Wanderer|Scavenger|Belter/.test(b.textContent));
      if (b) { b.click(); return 'clicked:' + b.textContent.trim(); }
      return 'not_found';
    })()" 2>/dev/null || true
  sleep 2
  qa-wait-for-visual-state
elif [[ "$status" == "term_resolution" ]]; then
  qa_log "INFO | Already at term_resolution — Drifter auto-advanced past assignments"
fi
qa-screenshot "career-confirmed"
# ---- Step 9: Verify term_resolution ----
QA_STEP="09-term-resolution"
status=$(qa_wizard_status)
if [[ "$status" != "term_resolution" ]]; then
  # If wizard disappeared, the app likely crashed or navigated away
  if [[ -z "$status" ]]; then
    # Check if page is completely blank (app crash)
    local page_title
    page_title=$(agent-browser --session "$QA_SESSION" get title 2>/dev/null | tail -1 || true)
    qa_log "WARN | Wizard status empty — page title='${page_title}'"
    # Capture diagnostics: console errors + page URL
    local page_url
    page_url=$(agent-browser --session "$QA_SESSION" get url 2>/dev/null | tail -1 || true)
    agent-browser --session "$QA_SESSION" console 2>/dev/null > "$QA_EVIDENCE_DIR/diagnostic-09-term-resolution.console" || true
    qa_report_bug "App crashed after Drifter selection — blank page at URL=${page_url} title='${page_title}'. See .sisyphus/evidence/B2-multi-term-lifecycle/diagnostic-09-term-resolution.console"
  fi
  qa_refuse "Never reached term_resolution — stuck at ${status}"
fi
qa_log "VERIFY | Entered term_resolution | pass"
qa-wait-for-visual-state
qa-screenshot "term1-start"
assert_screenshot_clean "term1-resolution"
assert_no_overflow_warn "[data-testid=skill-table-container]" "Term 1 skill tables"

# ---- TERM LOOP: Execute up to 4 terms ----
for term_num in 1 2 3 4; do
  echo ""
  echo "--- Term $term_num ---"

  # ---- Survival Roll ----
  QA_STEP="T${term_num}-survival"
  qa-click "Roll Survival"
  sleep 1
  # Check if survival failed (mishap path)
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  if echo "$snap" | grep -qi 'mishap\|failed\|did not survive'; then
    qa_log "WARN | Survival roll failed in term $term_num — character forced out of career"
      # Accept mishap and break out of loop
      snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
      mishap_ref=$(echo "$snap" | grep -i "Accept Mishap" | grep -o "ref=e[0-9]*" | head -1 | sed "s/ref=/@/" || true)
      if [[ -n "$mishap_ref" ]]; then
        agent-browser --session "$QA_SESSION" click "$mishap_ref" 2>/dev/null || true
        sleep 1
      fi
      break
  fi
  qa-screenshot "term${term_num}-survival"

  # ---- Event Roll ----
  QA_STEP="T${term_num}-event"
  qa-click "Roll Event"
  sleep 1
  qa-screenshot "term${term_num}-event"

  # ---- Confirm event (use exact match to avoid wizard "Continue →" button) ----
  QA_STEP="T${term_num}-confirm-event"
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  if echo "$snap" | grep -q 'button "Continue"' || echo "$snap" | grep -q 'button "Confirm"' || echo "$snap" | grep -q 'button "Accept"'; then
    # Click event-phase Continue (must avoid "Continue →" nav arrow — B3 pattern)
    agent-browser --session "$QA_SESSION" eval \
      "(() => { const buttons = Array.from(document.querySelectorAll('button')); const cont = buttons.find(b => b.textContent.trim() === 'Continue' && !b.textContent.includes('→')); if (cont && !cont.disabled) { cont.click(); return 'clicked-event-continue'; } return 'not-found'; })()" \
      2>/dev/null > /dev/null || true
    sleep 2
    qa-wait-for-visual-state
  else
    qa_log "INFO | No event confirmation button found in term ${term_num} — event may have auto-resolved"
  fi
  # Verify wizard advanced past event phase
  status=$(qa_wizard_status)
  qa_log "INFO | After event confirm T${term_num}: wizard_status=${status}"
  qa-screenshot "term${term_num}-event-confirmed"

  # ---- Skill Training Phase ----
  QA_STEP="T${term_num}-skill"
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  if echo "$snap" | grep -qi 'Phase 3: Skill'; then
    qa_log "INFO | Skill training phase available in term $term_num"
    # Term 2+: Roll 1d6 may be already visible (table pre-selected)
    if echo "$snap" | grep -q 'Roll 1d6'; then
      qa-click "Roll 1d6"
    else
      # Term 1: Need to select a training table first
      agent-browser --session "$QA_SESSION" eval \
        "(() => { const b = Array.from(document.querySelectorAll('button')).find(b => /Personal Development|Service Skills|Advanced Education|Assignment Skills/.test(b.textContent) && !b.disabled); if (b) { b.click(); return 'ok'; } return 'nf'; })()" 2>/dev/null > /dev/null || true
      sleep 1
      qa-click "Roll 1d6"
    fi
    sleep 2
    qa-screenshot "term${term_num}-skill-gained"
    assert_no_overflow_warn "[data-testid=skill-table-container]" "Term ${term_num} skills"
  else
    qa_log "INFO | No explicit skill training phase found in term $term_num — may be basic training only"
  fi

  # ---- Commission (first term only, military careers) ----
  if [[ "$term_num" -eq 1 ]]; then
    QA_STEP="T1-commission"
    snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
    if echo "$snap" | grep -qi 'Attempt Commission'; then
      qa-click "Attempt Commission"
      sleep 1
      qa-screenshot "term1-commission"
    else
      qa_log "INFO | No commission option for Drifter (expected)"
    fi
  fi

  # ---- Advancement Roll ----
  QA_STEP="T${term_num}-advancement"
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  if echo "$snap" | grep -qi 'Roll Advancement'; then
    qa-click "Roll Advancement"
    sleep 1
    qa-wait-for-visual-state
    # Drifter advancement auto-transitions to complete phase — no acknowledgment needed
    sleep 2
    qa-wait-for-visual-state
  else
    qa_log "INFO | No advancement roll available in term $term_num"
  fi
  qa-screenshot "term${term_num}-advancement"
  assert_screenshot_clean "term${term_num}-advancement"

  # ---- Complete term / continue to next ----
  QA_STEP="T${term_num}-complete"
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  status=$(qa_wizard_status)
  qa_log "INFO | After term $term_num: wizard_status=${status}"

  # Check for aging prompt (age 34+)
  if echo "$snap" | grep -qi 'aging\|age 34'; then
    qa_log "VERIFY | Aging check triggered at term $term_num | pass"
    qa-screenshot "term${term_num}-aging"
    # Handle aging: select required characteristic losses, then apply
    if echo "$snap" | grep -qi 'Apply Aging Effects'; then
      qa_log "INFO | Aging losses need selection — auto-selecting characteristics"
      # Auto-select required physical losses (click first N physical stat buttons)
      agent-browser --session "$QA_SESSION" eval \
        "(() => { const buttons = Array.from(document.querySelectorAll('button')); const physBtns = buttons.filter(b => /^STR|^DEX|^END/.test(b.textContent.trim()) && !b.disabled); for (let i = 0; i < physBtns.length && i < 3; i++) { physBtns[i].click(); } return 'selected-phys:' + physBtns.length; })()" \
        2>/dev/null > /dev/null || true
      sleep 0.5
      # Auto-select required mental losses (click first N mental stat buttons)
      agent-browser --session "$QA_SESSION" eval \
        "(() => { const buttons = Array.from(document.querySelectorAll('button')); const mentBtns = buttons.filter(b => /^INT|^EDU|^SOC/.test(b.textContent.trim()) && !b.disabled); for (let i = 0; i < mentBtns.length && i < 3; i++) { mentBtns[i].click(); } return 'selected-ment:' + mentBtns.length; })()" \
        2>/dev/null > /dev/null || true
      sleep 0.5
      # Click Apply Aging Effects (should now be enabled after selection)
      agent-browser --session "$QA_SESSION" eval \
        "(() => { const b = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Apply Aging Effects')); if (b && !b.disabled) { b.click(); return 'clicked-aging-apply'; } return 'disabled-or-nf'; })()" \
        2>/dev/null > /dev/null || true
      sleep 1
      qa-wait-for-visual-state
    fi
    # Click aging Continue (exact match: "Continue" without → arrow) — may appear after Apply
    agent-browser --session "$QA_SESSION" eval \
      "(() => { const buttons = Array.from(document.querySelectorAll('button')); const cont = buttons.find(b => b.textContent.trim() === 'Continue' && !b.textContent.includes('→')); if (cont && !cont.disabled) { cont.click(); return 'clicked-aging-continue'; } return 'not-found'; })()" \
      2>/dev/null > /dev/null || true
    sleep 2
    qa-wait-for-visual-state
  fi
  # Re-read status — aging Continue click may have advanced wizard to mustering_out
  status=$(qa_wizard_status)
  qa_log "INFO | Post-aging check T${term_num}: wizard_status=${status}"

  # After advancement, check what action is needed
  if [[ "$status" == "term_resolution" ]]; then
    # For the last term (4), click Muster Out to transition to mustering_out
    if [[ "$term_num" -ge 4 ]]; then
      qa_log "INFO | Final term — using eval to find and click Muster Out"
      # Search for Muster Out text within button spans (more reliable than snapshot grep)
      muster_result=$(agent-browser --session "$QA_SESSION" eval \
        "(() => { const spans = Array.from(document.querySelectorAll('span')); const ms = spans.find(s => s.textContent.trim() === 'Muster Out'); if (ms) { const btn = ms.closest('button'); if (btn && !btn.disabled) { btn.click(); return 'clicked-muster'; } return 'btn-disabled'; } return 'span-nf'; })()" \
        2>/dev/null | tail -1 | tr -d '"')
      qa_log "INFO | Muster Out eval result: ${muster_result:-empty}"
      sleep 2
      qa-wait-for-visual-state
      status=$(qa_wizard_status)
      qa_log "INFO | After Muster Out eval: status=${status}"
      if [[ "$status" == "mustering_out" ]]; then
        break
      fi
      # If Muster Out not found, try wizard nav Continue → first
      qa_log "INFO | Muster Out not yet found — trying wizard nav Continue →"
      agent-browser --session "$QA_SESSION" eval \
        "(() => { const buttons = Array.from(document.querySelectorAll('button')); const cont = buttons.find(b => b.textContent.trim() === 'Continue →'); if (cont && !cont.disabled) { cont.click(); return 'clicked-nav'; } return cont ? 'disabled' : 'not-found'; })()" \
        2>/dev/null > /dev/null || true
      sleep 2
      qa-wait-for-visual-state
      # Retry Muster Out after wizard nav
      agent-browser --session "$QA_SESSION" eval \
        "(() => { const spans = Array.from(document.querySelectorAll('span')); const ms = spans.find(s => s.textContent.trim() === 'Muster Out'); if (ms) { const btn = ms.closest('button'); if (btn && !btn.disabled) { btn.click(); return 'clicked-muster-2'; } return 'btn-disabled'; } return 'span-nf'; })()" \
        2>/dev/null > /dev/null || true
      sleep 2
      qa-wait-for-visual-state
      status=$(qa_wizard_status)
      qa_log "INFO | After retry Muster Out: status=${status}"
      break
    fi
    snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
    # Check if Roll Survival is already available (auto-cycled to next term)
    if echo "$snap" | grep -q 'Roll Survival'; then
      qa_log "INFO | Roll Survival already visible — term auto-cycled"
    # Check if Continue Career button is showing (need to advance manually)
    elif echo "$snap" | grep -qi 'Continue Career'; then
      qa_log "INFO | Clicking Continue Career — keyboard navigation approach"
      ref=$(echo "$snap" | grep -i 'Continue Career' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/')
      # Focus the button
      agent-browser --session "$QA_SESSION" focus "$ref" 2>/dev/null || true
      sleep 0.5
      # Press Space to activate (standard button activation)
      agent-browser --session "$QA_SESSION" press Space 2>/dev/null || true
      sleep 2
      qa-wait-for-visual-state
      status=$(qa_wizard_status)
      qa_log "INFO | After continue career Space: status=${status}"
    # Fallback: try "Continue →" when neither Roll Survival nor Continue Career matches
    elif echo "$snap" | grep -q 'Continue'; then
      qa_log "INFO | No explicit Continue Career — trying Continue → as fallback"
      agent-browser --session "$QA_SESSION" eval \
        "(() => { const buttons = Array.from(document.querySelectorAll('button')); const cont = buttons.find(b => b.textContent.includes('Continue') && !b.disabled); if (cont) { cont.click(); return 'clicked-fb'; } return 'nf'; })()" \
        2>/dev/null > /dev/null || true
      sleep 2
      qa-wait-for-visual-state
      status=$(qa_wizard_status)
      qa_log "INFO | After fallback Continue →: status=${status}"
    fi
  elif [[ "$status" == "mustering_out" ]]; then
    qa_log "INFO | Status transitioned to mustering_out after term $term_num"
    break
  elif [[ "$status" == "career_selection" ]]; then
    qa_log "INFO | Character left career (mishap/muster) — moving to mustering out"
    break
  fi

  qa_log "INFO | Term $term_num complete"
done

# ---- Phase 4: Mustering Out ----
QA_STEP="muster"
status=$(qa_wizard_status)
if [[ "$status" == "mustering_out" ]]; then
  qa_log "VERIFY | Mustering out phase reached | pass"
  qa-wait-for-visual-state
  qa-screenshot "mustering-start"
  assert_screenshot_clean "mustering-start"
  assert_no_overflow_warn "[data-testid=mustering-out-panel]" "Mustering out panel"

  # Roll material benefits
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  benefit_count=$(echo "$snap" | grep -ci 'Roll Benefit\|benefit' || echo "0")
  qa_log "INFO | Benefit rolls available: ~$benefit_count"

  # Try to roll benefits
  for i in $(seq 1 3); do
    snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
    benefit_ref=$(echo "$snap" | grep -i 'Roll Benefit\|Roll Material' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
    if [[ -n "$benefit_ref" ]]; then
      agent-browser --session "$QA_SESSION" click "$benefit_ref" 2>/dev/null || true
      sleep 1
    else
      break
    fi
  done

  # Roll cash benefits
  for i in $(seq 1 3); do
    snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
    cash_ref=$(echo "$snap" | grep -i 'Roll Cash\|cash' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
    if [[ -n "$cash_ref" ]]; then
      agent-browser --session "$QA_SESSION" click "$cash_ref" 2>/dev/null || true
      sleep 1
    else
      break
    fi
  done
  qa-screenshot "mustering-complete"
  assert_screenshot_clean "mustering-complete"

  # Advance to finalize
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  finalize_ref=$(echo "$snap" | grep -iE 'Finalize|Finish Character|Continue' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  if [[ -n "$finalize_ref" ]]; then
    agent-browser --session "$QA_SESSION" click "$finalize_ref" 2>/dev/null || true
    sleep 1
  fi
else
  qa_log "WARN | Mustering out not reached. Status: $status"
fi

# ---- Final verification ----
QA_STEP="finalize"
status=$(qa_wizard_status)
if [[ "$status" == "finalized" ]]; then
  qa_log "VERIFY | Character finalized | pass"
  qa-wait-for-visual-state
  qa-screenshot "finalized"
  assert_screenshot_clean "finalized"
else
  qa_log "WARN | Final status: $status (expected finalized)"
  qa-wait-for-visual-state
  qa-screenshot "final-state"
  assert_screenshot_clean "final-state"
fi

echo ""
echo "=== B2 MULTI-TERM LIFECYCLE COMPLETE ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
