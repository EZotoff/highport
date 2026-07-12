#!/usr/bin/env bash
# docs/qa/scripts/lib/qa-assertions.sh
#
# Assertion library for QA charter scripts. Every charter MUST source this
# library and use qa-* functions instead of raw agent-browser commands.
#
# Design principles:
#   1. Structural prevention over diligence: precondition gates that refuse
#      actions before they can produce false positives.
#   2. Click fallback: SciFiButton components don't always fire onClick under
#      Playwright's mouse-event sequence. qa-click tries native first, then
#      eval .click() fallback, then verifies state change.
#   3. Evidence auto-capture: every refusal and bug report captures snapshot +
#      screenshot automatically. The agent cannot forget.
#   4. Exit code protocol: 0=success, 1=app_bug, 2=precondition_failure.
#      The orchestrator reads exit codes, not prose, to classify outcomes.
#   5. Structured logging: every action and assertion writes to actions.log
#      with a machine-parseable format.
#
# Usage (in a charter script):
#   #!/usr/bin/env bash
#   set -euo pipefail
#   source "$(dirname "$0")/lib/qa-assertions.sh"
#
#   qa-init S0-smoke
#   qa-login
#   QA_STEP="nav-to-chargen"
#   agent-browser --session "$QA_SESSION" open http://localhost:18120/chargen
#   assert_wizard_status "background"
#
#   QA_STEP="create-character"
#   qa-click "Create New Character"
#   qa-fill @e31 "Test Character" "name"
#   qa-select-skill "Admin"
#   qa-select-skill "Animals"
#   qa-select-skill "Art"
#   assert_text_visible "Selected: 3/3"
#   qa-click "Continue →"
#   assert_wizard_status "career_selection"
#
#   qa-finish success

# ===== Configuration =====
QA_SESSION="${QA_SESSION:-qa}"
QA_EVIDENCE_DIR="${QA_EVIDENCE_DIR:-.sisyphus/evidence/qa}"
QA_STEP="${QA_STEP:-unknown}"
QA_BASE_URL="${QA_BASE_URL:-http://localhost:18120}"

# Internal: short sleep for state propagation
QA_SETTLE_MS="${QA_SETTLE_MS:-500}"

qa_settle() {
  local ms="${1:-$QA_SETTLE_MS}"
  sleep "$(( ms / 1000 )).$(( (ms % 1000) / 10 ))"
}

# Auto-kill idle agent-browser daemons after 120 seconds of inactivity.
# SAFETY NET for leaked sessions: if a charter script is killed (SIGKILL, OOM, etc)
# before the EXIT trap can fire, the daemon would persist forever without this.
# This MUST be exported before any agent-browser command runs.
export AGENT_BROWSER_IDLE_TIMEOUT_MS="${AGENT_BROWSER_IDLE_TIMEOUT_MS:-120000}"

if [[ -f "${BASH_SOURCE[0]%/*}/qa-runtime.sh" ]]; then
  source "${BASH_SOURCE[0]%/*}/qa-runtime.sh"
else
  echo "QA-WARN: qa-runtime.sh not found at ${BASH_SOURCE[0]%/*}/qa-runtime.sh; runtime capture disabled" >&2
fi

# ===== Logging =====
qa_log() {
  mkdir -p "$QA_EVIDENCE_DIR"
  echo "$(date -Iseconds) | step=$QA_STEP | $*" >> "$QA_EVIDENCE_DIR/actions.log"
}

# ===== Evidence capture =====
qa_capture_evidence() {
  local tag="$1"
  mkdir -p "$QA_EVIDENCE_DIR"
  agent-browser --session "$QA_SESSION" snapshot -i > "$QA_EVIDENCE_DIR/${tag}-${QA_STEP}.snap" 2>&1 || true
  qa_settle
  agent-browser --session "$QA_SESSION" screenshot "$(pwd)/$QA_EVIDENCE_DIR/${tag}-${QA_STEP}.png" --full 2>&1 > /dev/null || true
  if type qa_capture_runtime &>/dev/null; then
    qa_capture_runtime
  fi
}

# ===== Exit handlers =====
# Exit 2: precondition not met (test problem, not app bug)
qa_refuse() {
  local reason="$1"
  qa_capture_evidence "refuse"
  qa_log "PRECONDITION_FAILED | reason=$reason"
  echo "QA-GATE [exit 2]: $reason" >&2
  echo "  Evidence: $QA_EVIDENCE_DIR/refuse-$QA_STEP.{snap,png}" >&2
  exit 2
}

# Exit 1: app bug confirmed (with investigation evidence)
qa_report_bug() {
  local description="$1"
  qa_capture_evidence "bug"
  qa_log "APP_BUG | description=$description"
  echo "QA-BUG [exit 1]: $description" >&2
  echo "  Evidence: $QA_EVIDENCE_DIR/bug-$QA_STEP.{snap,png}" >&2
  exit 1
}

# Exit 0: advisory warning (logs + evidence, does NOT stop execution)
qa_warn() {
  local description="$1"
  qa_log "WARN | description=${description}"
  echo "QA-WARN: ${description}" >&2
  # Capture evidence (screenshot + snapshot) but continue
  local snap
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>/dev/null || true)
  {
    echo "=== QA WARN ==="
    echo "Description: ${description}"
    echo "Step: ${QA_STEP}"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "--- Snapshot ---"
    echo "$snap"
  } >> "${QA_EVIDENCE_DIR}/actions.log"
  qa_settle
  agent-browser --session "$QA_SESSION" screenshot "$(pwd)/$QA_EVIDENCE_DIR/warn-${QA_STEP}.png" --full 2>&1 > /dev/null || true
}

