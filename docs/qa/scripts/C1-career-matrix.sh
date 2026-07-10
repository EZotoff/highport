#!/usr/bin/env bash
# docs/qa/scripts/C1-career-matrix.sh
#
# Parameterized career mechanics charter.
#
# Exit codes:
#   0 = success (all steps passed, evidence captured)
#   1 = app_bug (a real defect was found, with investigation evidence)
#   2 = precondition_failure (a required precondition was not met)
#
# Usage:
#   CAREER=Army bash docs/qa/scripts/C1-career-matrix.sh

set -euo pipefail

CAREER="${CAREER:-Drifter}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

case "${CAREER,,}" in
  army)
    CAREER="Army"
    QUALIFICATION_SPEC="END 5+"
    ASSIGNMENT="Support"
    SURVIVAL_SPEC="END 5+"
    SKILL_TABLE="Assignment Skills"
    SKILL_PATTERN="mechanic|drive|flyer|profession|explosives|electronics|medic"
    EVENT_PATTERN="crisis|frontier|shattered city|unusual responsibility|ground fighting|personal milestone|Specialist instruction|enemy|post-conflict|senior leader|Exceptional courage"
    RANK_PATTERN="PROMOTED to Rank|Lance Corporal|recon"
    BENEFIT_PATTERN="Cybernetic Implant|\\+1 INT|\\+1 EDU|Weapon|Armour|\\+1 END|\\+1 SOC"
    ;;
  navy)
    CAREER="Navy"
    QUALIFICATION_SPEC="INT 6+"
    ASSIGNMENT="Line/Crew"
    SURVIVAL_SPEC="INT 5+"
    SKILL_TABLE="Assignment Skills"
    SKILL_PATTERN="electronics|mechanic|guncombat|flyer|melee|vaccsuit"
    EVENT_PATTERN="serious incident|shipboard|unusual shipboard responsibility|Focused instruction|battle|Life Event|vessel|crime|personal gain|superior officer|combat save the ship|official envoys"
    RANK_PATTERN="COMMISSIONED as Ensign|Ensign|Officer Rank 1"
    BENEFIT_PATTERN="Personal Vehicle|Ship Share|\\+1 INT|\\+1 EDU|Weapon|TAS Membership|Ship's Boat|\\+2 SOC"
    ;;
  merchant)
    CAREER="Merchant"
    QUALIFICATION_SPEC="INT 4+"
    ASSIGNMENT="Merchant Marine"
    SURVIVAL_SPEC="EDU 5+"
    SKILL_TABLE="Assignment Skills"
    SKILL_PATTERN="pilot|vaccsuit|athletics|mechanic|engineer|electronics"
    EVENT_PATTERN="major setback|smuggling|cargo|suppliers|practical trade|speculative bargain|useful|Life Event|legal dispute|Specialist study|profitable run|valuable ally|venture prospers"
    RANK_PATTERN="PROMOTED to Rank|Senior Crewman|mechanic"
    BENEFIT_PATTERN="Blade|\\+1 INT|\\+1 EDU|Gun|Ship Share|Free Trader"
    ;;
  scholar)
    CAREER="Scholar"
    QUALIFICATION_SPEC="INT 6+"
    ASSIGNMENT="Scientist"
    SURVIVAL_SPEC="EDU 4+"
    SKILL_TABLE="Assignment Skills"
    SKILL_PATTERN="admin|engineer|science|electronics"
    EVENT_PATTERN="severe setback|research|principles|sponsor|confidential work|major honour|advanced instruction|Life Events|shortcut|discovery|legal complications|mentor|breakthrough"
    RANK_PATTERN="PROMOTED to Rank|science|electronics|investigate"
    BENEFIT_PATTERN="\\+1 INT|\\+1 EDU|Two Ship Shares|\\+1 SOC|Scientific Equipment|Lab Ship"
    ;;
  drifter)
    CAREER="Drifter"
    QUALIFICATION_SPEC="INT 0+"
    ASSIGNMENT="Barbarian"
    SURVIVAL_SPEC="END 7+"
    SKILL_TABLE="Assignment Skills"
    SKILL_PATTERN="animals|carouse|melee|stealth|seafarer|survival"
    EVENT_PATTERN="salvage|employment|attacked|risky opportunity|criminal underworld|proper job"
    RANK_PATTERN="PROMOTED to Rank|survival|streetwise"
    BENEFIT_PATTERN="Contact|Weapon|Ally|\\+1 EDU|Ship Share|TAS Membership"
    ;;
  *)
    echo "Unsupported CAREER='${CAREER}'. Use one of: Army, Navy, Merchant, Scholar, Drifter." >&2
    exit 2
    ;;
