#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "G1-rules-integrity"

echo "=== G1: Game-Rules Integrity Verification ==="

qa_eval_mechanics() {
  local body="$1" body_b64 result
  body_b64=$(printf '%s' "$body" | base64 | tr -d '\n')
  result=$(agent-browser --session "$QA_SESSION" eval "$(cat <<JS
(() => {
  const moduleCache = () => {
    let req = window.__webpack_require__;
    if (!req?.c && Array.isArray(window.webpackChunk_N_E)) {
      window.webpackChunk_N_E.push([[Math.floor(Math.random() * 1e9)], {}, (r) => { req = r; }]);
    }
    return req?.c || {};
  };
  const candidates = (exports) => [exports, exports?.default].filter(Boolean);
  const getExport = (name) => {
    for (const mod of Object.values(moduleCache())) {
      for (const candidate of candidates(mod?.exports)) {
        if (typeof candidate?.[name] !== 'undefined') return candidate[name];
      }
    }
    return undefined;
  };
  const yValue = (value) => {
    if (!value) return value;
    if (typeof value.toJSON === 'function') return value.toJSON();
    return value;
  };
  const getDoc = () => {
    const direct = window.__yjs_doc__ || window.__YDOC__ || window.__HIGHPORT_YDOC__;
    if (direct?.getMap) return direct;
    const getYDoc = window.getYDoc || getExport('getYDoc');
    if (typeof getYDoc === 'function') return getYDoc();
    throw new Error('Yjs document is not exposed through window or webpack exports');
  };
  const readCharacters = () => {
    const chars = getDoc().getMap('chargen')?.get('characters');
    if (!chars?.forEach) throw new Error('chargen.characters Yjs map not found');
    const out = [];
    chars.forEach((charMap) => out.push(yValue(charMap)));
    if (out.length === 0) throw new Error('no chargen characters in Yjs document');
    return out;
  };
  const readCharacter = () => readCharacters().sort((a, b) => {
    const aTerms = Array.isArray(a.terms) ? a.terms.length : 0;
    const bTerms = Array.isArray(b.terms) ? b.terms.length : 0;
    return bTerms - aTerms;
  })[0];
  const lastTerm = (character) => {
    if (!Array.isArray(character.terms) || character.terms.length === 0) throw new Error('character has no active term');
    return character.terms[character.terms.length - 1];
  };
  const helpers = { getExport, readCharacter, lastTerm };
  try {
    return Function('helpers', atob('${body_b64}'))(helpers);
  } catch (error) {
    return 'ERROR|' + (error?.message || String(error));
  }
})()
JS
)" 2>/dev/null | tail -1 | tr -d '"')
  printf '%s\n' "$result"
}

qa_verify_mechanics() {
  local label="$1" body="$2" result
  result=$(qa_eval_mechanics "$body")
  case "$result" in
    PASS\|*) qa_log "VERIFY | ${label} | ${result#PASS|} | pass" ;;
    WARN\|*) qa_warn "${label}: ${result#WARN|}" ;;
    FAIL\|*) qa_report_bug "${label}: ${result#FAIL|}" ;;
    ERROR\|*) qa_refuse "${label}: ${result#ERROR|}" ;;
    *) qa_refuse "${label}: unexpected mechanics eval result '${result}'" ;;
  esac
}

click_exact_button() {
  local label="$1"
  agent-browser --session "$QA_SESSION" eval \
    "(() => { const b = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '${label}' && !b.disabled); if (b) { b.click(); return 'clicked'; } return 'not-found'; })()" \
    2>/dev/null > /dev/null || true
  sleep 1
}

capture_skills_before_roll() {
  qa_verify_mechanics "Skill pre-state captured" \
    "const character = helpers.readCharacter(); window.__qaG1BeforeSkills = { ...(character.skills || {}) }; return 'PASS|' + Object.keys(window.__qaG1BeforeSkills).length + ' skills before roll';"
}

verify_characteristic_dms() {
  qa_verify_mechanics "Characteristic DM table" \
    "const fn = helpers.getExport('getCharacteristicModifier') || window.getCharacteristicModifier; if (typeof fn !== 'function') return 'ERROR|getCharacteristicModifier export not found'; const expected = {0:-3,1:-3,2:-2,3:-2,4:-1,5:-1,6:0,7:0,8:1,9:1,10:2,11:2,12:2,13:3,14:3,15:3}; const failures = Object.entries(expected).filter(([stat, dm]) => fn(Number(stat)) !== dm).map(([stat, dm]) => stat + ' expected ' + dm + ' got ' + fn(Number(stat))); if (failures.length) return 'FAIL|' + failures.join('; '); return 'PASS|all representative MGT2E DMs matched';"
}

verify_survival_roll() {
  qa_verify_mechanics "Survival roll margin" \
    "const character = helpers.readCharacter(); const term = helpers.lastTerm(character); const getCareer = helpers.getExport('getCareer'); if (typeof getCareer !== 'function') return 'ERROR|getCareer export not found'; const career = getCareer(term.careerId); const assignment = career?.assignments?.find((item) => item.id === term.assignmentId); const roll = term.survivalRoll; if (!assignment?.survival?.target) return 'FAIL|survival target missing for ' + term.careerId + '/' + term.assignmentId; if (!roll) return 'FAIL|survivalRoll missing from Yjs term'; const target = assignment.survival.target; const margin = roll.total - target; const text = document.body.innerText; if (!text.includes(String(roll.total))) return 'FAIL|UI does not show survival total ' + roll.total; if (roll.total < target || term.survived !== true) return 'FAIL|total=' + roll.total + ' target=' + target + ' margin=' + margin + ' survived=' + term.survived; return 'PASS|' + career.name + '/' + assignment.name + ' total=' + roll.total + ' target=' + target + ' margin=' + margin;"
}