# ===== Element state queries =====
qa_get_attr() {
  local ref="$1" attr="$2"
  agent-browser --session "$QA_SESSION" get attr "$ref" "$attr" 2>/dev/null | tail -1
}

qa_is_disabled() {
  local ref="$1"
  [[ "$(qa_get_attr "$ref" disabled)" == "true" ]]
}

qa_get_url() {
  agent-browser --session "$QA_SESSION" get url 2>/dev/null | tail -1
}

qa_wizard_status() {
  agent-browser --session "$QA_SESSION" eval \
    "document.querySelector('[data-testid=chargen-wizard]')?.getAttribute('data-chargen-status') || ''" \
    2>/dev/null | tail -1 | tr -d '"'
}

# Find a button ref by visible text (returns @eNN or empty)
qa_find_button_ref() {
  local label="$1"
  agent-browser --session "$QA_SESSION" snapshot -i 2>&1 \
    | grep -i "button.*${label}" \
    | grep -o 'ref=e[0-9]*' \
    | head -1 \
    | sed 's/ref=/@/'
}

# ===== Assertions (precondition gates) =====
assert_enabled() {
  local ref="$1" label="${2:-element}"
  qa_is_disabled "$ref" && qa_refuse "$label ($ref) is disabled — preconditions not met"
  qa_log "ASSERT_ENABLED | $label ($ref) | pass"
}

assert_disabled() {
  local ref="$1" label="${2:-element}"
  ! qa_is_disabled "$ref" && qa_refuse "$label ($ref) is unexpectedly enabled"
  qa_log "ASSERT_DISABLED | $label ($ref) | pass"
}

# Internal: check visibility. Calls fail_fn if not visible.
# Returns 0 on pass, 1 on failure (but fail_fn may exit).
_check_visible() {
  local ref="$1" label="$2" fail_fn="$3"
  if ! agent-browser --session "$QA_SESSION" is visible "$ref" >/dev/null 2>&1; then
    "$fail_fn" "$label ($ref) is not visible"
    return 1
  fi
  return 0
}

assert_visible() {
  local ref="$1" label="${2:-element}"
  _check_visible "$ref" "${label}" qa_refuse
  qa_log "ASSERT_VISIBLE | ${label} (${ref}) | pass"
}

assert_visible_warn() {
  local ref="$1" label="${2:-element}"
  if _check_visible "$ref" "${label}" qa_warn; then
    qa_log "ASSERT_VISIBLE_WARN | ${label} (${ref}) | pass"
  fi
}

assert_url_contains() {
  local pattern="$1"
  local url; url=$(qa_get_url)
  [[ "$url" == *"$pattern"* ]] || qa_refuse "URL mismatch: expected *${pattern}*, got $url"
  qa_log "ASSERT_URL | contains '$pattern' | url=$url | pass"
}

assert_wizard_status() {
  local expected="$1"
  local actual; actual=$(qa_wizard_status)
  [[ "$actual" == "$expected" ]] \
    || qa_refuse "wizard status: expected='${expected}' actual='${actual}'"
  qa_log "ASSERT_WIZARD_STATUS | expected='$expected' | pass"
}

# Internal: check element count. Calls fail_fn if count < expected.
# Returns 0 on pass, 1 on failure (but fail_fn may exit).
_check_count_ge() {
  local selector="$1" expected="$2" label="$3" fail_fn="$4"
  local actual; actual=$(agent-browser --session "$QA_SESSION" eval \
    "document.querySelectorAll('${selector}').length" 2>/dev/null | tail -1)
  if ! [[ "$actual" -ge "$expected" ]] 2>/dev/null; then
    "$fail_fn" "${label} count ${actual:-0} not >= ${expected} (selector: ${selector})"
    return 1
  fi
  return 0
}

assert_count_ge() {
  local selector="$1" expected="$2" label="${3:-elements}"
  _check_count_ge "$selector" "$expected" "${label}" qa_refuse
  qa_log "ASSERT_COUNT_GE | selector='${selector}' expected=${expected} | pass"
}

assert_count_ge_warn() {
  local selector="$1" expected="$2" label="${3:-elements}"
  if _check_count_ge "$selector" "$expected" "${label}" qa_warn; then
    qa_log "ASSERT_COUNT_GE_WARN | selector='${selector}' expected=${expected} | pass"
  fi
}

assert_text_visible() {
  local text="$1"
  local found; found=$(agent-browser --session "$QA_SESSION" eval \
    "document.body.innerText.includes(\"${text}\")" 2>/dev/null | tail -1)
  [[ "$found" == "true" ]] || qa_refuse "text '${text}' not found on page"
  qa_log "ASSERT_TEXT_VISIBLE | '$text' | pass"
}

# Internal: check overflow. Calls not_found_fn if element missing,
# overflow_fn if overflow detected. Returns 0 on pass, 1 on failure.
_check_no_overflow() {
  local selector="$1" label="$2" not_found_fn="$3" overflow_fn="$4"
  local result; result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { const el = document.querySelector('${selector}'); if (!el) return 'not-found'; if (el.scrollWidth > el.clientWidth) return 'horizontal'; if (el.scrollHeight > el.clientHeight) return 'vertical'; return 'ok'; })()" \
    2>/dev/null | tail -1 | tr -d '"')
  if [[ "$result" == "not-found" ]]; then
    "$not_found_fn" "element '${label}' (selector: $selector) not found"
    return 1
  fi
  if [[ "$result" != "ok" ]]; then
    local dims; dims=$(agent-browser --session "$QA_SESSION" eval \
      "(() => { const el = document.querySelector('${selector}'); return JSON.stringify({ scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight }); })()" \
      2>/dev/null | tail -1 | tr -d '"')
    "$overflow_fn" "overflow detected (${result}) on '${label}' — selector: $selector dims: $dims"
    return 1
  fi
  return 0
}