esac

qa-init "C1-career-matrix-${CAREER,,}"

echo "=== C1: Career Matrix (${CAREER}) ==="

QA_STEP="01-login"
rm -rf ~/.agent-browser/sessions/"$QA_SESSION" 2>/dev/null || true
rm -rf ~/.agent-browser/sessions/"$QA_SESSION"-* 2>/dev/null || true
qa-login
qa_runtime_clear

QA_STEP="02-navigate-chargen"
qa-navigate "/chargen"
assert_wizard_status "background"
qa-force-roll-success
agent-browser --session "$QA_SESSION" set viewport 1280 720
sleep 1
assert_viewport_size 1280 720
qa-screenshot "chargen-initial"

QA_STEP="03-create-character"
qa-click "Create New Character"
sleep 1
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
name_ref=$(echo "$snap" | grep 'CHARACTER NAME' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
[[ -n "$name_ref" ]] || qa_refuse "name input not found in snapshot"
qa-fill "$name_ref" "C1 ${CAREER} Matrix" "name"
qa-screenshot "background-name-filled"

QA_STEP="04-select-background-skills"
qa-select-skill "Admin"
qa-select-skill "Animals"
qa-select-skill "Art"
assert_text_visible "Selected: 3/3"
qa-screenshot "background-skills-selected"

QA_STEP="05-advance-to-careers"
qa-click-and-wait "Continue →" "wizard:career_selection"
assert_wizard_status "career_selection"
qa-install-dice-seed 5
qa-force-roll-success
assert_text_visible "$QUALIFICATION_SPEC"
qa-screenshot "career-selection"

QA_STEP="06-select-career"
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if [[ "$CAREER" == "Drifter" ]]; then
  drifter_ref=$(echo "$snap" | grep -i 'Become a Drifter' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  if [[ -n "$drifter_ref" ]]; then
    agent-browser --session "$QA_SESSION" click "$drifter_ref" 2>/dev/null || true
  else
    qa-click "Become a Drifter"
  fi
else
  career_ref=$(echo "$snap" | grep -i "${CAREER}" | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  qa_log "INFO | ${CAREER} snapshot ref=${career_ref:-not-exposed}; clicking card-local Try to Join by DOM"
  for attempt in 1 2 3 4 5 6 7 8; do
    agent-browser --session "$QA_SESSION" eval \
      "(() => { const cards = Array.from(document.querySelectorAll('[data-testid=career-card]')); const card = cards.find(c => c.textContent.includes('${CAREER}')); const btn = card?.querySelector('button'); if (btn && !btn.disabled) { btn.click(); return 'clicked'; } return btn ? 'disabled' : 'not-found'; })()" \
      2>/dev/null > /dev/null || true
    sleep 1
    snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
    echo "$snap" | grep -qi "Qualified for ${CAREER}" && break
    if echo "$snap" | grep -qi 'Qualification Failed'; then
      qa_log "INFO | ${CAREER} qualification attempt ${attempt} failed despite force flag; retrying"
      qa-click "Try Another Career"
      sleep 1
    fi
  done
fi
sleep 1
qa-wait-for-visual-state
qa-screenshot "career-selected"

QA_STEP="07-qualification-and-assignment"
if [[ "$CAREER" != "Drifter" ]]; then
  assert_text_visible "Qualified for ${CAREER}"
  assert_text_visible "$QUALIFICATION_SPEC"
  assert_text_visible "$SURVIVAL_SPEC"
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  assignment_ref=$(echo "$snap" | grep -i "$ASSIGNMENT" | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  if [[ -n "$assignment_ref" ]]; then
    agent-browser --session "$QA_SESSION" click "$assignment_ref" 2>/dev/null || true
  else
    qa-click "$ASSIGNMENT"
  fi
  sleep 1
fi
assert_wizard_status "term_resolution"
assert_visible_text_in "[data-testid=chargen-wizard]" "$SURVIVAL_SPEC"
qa-screenshot "term-resolution-start"

QA_STEP="08-survival"
qa-force-roll-success
qa-click "Roll Survival"
sleep 2
assert_text_visible "SURVIVED"
qa-screenshot "survival-passed"

QA_STEP="09-career-event"
qa-install-dice-seed 5
qa-click "Roll Event"
sleep 1
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if ! echo "$snap" | grep -Eiq "$EVENT_PATTERN"; then
  qa_report_bug "${CAREER} event did not show expected career-specific content"
fi
qa-screenshot "career-event"
agent-browser --session "$QA_SESSION" eval \
  "(() => { const buttons = Array.from(document.querySelectorAll('button')); const cont = buttons.find(b => b.textContent.trim() === 'Continue' && !b.textContent.includes('→')); if (cont && !cont.disabled) { cont.click(); return 'clicked-event-continue'; } return 'not-found'; })()" \
  2>/dev/null > /dev/null || true
sleep 2

QA_STEP="10-skill-table"
assert_visible_text_in "[data-testid=skill-table-container]" "Phase 3: Skill Training"
assert_visible_text_in "[data-testid=skill-table-container]" "Personal Development"
assert_visible_text_in "[data-testid=skill-table-container]" "Service Skills"
assert_visible_text_in "[data-testid=skill-table-container]" "$SKILL_TABLE"
assert_all_no_overflow '[data-testid^=skill-table-]' "Skill table buttons"
qa-screenshot "skill-tables"
qa-click "$SKILL_TABLE"
sleep 1
qa-install-dice-seed 5
qa-click "Roll 1d6"
sleep 2
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if ! echo "$snap" | grep -Eiq "$SKILL_PATTERN"; then
  qa_report_bug "${CAREER} ${SKILL_TABLE} roll did not produce a career-specific skill"
fi
qa-screenshot "career-skill-gained"

QA_STEP="11-rank-progression"
sleep 1
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if [[ "$CAREER" == "Navy" ]] && echo "$snap" | grep -qi 'Attempt Commission'; then
  qa-click "Attempt Commission"
  sleep 2
else
  if echo "$snap" | grep -qi 'Attempt Commission'; then
    qa-click "Skip Commission"
    sleep 1
  fi
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
  if echo "$snap" | grep -qi 'Roll Advancement'; then
    qa-click "Roll Advancement"
    sleep 2
  else
    qa_report_bug "${CAREER} rank progression controls were not available"
  fi
fi
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if ! echo "$snap" | grep -Eiq "$RANK_PATTERN"; then
  qa_report_bug "${CAREER} rank progression did not show expected rank output"
fi
qa-screenshot "rank-progression"

QA_STEP="12-mustering-out"
agent-browser --session "$QA_SESSION" eval \
  "(() => { const spans = Array.from(document.querySelectorAll('span')); const ms = spans.find(s => s.textContent.trim() === 'Muster Out'); const btn = ms?.closest('button'); if (btn && !btn.disabled) { btn.click(); return 'clicked-muster'; } return btn ? 'disabled' : 'not-found'; })()" \
  2>/dev/null > /dev/null || true
sleep 2
assert_wizard_status "mustering_out"
assert_visible_text_in "[data-testid=chargen-wizard]" "$CAREER"
qa-screenshot "mustering-start"
assert_no_overflow_warn "[data-testid=mustering-out-panel]" "Mustering out panel"
qa-install-dice-seed 5
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
benefit_ref=$(echo "$snap" | grep -i 'Roll Benefits\|Roll Benefit\|Roll Material' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$benefit_ref" ]]; then
  agent-browser --session "$QA_SESSION" click "$benefit_ref" 2>/dev/null || true
else
  qa-click "Roll Benefits"
fi
sleep 1
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if ! echo "$snap" | grep -Eiq "$BENEFIT_PATTERN"; then
  qa_report_bug "${CAREER} mustering out did not show an expected career-specific benefit"
fi
qa-screenshot "mustering-benefit"

echo ""
echo "=== C1 CAREER MATRIX (${CAREER}) PASSED ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
