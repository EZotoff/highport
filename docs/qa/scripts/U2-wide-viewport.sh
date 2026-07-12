#!/usr/bin/env bash
# docs/qa/scripts/U2-wide-viewport.sh
#
# Reference charter: U2 Wide Viewport Layout Verification.
# Tests chargen wizard layout at 1920x1080 wide viewport.
# Simple checks: container presence, overflow detection, screenshot comparison.
#
# Usage:
#   bash docs/qa/scripts/U2-wide-viewport.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/lib/qa-assertions.sh"

qa-init "U2-wide-viewport"

echo "=== U2: Wide Viewport Layout Verification ==="

# ---- Step 1: Login ----
QA_STEP="01-login"
qa-login
qa_runtime_clear

# ---- Step 2: Navigate to chargen at 1280x720 baseline ----
QA_STEP="02-baseline-1280"
qa-navigate "/chargen"
qa-wait-for-visual-state
qa-screenshot "baseline-1280"

# ---- Step 3: Create character, advance to career selection ----
QA_STEP="03-create-character"
qa-click "Create New Character"
qa-wait-for-visual-state
snap=$(agent-browser --session "$QA_SESSION" snapshot -i 2>&1)
name_ref=$(echo "$snap" | grep 'CHARACTER NAME' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=/@/' || true)
if [[ -n "$name_ref" ]]; then
  qa-fill "$name_ref" "U2 Wide Test" "name"
fi
qa-select-skill "Admin"
qa-select-skill "Animals"
qa-select-skill "Art"
qa-click-and-wait "Continue →" "wizard:career_selection"
qa-wait-for-visual-state
qa-screenshot "career-selection-1280"

# ---- Step 4: Resize to 1920x1080 ----
QA_STEP="04-resize-1920"
agent-browser --session "$QA_SESSION" set viewport 1920 1080
qa-set-viewport 1920 1080
qa-wait-for-visual-state
qa-screenshot "career-selection-1920"

# ---- Step 5: Verify layout at 1920 with proper assertions ----
QA_STEP="05-verify-layout-1920"

# Check main content uses sufficient viewport width (catches Bug #1: cramped layout)
assert_utilizes_width "[data-testid=chargen-wizard]" 70 "Chargen wizard container"

# Check key containers for overflow
assert_all_no_overflow "[data-testid=career-card]" "Career cards"
assert_no_overflow_warn "[data-testid=career-card]" "Career card"

assert_no_overflow_warn '[data-testid=character-preview]' "CharacterPreview panel"
assert_not_occluded_warn "[data-testid=main-content] button:last-of-type" "Continue button"

# Check no horizontal scroll at 1920
assert_page_no_horizontal_scroll

# Capture clean screenshot for review
assert_screenshot_clean "career-selection-1920"

# ---- Step 6: Background step layout at 1920 ----
QA_STEP="06-background-1920"
qa-navigate "/chargen"
# Character already exists from step 3 — click Back to return to background step for layout screenshot
qa-click "Back"
qa-wait-for-visual-state
qa-screenshot "background-form-1920"
assert_screenshot_clean "background-form-1920"

# ---- Step 7: Resize to 1280x720 for comparison ----
QA_STEP="07-compare-1280"
agent-browser --session "$QA_SESSION" set viewport 1280 720
qa-set-viewport 1280 720
qa-wait-for-visual-state
assert_page_no_horizontal_scroll
qa-screenshot "comparison-1280"

# ---- Step 8: Final verification ----
QA_STEP="08-final"
assert_text_visible "Background"
qa-screenshot "final-1280"

echo ""
echo "=== U2 WIDE VIEWPORT TEST PASSED ==="
echo "Evidence: ${QA_EVIDENCE_DIR}/"
echo "Log:      ${QA_EVIDENCE_DIR}/actions.log"

assert_runtime_clean_warn
qa-finish success