assert_no_overflow() {
  local selector="$1" label="${2:-$selector}"
  _check_no_overflow "$selector" "${label}" qa_refuse qa_report_bug
  qa_log "ASSERT_NO_OVERFLOW | selector='${selector}' label='${label}' | pass"
}

assert_no_overflow_warn() {
  local selector="$1" label="${2:-$selector}"
  if _check_no_overflow "$selector" "${label}" qa_warn qa_warn; then
    qa_log "ASSERT_NO_OVERFLOW_WARN | selector='${selector}' label='${label}' | pass"
  fi
}

# Internal: check ALL elements matching selector for overflow.
# Calls not_found_fn if no element matches, overflow_fn if any overflow.
# Returns 0 on pass, 1 on failure.
_check_all_no_overflow() {
  local selector="$1" label="$2" not_found_fn="$3" overflow_fn="$4"
  local result; result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { const els = document.querySelectorAll('${selector}'); if (els.length === 0) return 'not-found'; var failures = []; for (var i = 0; i < els.length; i++) { var el = els[i]; if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) { var dir = el.scrollWidth > el.clientWidth ? 'horizontal' : 'vertical'; var txt = el.textContent.trim().slice(0, 50); failures.push('  #' + (i+1) + ' ' + dir + ' overflow: scrollW=' + el.scrollWidth + ' clientW=' + el.clientWidth + ' scrollH=' + el.scrollHeight + ' clientH=' + el.clientHeight + ' text=\"' + txt + '\"'); } } if (failures.length === 0) return 'ok'; return failures.length + ' of ' + els.length + ' elements overflow___NL___' + failures.join('___NL___'); })()" \
    2>/dev/null | tail -1 | tr -d '"')
  if [[ "$result" == "not-found" ]]; then
    "$not_found_fn" "no elements matching '${label}' (selector: $selector)"
    return 1
  fi
  if [[ "$result" != "ok" ]]; then
    local msg="overflow on '${label}': ${result//___NL___/$'\n'}"$'\n'"  selector: $selector"
    "$overflow_fn" "$msg"
    return 1
  fi
  return 0
}

assert_all_no_overflow() {
  local selector="$1" label="${2:-$selector}"
  _check_all_no_overflow "$selector" "${label}" qa_refuse qa_report_bug
  qa_log "ASSERT_ALL_NO_OVERFLOW | selector='${selector}' label='${label}' | pass"
}

assert_all_no_overflow_warn() {
  local selector="$1" label="${2:-$selector}"
  if _check_all_no_overflow "$selector" "${label}" qa_warn qa_warn; then
    qa_log "ASSERT_ALL_NO_OVERFLOW_WARN | selector='${selector}' label='${label}' | pass"
  fi
}

# Internal: check if all text nodes within container fit within content area.
# Uses TreeWalker + Range.getBoundingClientRect() to catch overflow
# that scroll metrics miss (e.g., CSS overflow:hidden).
# Calls not_found_fn if container missing, overflow_fn if text overflows.
# Returns 0 on pass, 1 on failure.
_check_descendant_text_fits() {
  local container_selector="$1" label="$2" not_found_fn="$3" overflow_fn="$4"
  local result; result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { const container = document.querySelector('${container_selector}'); if (!container) return 'not-found'; const cr = container.getBoundingClientRect(); const s = getComputedStyle(container); const pL = parseFloat(s.paddingLeft) || 0; const pR = parseFloat(s.paddingRight) || 0; const pT = parseFloat(s.paddingTop) || 0; const pB = parseFloat(s.paddingBottom) || 0; const cL = cr.left + pL; const cR = cr.right - pR; const cT = cr.top + pT; const cB = cr.bottom - pB; const skipTags = ['SCRIPT', 'STYLE']; const filter = function(n) { const p = n.parentElement; if (p && skipTags.includes(p.tagName)) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; }; const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, { acceptNode: filter }); const failures = []; var tn, txt, range, rect, overflow, snippet; while (tn = walker.nextNode()) { txt = tn.textContent.trim(); if (!txt) continue; try { range = document.createRange(); range.selectNodeContents(tn); rect = range.getBoundingClientRect(); } catch(e) { continue; } if (rect.width === 0 && rect.height === 0) continue; overflow = []; if (rect.left < cL - 2) overflow.push('left'); if (rect.right > cR + 2) overflow.push('right'); if (rect.top < cT - 2) overflow.push('top'); if (rect.bottom > cB + 2) overflow.push('bottom'); if (overflow.length > 0) { snippet = txt.slice(0, 40); failures.push('  text [' + snippet + '] overflows: ' + overflow.join(', ') + ' (rect: l=' + Math.round(rect.left) + ' r=' + Math.round(rect.right) + ' t=' + Math.round(rect.top) + ' b=' + Math.round(rect.bottom) + ' content: l=' + Math.round(cL) + ' r=' + Math.round(cR) + ' t=' + Math.round(cT) + ' b=' + Math.round(cB) + ')'); } } if (failures.length === 0) return 'ok'; return failures.length + ' text node(s) overflow___NL___' + failures.join('___NL___'); })()" \
    2>/dev/null | tail -1 | tr -d '"')
  if [[ "$result" == "not-found" ]]; then
    "$not_found_fn" "container '${label}' not found (selector: $container_selector)"
    return 1
  fi
  if [[ "$result" != "ok" ]]; then
    local msg="text overflow in '${label}': ${result//___NL___/$'\n'}"$'\n'"  selector: $container_selector"
    "$overflow_fn" "$msg"
    return 1
  fi
  return 0
}