verify_skill_gain() {
  qa_verify_mechanics "Skill gain correctness" \
    "const before = window.__qaG1BeforeSkills || {}; const character = helpers.readCharacter(); const after = character.skills || {}; const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])); const changed = keys.filter((key) => (before[key] || 0) !== (after[key] || 0)); if (changed.length !== 1) return 'FAIL|expected exactly one skill to change, changed=' + JSON.stringify(changed) + ' before=' + JSON.stringify(before) + ' after=' + JSON.stringify(after); const key = changed[0]; const oldValue = before[key] || 0; const newValue = after[key] || 0; if (newValue !== oldValue + 1) return 'FAIL|' + key + ' changed from ' + oldValue + ' to ' + newValue + ', expected +1'; return 'PASS|' + key + ' changed ' + oldValue + '->' + newValue;"
}

capture_rank_before_roll() {
  qa_verify_mechanics "Rank pre-state captured" \
    "const character = helpers.readCharacter(); const term = helpers.lastTerm(character); window.__qaG1BeforeRank = term.currentRank || 0; return 'PASS|rank before advancement=' + window.__qaG1BeforeRank;"
}

verify_advancement() {
  qa_verify_mechanics "Advancement rank increase" \
    "const before = Number(window.__qaG1BeforeRank ?? 0); const character = helpers.readCharacter(); const term = helpers.lastTerm(character); const roll = term.advancementRoll; if (!roll) return 'FAIL|advancementRoll missing from Yjs term'; if (term.advanced !== true) return 'FAIL|forced-success advancement did not set advanced=true'; if ((term.currentRank || 0) !== before + 1) return 'FAIL|rank before=' + before + ' after=' + term.currentRank + ' expected=' + (before + 1); return 'PASS|rank ' + before + '->' + term.currentRank + ', total=' + roll.total + ', target=' + roll.target;"
}

try_optional_aging_probe() {
  QA_STEP="optional-aging"
  local status
  status=$(qa_wizard_status)
  if [[ "$status" != "term_resolution" ]]; then
    qa_log "WARN | Optional aging skipped: status=${status}"
    return 0
  fi

  for term_num in 2 3 4; do
    local snap
    snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
    if echo "$snap" | grep -qi 'aging'; then
      qa_verify_mechanics "Aging roll fired" \
        "const character = helpers.readCharacter(); const term = helpers.lastTerm(character); if (!term.agingRoll) return 'FAIL|aging UI appeared but agingRoll missing'; return 'PASS|age=' + character.age + ' agingTotal=' + term.agingRoll.total + ' effect=' + term.agingEffect;"
      return 0
    fi
    if echo "$snap" | grep -qi 'Continue Career'; then
      qa-click "Continue Career"
      sleep 1
    fi
    qa-click "Roll Survival"
    sleep 1
    qa-click "Roll Event"
    sleep 1
    click_exact_button "Continue"
    snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
    if echo "$snap" | grep -qi 'Service Skills'; then
      qa-click "Service Skills"
      sleep 1
      qa-click "Roll 1d6"
      sleep 1
    fi
    snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
    if echo "$snap" | grep -qi 'Roll Advancement'; then
      qa-click "Roll Advancement"
      sleep 2
    fi
    snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
    if echo "$snap" | grep -qi 'aging'; then
      qa_verify_mechanics "Aging roll fired" \
        "const character = helpers.readCharacter(); const term = helpers.lastTerm(character); if (!term.agingRoll) return 'FAIL|aging UI appeared but agingRoll missing'; return 'PASS|age=' + character.age + ' agingTotal=' + term.agingRoll.total + ' effect=' + term.agingEffect;"
      return 0
    fi
    qa_log "INFO | Optional aging probe advanced through term ${term_num}"
  done
  qa_log "WARN | Optional aging probe did not reach aging UI within extra terms"
}

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
assert_viewport_size 1280 720
qa-screenshot "chargen-initial"

QA_STEP="03-create-character"
qa-click "Create New Character"
sleep 1
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
name_ref=$(echo "$snap" | grep 'CHARACTER NAME' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
[[ -n "$name_ref" ]] || qa_refuse "name input not found in snapshot"
qa-fill "$name_ref" "G1 Rules Integrity" "name"
qa-select-skill "Admin"
qa-select-skill "Animals"
qa-select-skill "Art"
assert_text_visible "Selected: 3/3"
qa-click-and-wait "Continue →" "wizard:career_selection"

QA_STEP="04-select-drifter"
qa-click "Drifter"
sleep 2
assert_wizard_status "term_resolution"
qa-screenshot "term-resolution-start"

QA_STEP="05-characteristic-dms"
verify_characteristic_dms

QA_STEP="06-survival"
qa-click "Roll Survival"
sleep 2
qa-screenshot "survival-result"
verify_survival_roll

QA_STEP="07-event"
qa-click "Roll Event"
sleep 1
click_exact_button "Continue"
sleep 1
qa-screenshot "skill-phase"

QA_STEP="08-skill-gain"
capture_skills_before_roll
qa-click "Service Skills"
sleep 1
qa-click "Roll 1d6"
sleep 2
qa-screenshot "skill-gained"
verify_skill_gain

QA_STEP="09-advancement"
capture_rank_before_roll
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
if echo "$snap" | grep -qi 'Attempt Commission'; then
  qa_log "INFO | Skipping commission; advancement is the target mechanic"
  qa-click "Skip Commission"
  sleep 1
fi
qa-click "Roll Advancement"
sleep 2
qa-screenshot "advancement-result"
verify_advancement

try_optional_aging_probe

echo ""
echo "=== G1 RULES INTEGRITY TEST PASSED ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
