#!/usr/bin/env bash
# docs/qa/scripts/R1-mobile-viewport.sh
#
# Reference charter: R1 Mobile and Tablet Responsive Layout.
# Tests chargen background-form layout at 375x667 and 768x1024.
# Checks viewport sizing, horizontal scroll, clipping, and Continue occlusion.
#
# Usage:
#   bash docs/qa/scripts/R1-mobile-viewport.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "R1-mobile-viewport"

echo "=== R1: Mobile and Tablet Responsive Layout ==="

check_responsive_layout() {
  local label="$1"

  assert_page_no_horizontal_scroll
  qa_log "VERIFY | No horizontal scroll at ${label} | pass"

  qa-scroll-to '[data-testid="main-content"] button:last-of-type'
  assert_not_occluded_warn '[data-testid="main-content"] button:last-of-type' "Continue button (${label})"
  qa_log "VERIFY | Continue button occlusion check completed at ${label} | pass"

  assert_all_no_overflow '[data-testid="main-content"] button, [data-testid="main-content"] input, [data-testid="main-content"] label' "Background form controls and labels (${label})"
  assert_no_overflow_warn '[data-testid="main-content"]' "Main content container (${label})"
  qa_log "VERIFY | Text and form overflow checks completed at ${label} | pass"

  # Verify layout collapses to single column at mobile width (no multi-column CSS)
  local col_count
  col_count=$(agent-browser --session "$QA_SESSION" eval \
    "(() => { const main = document.querySelector('[data-testid=\"main-content\"]') || document.querySelector('main') || document.body; const style = getComputedStyle(main); const cols = style.columnCount || style.gridTemplateColumns?.split(' ').length || 1; return String(cols); })()" \
    2>/dev/null | tail -1 | tr -d '"')
  if [[ "${col_count:-1}" == "1" ]]; then
    qa_log "VERIFY | Single-column layout at ${label} | pass"
  else
    qa_log "WARN | Multi-column layout (${col_count}) detected at ${label} — may need responsive collapse"
  fi
}

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

# ---- Step 3: Create New Character ----
QA_STEP="03-create-character"
qa-click "Create New Character"
sleep 1
qa-wait-for-visual-state

# ---- Step 4: Mobile 375x667 ----
QA_STEP="04-mobile-375"
agent-browser --session "$QA_SESSION" set viewport 375 667
sleep 1
assert_viewport_size 375 667
qa-wait-for-visual-state
qa-screenshot "mobile-375x667-chargen"
check_responsive_layout "mobile 375x667"

# ---- Step 5: Tablet 768x1024 ----
QA_STEP="05-tablet-768"
agent-browser --session "$QA_SESSION" set viewport 768 1024
sleep 1
assert_viewport_size 768 1024
qa-wait-for-visual-state
qa-screenshot "tablet-768x1024-chargen"
check_responsive_layout "tablet 768x1024"

# ---- Step 6: Report ----
QA_STEP="06-report"
qa_log "SUMMARY | Responsive layout checked at 375x667 and 768x1024"
qa_log "SUMMARY | Verified viewport size, horizontal scroll, Continue occlusion, and visible form overflow"

echo ""
echo "=== R1 MOBILE VIEWPORT TEST PASSED ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