assert_descendant_text_fits() {
  local container_selector="$1" label="${2:-$container_selector}"
  _check_descendant_text_fits "$container_selector" "${label}" qa_refuse qa_report_bug
  qa_log "ASSERT_DESCENDANT_TEXT_FITS | selector='${container_selector}' label='${label}' | pass"
}

assert_descendant_text_fits_warn() {
  local container_selector="$1" label="${2:-$container_selector}"
  if _check_descendant_text_fits "$container_selector" "${label}" qa_warn qa_warn; then
    qa_log "ASSERT_DESCENDANT_TEXT_FITS_WARN | selector='${container_selector}' label='${label}' | pass"
  fi
}

# Check if an element is within the visible viewport.
# Uses getBoundingClientRect() and checkVisibility().
# Exit 2 (qa_refuse) if element missing or not visible — charters should qa-scroll-to first.
assert_in_viewport() {
  local selector="$1" label="${2:-$selector}"
  local result; result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { const el = document.querySelector('${selector}'); if (!el) return 'not-found'; if (!el.checkVisibility()) return 'outside:visibility'; const r = el.getBoundingClientRect(); if (r.bottom <= 0) return 'outside:top'; if (r.top >= window.innerHeight) return 'outside:bottom'; if (r.right <= 0) return 'outside:left'; if (r.left >= window.innerWidth) return 'outside:right'; return 'ok'; })()" \
    2>/dev/null | tail -1 | tr -d '"')
  if [[ "$result" == "not-found" ]]; then
    qa_refuse "element '${label}' not found (selector: $selector)"
  fi
  if [[ "$result" != "ok" ]]; then
    qa_refuse "element '${label}' not in viewport: ${result#outside:} (selector: $selector)"
  fi
  qa_log "ASSERT_IN_VIEWPORT | selector='${selector}' label='${label}' | pass"
}

# Internal: check if element is occluded at its center point.
# Uses document.elementFromPoint() at bounding-rect center.
# Calls not_found_fn if element missing, occluded_fn if covered by another element.
# Returns 0 on pass, 1 on failure.
_check_not_occluded() {
  local selector="$1" label="$2" not_found_fn="$3" occluded_fn="$4"
  local result; result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { const el = document.querySelector('${selector}'); if (!el) return 'not-found'; const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2; if (cx < 0 || cx > window.innerWidth || cy < 0 || cy > window.innerHeight) return 'off-screen'; const topEl = document.elementFromPoint(cx, cy); if (!topEl) return 'no-element-at-point'; var cur = topEl; while (cur) { if (cur === el) return 'ok'; cur = cur.parentElement; } return 'occluded|' + topEl.tagName.toLowerCase() + '|' + (topEl.className || '').slice(0, 50) + '|' + topEl.textContent.trim().slice(0, 40); })()" \
    2>/dev/null | tail -1 | tr -d '"')
  if [[ "$result" == "not-found" ]]; then
    "$not_found_fn" "element '${label}' not found (selector: $selector)"
    return 1
  fi
  if [[ "$result" == "off-screen" ]]; then
    "$occluded_fn" "element '${label}' center is off-screen — scroll element into view first (selector: $selector)"
    return 1
  fi
  if [[ "$result" != "ok" ]]; then
    local info="${result#occluded|}"
    local tag="${info%%|*}"; info="${info#*|}"
    local cls="${info%%|*}"; local txt="${info#*|}"
    "$occluded_fn" "element '${label}' is occluded by <${tag} class=\"${cls}\"> text=\"${txt}\" (selector: $selector)"
    return 1
  fi
  return 0
}

assert_not_occluded() {
  local selector="$1" label="${2:-$selector}"
  _check_not_occluded "$selector" "${label}" qa_refuse qa_report_bug
  qa_log "ASSERT_NOT_OCCLUDED | selector='${selector}' label='${label}' | pass"
}

assert_not_occluded_warn() {
  local selector="$1" label="${2:-$selector}"
  if _check_not_occluded "$selector" "${label}" qa_warn qa_warn; then
    qa_log "ASSERT_NOT_OCCLUDED_WARN | selector='${selector}' label='${label}' | pass"
  fi
}

# Check that the page has NO horizontal scrollbar.
# Checks documentElement.scrollWidth <= clientWidth. Exit 1 if horizontal scroll exists.
assert_page_no_horizontal_scroll() {
  local result; result=$(agent-browser --session "$QA_SESSION" eval \
    "document.documentElement.scrollWidth > document.documentElement.clientWidth" \
    2>/dev/null | tail -1 | tr -d '"')
  if [[ "$result" == "true" ]]; then
    qa_report_bug "page has horizontal scrollbar (scrollWidth > clientWidth)"
  fi
  qa_log "ASSERT_PAGE_NO_HORIZONTAL_SCROLL | pass"
}



# Internal: check width utilization. Calls not_found_fn if element missing,
# low_fn if utilization < min_percent. Returns 0 on pass, 1 on failure.
_check_utilizes_width() {
  local selector="$1" min_percent="$2" label="$3" not_found_fn="$4" low_fn="$5"
  local pct; pct=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { const el = document.querySelector('${selector}'); if (!el) return 'not-found'; return Math.round(el.getBoundingClientRect().width / window.innerWidth * 100); })()" \
    2>/dev/null | tail -1 | tr -d '"')
  if [[ "$pct" == "not-found" ]]; then
    "$not_found_fn" "element '${label}' (selector: $selector) not found"
    return 1
  fi
  if [[ "$pct" -lt "$min_percent" ]]; then
    "$low_fn" "width utilization too low: '${label}' used ${pct}% but minimum is ${min_percent}% (selector: $selector)"
    return 1
  fi
  return 0
}

assert_utilizes_width() {
  local selector="$1" min_percent="$2" label="${3:-$selector}"
  _check_utilizes_width "$selector" "$min_percent" "${label}" qa_refuse qa_report_bug
  qa_log "ASSERT_UTILIZES_WIDTH | selector='${selector}' label='${label}' min=${min_percent}% | pass"
}

assert_utilizes_width_warn() {
  local selector="$1" min_percent="$2" label="${3:-$selector}"
  if _check_utilizes_width "$selector" "$min_percent" "${label}" qa_warn qa_warn; then
    qa_log "ASSERT_UTILIZES_WIDTH_WARN | selector='${selector}' label='${label}' min=${min_percent}% | pass"
  fi
}

assert_screenshot_clean() {
  local label="${1:-$QA_STEP}"
  local path; path="$(pwd)/$QA_EVIDENCE_DIR/review-${label}.png"
  qa_settle
  agent-browser --session "$QA_SESSION" screenshot "$path" --full 2>&1 > /dev/null || true
  local prompt_text="You are a QA engineer reviewing a web app screenshot. List every visual problem you can see: text overflow, cramped layout, empty/wasted space, misaligned elements, text that doesn't fit in its container, overlapping elements, clipped content. Be specific about location and severity (critical/major/minor)."
  qa_log "REVIEW_NEEDED | screenshot=${path} | prompt=${prompt_text}"
}

qa-wait-for-visual-state() {
  local result
  result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => new Promise((resolve) => {
      let settled = false;
      let quietTimer;
      let timeoutTimer;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearTimeout(quietTimer);
        clearTimeout(timeoutTimer);
        resolve(value);
      };
      const afterQuiet = () => requestAnimationFrame(() => requestAnimationFrame(() => finish('stable')));
      const resetQuietTimer = () => {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(afterQuiet, 500);
      };
      const observer = new MutationObserver(resetQuietTimer);
      observer.observe(document.documentElement, { attributes: true, childList: true, characterData: true, subtree: true });
      timeoutTimer = setTimeout(() => finish('timeout'), 5000);
      resetQuietTimer();
    }))()" \
    2>/dev/null | tail -1 | tr -d '"')
  [[ "$result" == "stable" ]] || qa_refuse "visual state did not stabilize within 5s"
  qa_log "WAIT_FOR_VISUAL_STATE | result=${result} | pass"
}

qa-wait-for() {
  local selector="$1"
  local selector_b64 result
  selector_b64=$(printf '%s' "$selector" | base64 | tr -d '\n')
  result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => new Promise((resolve) => {
      const selector = atob('${selector_b64}');
      const isVisible = () => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const hasRect = rect.width > 0 && rect.height > 0;
        const visible = typeof el.checkVisibility === 'function' ? el.checkVisibility() : true;
        return hasRect && visible;
      };
      const startedAt = Date.now();
      const poll = () => {
        if (isVisible()) return resolve('visible');
        if (Date.now() - startedAt >= 5000) return resolve('timeout');
        setTimeout(poll, 100);
      };
      poll();
    }))()" \
    2>/dev/null | tail -1 | tr -d '"')
  [[ "$result" == "visible" ]] || qa_refuse "element '${selector}' did not become visible within 5s"
  qa_log "WAIT_FOR | selector='${selector}' | pass"
}

qa-scroll-to() {
  local selector="$1"
  local selector_b64 result
  selector_b64=$(printf '%s' "$selector" | base64 | tr -d '\n')
  result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => {
      const el = document.querySelector(atob('${selector_b64}'));
      if (!el) return 'not-found';
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      return 'scrolled';
    })()" \
    2>/dev/null | tail -1 | tr -d '"')
  [[ "$result" == "scrolled" ]] || qa_refuse "element '${selector}' not found for scroll"
  qa_settle 300
  qa_log "SCROLL_TO | selector='${selector}' | pass"
}

assert_visible_text_in() {
  local container_selector="$1" text="$2"
  local selector_b64 text_b64 result
  selector_b64=$(printf '%s' "$container_selector" | base64 | tr -d '\n')
  text_b64=$(printf '%s' "$text" | base64 | tr -d '\n')
  result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => {
      const selector = atob('${selector_b64}');
      const expectedText = atob('${text_b64}');
      const container = document.querySelector(selector);
      if (!container) return 'container-not-found';
      if (!container.innerText.includes(expectedText)) return 'text-not-found';
      const rect = container.getBoundingClientRect();
      const inViewport = rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
      const visible = typeof container.checkVisibility === 'function' ? container.checkVisibility() : true;
      if (!inViewport || !visible) return 'not-visible:' + JSON.stringify({ top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), right: Math.round(rect.right), viewportW: window.innerWidth, viewportH: window.innerHeight, visible });
      return 'ok';
    })()" \
    2>/dev/null | tail -1 | tr -d '"')
  case "$result" in
    ok)
      qa_log "ASSERT_VISIBLE_TEXT_IN | selector='${container_selector}' text='${text}' | pass"
      ;;
    container-not-found)
      qa_refuse "container '${container_selector}' not found"
      ;;
    text-not-found)
      qa_refuse "text '${text}' not found in container '${container_selector}'"
      ;;
    not-visible:*)
      qa_report_bug "text '${text}' found in container '${container_selector}' but container is not visible in viewport — ${result#not-visible:}"
      ;;
    *)
      qa_refuse "visible text check for '${text}' in '${container_selector}' returned unexpected result: ${result}"
      ;;
  esac
}

assert_viewport_size() {
  local expected_w="$1" expected_h="$2"
  local actual_json actual actual_w actual_h
  actual_json=$(agent-browser --session "$QA_SESSION" eval \
    "JSON.stringify({w: window.innerWidth, h: window.innerHeight})" \
    2>/dev/null | tail -1 | tr -d '"\\{} ')
  actual_w="${actual_json#w:}"
  actual_w="${actual_w%%,*}"
  actual_h="${actual_json##*,h:}"
  actual="${actual_w}x${actual_h}"
  [[ "$actual_w" == "$expected_w" && "$actual_h" == "$expected_h" ]] \
    || qa_refuse "viewport size mismatch: expected ${expected_w}x${expected_h}, actual: ${actual}"
  qa_log "ASSERT_VIEWPORT_SIZE | expected=${expected_w}x${expected_h} actual=${actual} | pass"
}

qa-set-viewport() {
  local w="$1" h="$2"
  local actual_json actual_w actual_h
  actual_json=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { window.resizeTo(${w}, ${h}); return JSON.stringify({w: window.innerWidth, h: window.innerHeight}); })()" \
    2>/dev/null | tail -1 | tr -d '"\\{} ')
  actual_w="${actual_json#w:}"
  actual_w="${actual_w%%,*}"
  actual_h="${actual_json##*,h:}"
  [[ "$actual_w" == "$w" && "$actual_h" == "$h" ]] \
    || qa_refuse "viewport resize to ${w}x${h} was ignored — actual: ${actual_w}x${actual_h}. CDP resize may be required."
  assert_viewport_size "$w" "$h"
  qa_log "SET_VIEWPORT | requested=${w}x${h} actual=${actual_w}x${actual_h} | pass"
}

qa-click-and-wait() {
  local label="$1" expected_result="$2"
  qa-click "$label"

  local attempt status expected text text_b64 selector selector_b64 result
  for attempt in {1..11}; do
    case "$expected_result" in
      wizard:*)
        expected="${expected_result#wizard:}"
        status=$(qa_wizard_status)
        [[ "$status" == "$expected" ]] && {
          qa_log "CLICK_AND_WAIT | label='${label}' expected='${expected_result}' | pass"
          return 0
        }
        ;;
      text:*)
        text="${expected_result#text:}"
        text_b64=$(printf '%s' "$text" | base64 | tr -d '\n')
        result=$(agent-browser --session "$QA_SESSION" eval \
          "document.body.innerText.includes(atob('${text_b64}'))" \
          2>/dev/null | tail -1 | tr -d '"')
        [[ "$result" == "true" ]] && {
          qa_log "CLICK_AND_WAIT | label='${label}' expected='${expected_result}' | pass"
          return 0
        }
        ;;
      selector:*)
        selector="${expected_result#selector:}"
        selector_b64=$(printf '%s' "$selector" | base64 | tr -d '\n')
        result=$(agent-browser --session "$QA_SESSION" eval \
          "(() => {
            const el = document.querySelector(atob('${selector_b64}'));
            if (!el) return false;
            const visible = typeof el.checkVisibility === 'function' ? el.checkVisibility() : true;
            return visible;
          })()" \
          2>/dev/null | tail -1 | tr -d '"')
        [[ "$result" == "true" ]] && {
          qa_log "CLICK_AND_WAIT | label='${label}' expected='${expected_result}' | pass"
          return 0
        }
        ;;
      *)
        qa_refuse "unknown expected result format: ${expected_result}"
        ;;
    esac
    [[ "$attempt" -eq 11 ]] && break
    qa_settle 300
  done

  qa_report_bug "click '${label}' did not produce expected result: ${expected_result}"
}

# ===== Actions with structural guards =====

# qa-click: THE critical function. Tries native agent-browser click first.
# If wizard status doesn't change, falls back to eval .click(). If still no
# change AND the button is enabled, logs as non-wizard-changing click (may be
# valid for toggles, selections). If button is disabled, refuses.
qa-click() {
  local label="$1"
  local ref="${2:-}"

  # Check button state before attempting
  local btn_info
  btn_info=$(agent-browser --session "$QA_SESSION" eval \
    "(() => {
      const b = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.includes('${label}'));
      if (!b) return 'not_found';
      return JSON.stringify({ disabled: b.disabled, ref: b.dataset.testid || 'n/a' });
    })()" 2>/dev/null | tail -1 | tr -d '"')

  if [[ "$btn_info" == "not_found" ]]; then
    qa_refuse "button '${label}' not found on page"
  fi
  if echo "$btn_info" | grep -q '"disabled":true'; then
    qa_refuse "button '${label}' is disabled — required preconditions not met. Check: name field filled? skills selected? step requirements satisfied?"
  fi

  # Track wizard state for change detection
  local state_before; state_before=$(qa_wizard_status)

  # Attempt 1: native agent-browser click
  if [[ -n "$ref" ]]; then
    agent-browser --session "$QA_SESSION" click "$ref" 2>/dev/null || true
  else
    agent-browser --session "$QA_SESSION" find role button click --name "${label}" 2>/dev/null || true
  fi
  sleep 0.5
  local state_after_native; state_after_native=$(qa_wizard_status)

  if [[ "$state_before" != "$state_after_native" ]]; then
    qa_log "CLICK | label='${label}' | method=native | wizard: ${state_before} -> ${state_after_native} | pass"
    return 0
  fi

  # Attempt 2: eval .click() fallback (for SciFiButton + async handlers)
  qa_log "CLICK_FALLBACK | label='${label}' | native click no wizard state change, trying eval .click()"
  agent-browser --session "$QA_SESSION" eval \
    "(() => {
      const b = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.includes('${label}'));
      if (b && !b.disabled) { b.click(); return 'clicked'; }
      return b ? 'disabled' : 'not_found';
    })()" 2>/dev/null > /dev/null || true
  sleep 0.5
  local state_after_eval; state_after_eval=$(qa_wizard_status)

  if [[ "$state_before" != "$state_after_eval" ]]; then
    qa_log "CLICK | label='${label}' | method=eval_fallback | wizard: ${state_before} -> ${state_after_eval} | pass"
    return 0
  fi

  # No wizard state change from either method. This is valid for non-wizard
  # actions (skill toggles, radio buttons, navigation tabs). Log and continue.
  qa_log "CLICK | label='${label}' | method=native | no_wizard_change (non-wizard action OK) | pass"
}

# qa-fill: React-compatible fill with value verification
qa-fill() {
  local ref="$1" value="$2" label="${3:-field}"

  # Verify element is not disabled
  if qa_is_disabled "$ref"; then
    qa_refuse "${label} (${ref}) is disabled, cannot fill"
  fi

  # Fill using agent-browser (Playwright's native setter is React-compatible)
  agent-browser --session "$QA_SESSION" fill "$ref" "${value}" 2>/dev/null || true
  sleep 0.3

  # Verify value was set
  local actual
  actual=$(agent-browser --session "$QA_SESSION" get value "$ref" 2>/dev/null | tail -1)
  if [[ "$actual" != "${value}" ]]; then
    qa_refuse "${label} fill verification failed: expected='${value}' actual='${actual}'"
  fi
  qa_log "FILL | label='${label}' | ref=${ref} | value='${value}' | verified | pass"
}

# qa-select-skill: toggle a background skill checkbox by name
qa-select-skill() {
  local skill_name="$1"
  local result
  result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => {
      const els = Array.from(document.querySelectorAll('button, label, [role=button], [role=checkbox]'));
      const el = els.find(e => e.textContent.trim().startsWith('${skill_name}'));
      if (!el) return 'not_found';
      el.click();
      return 'clicked';
    })()" 2>/dev/null | tail -1 | tr -d '"')

  if [[ "$result" != "clicked" ]]; then
    qa_refuse "skill '${skill_name}' not found or not clickable"
  fi
  qa_log "SELECT_SKILL | name='${skill_name}' | pass"
}

# ===== Evidence helpers =====
qa-snapshot() {
  local tag="${1:-checkpoint}"
  agent-browser --session "$QA_SESSION" snapshot -i > "$QA_EVIDENCE_DIR/${tag}-${QA_STEP}.snap" 2>&1
  qa_log "SNAPSHOT | tag=${tag}"
}

qa-screenshot() {
  local tag="${1:-checkpoint}"
  qa_settle
  agent-browser --session "$QA_SESSION" screenshot "$(pwd)/$QA_EVIDENCE_DIR/${tag}-${QA_STEP}.png" --full 2>&1 > /dev/null
  qa_log "SCREENSHOT | tag=${tag}"
}

# ===== Session lifecycle =====
# Flag to prevent double-cleanup (qa-finish calls qa-cleanup, then EXIT trap fires)
QA_CLEANUP_DONE=0

# Emergency cleanup — runs on ANY exit path (normal, error, signal) via EXIT trap.
# Guarantees the browser session is closed even if the script crashes mid-charter.
qa_emergency_cleanup() {
  [[ "${QA_CLEANUP_DONE:-0}" -eq 1 ]] && return
  QA_CLEANUP_DONE=1
  agent-browser --session "$QA_SESSION" close 2>/dev/null || true
  rm -rf "/tmp/qa/${QA_SESSION}" 2>/dev/null || true
}

# Kill ALL active QA sessions (emergency cleanup for leaked processes from prior runs).
# Usage: qa-kill-all-sessions
qa-kill-all-sessions() {
  echo "Killing all active agent-browser sessions..."
  local sessions
  sessions=$(agent-browser session list 2>&1 | grep '^  ' | sed 's/^  //')
  if [[ -z "$sessions" ]]; then
    echo "  No active sessions."
    return 0
  fi
  for sess in $sessions; do
    echo "  closing $sess..."
    agent-browser --session "$sess" close 2>/dev/null || true
  done
  echo "Done."
}

qa-init() {
  local charter_id="${1:-qa}"
  export QA_EVIDENCE_DIR=".sisyphus/evidence/${charter_id}"
  mkdir -p "$QA_EVIDENCE_DIR"
  : > "$QA_EVIDENCE_DIR/actions.log"
  # CRITICAL: trap ensures cleanup runs on ANY exit — normal, error (set -e), signal.
  # Without this, a mid-script crash leaks the browser process forever.
  trap qa_emergency_cleanup EXIT INT TERM
  qa_log "INIT | charter=${charter_id} | session=${QA_SESSION}"
}

# ===== Dice seed control for deterministic QA ===== #
# agent-browser eval runs AFTER page load — so Math.random override
# alone is insufficient. The mgt2e dice.ts module captures `rng = Math.random`
# at load time, and agent-browser cannot affect that pre-capture value.
# This function installs a seed BOTH by calling the dev-only window hook
# (which reassigns the internal rng via mulberry32) AND by overriding Math.random
# as a fallback for code paths that read Math.random directly.
qa-install-dice-seed() {
  local seed="${1:-42}"
  local result
  result=$(agent-browser --session "$QA_SESSION" eval \
    "(() => {
      if (typeof window !== 'undefined' && typeof window.__qaSetDiceSeed === 'function') {
        window.__qaSetDiceSeed(${seed});
        Math.random = (() => { let s = ${seed}; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
        return 'seeded';
      }
      return 'no-hook';
    })()" \
    2>/dev/null | tail -1 | tr -d '"')
  qa_log "DICE_SEED_INSTALLED | seed=${seed} | result=${result}"
}

# Force all targeted dice rolls to succeed. Use after wizard has mounted
# (after assert_wizard_status) so the flag is read by the roll() function.
# This is more reliable than qa-install-dice-seed because it doesn't depend
# on seed values matching survival targets.
qa-force-roll-success() {
  agent-browser --session "$QA_SESSION" eval \
"window.__qaForceRollSuccess = true" 2>/dev/null | tail -1
  qa_log "FORCE_ROLL_SUCCESS | enabled"
}

qa-force-roll-default() {
  agent-browser --session "$QA_SESSION" eval \
"window.__qaForceRollSuccess = false" 2>/dev/null | tail -1
  qa_log "FORCE_ROLL_SUCCESS | disabled"
}

qa-force-roll-failure() {
  agent-browser --session "$QA_SESSION" eval \
"window.__qaForceRollFailure = true" 2>/dev/null | tail -1
  qa_log "FORCE_ROLL_FAILURE | enabled"
}

qa-force-roll-default-failure() {
  agent-browser --session "$QA_SESSION" eval \
"window.__qaForceRollFailure = false" 2>/dev/null | tail -1
  qa_log "FORCE_ROLL_FAILURE | disabled"
}

qa-login() {
  local email="${1:-agent-qa-player1@example.com}"
  local password="${2:-test-password-123}"

  QA_STEP="login"
  qa_log "LOGIN_START | email=${email}"

  # Clean slate: close any stale daemon, then start with persistent profile
  agent-browser close 2>/dev/null || true
  rm -rf "/tmp/qa/${QA_SESSION}"
  mkdir -p "/tmp/qa/${QA_SESSION}"

  agent-browser --session "$QA_SESSION" \
    --profile "/tmp/qa/${QA_SESSION}" \
    --session-name "$QA_SESSION" \
    open "${QA_BASE_URL}/login" 2>/dev/null | tail -1
  agent-browser --session "$QA_SESSION" wait 1500 2>/dev/null | tail -1

  # Parse refs from snapshot
  local snap
  snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)

  local email_ref pass_ref signin_ref
  email_ref=$(echo "$snap" | grep -i 'EMAIL' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  pass_ref=$(echo "$snap" | grep -i 'PASSWORD' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
  signin_ref=$(echo "$snap" | grep -i 'Sign In' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)

  [[ -z "$email_ref" ]] && qa_refuse "email field not found on login page"
  [[ -z "$pass_ref" ]] && qa_refuse "password field not found on login page"
  [[ -z "$signin_ref" ]] && qa_refuse "Sign In button not found on login page"

  agent-browser --session "$QA_SESSION" fill "$email_ref" "$email" 2>/dev/null | tail -1
  agent-browser --session "$QA_SESSION" fill "$pass_ref" "$password" 2>/dev/null | tail -1
  agent-browser --session "$QA_SESSION" click "$signin_ref" 2>/dev/null | tail -1
  agent-browser --session "$QA_SESSION" wait 2000 2>/dev/null | tail -1

  # Verify login succeeded
  local url; url=$(qa_get_url)
  if [[ "$url" == *"/login"* ]]; then
    qa_refuse "login failed — still on /login page"
  fi
  qa_log "LOGIN | email=${email} | url=${url} | pass"
}

qa-navigate() {
  local path="$1"
  agent-browser --session "$QA_SESSION" open "${QA_BASE_URL}${path}" 2>/dev/null | tail -1
  agent-browser --session "$QA_SESSION" wait 1500 2>/dev/null | tail -1
  qa_log "NAVIGATE | path=${path} | url=$(qa_get_url)"
}

qa-cleanup() {
  QA_CLEANUP_DONE=1  # prevent double-cleanup from EXIT trap
  agent-browser --session "$QA_SESSION" close 2>/dev/null || true
  rm -rf "/tmp/qa/${QA_SESSION}"
  qa_log "CLEANUP | session=${QA_SESSION}"
}

# Charter scripts call this at the end
qa-finish() {
  local result="${1:-success}"
  qa_log "FINISH | result=${result}"
  case "$result" in
    success)
      if type assert_runtime_clean_warn &>/dev/null; then
        assert_runtime_clean_warn
      fi
      ;;
  esac
  qa-cleanup
  case "$result" in
    success)              exit 0 ;;
    app_bug)              exit 1 ;;
    precondition_failure) exit 2 ;;
    *)
      echo "qa-finish: unknown result '${result}' (use: success|app_bug|precondition_failure)" >&2
      exit 2 ;;
  esac
}
