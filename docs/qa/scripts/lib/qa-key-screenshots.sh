#!/usr/bin/env bash
# docs/qa/scripts/lib/qa-key-screenshots.sh
#
# Reads actions.log from a charter's evidence directory and outputs
# the list of "key" screenshot paths for visual review.
#
# Key screenshots are those captured after a wizard state transition
# (Continue click or wizard status assertion), or containing viewport
# "1920" or container-heavy view tags (skill, career, background,
# event, survival) in the filename.
#
# Excluded: login, refuse, loading screenshots.
#
# Usage: qa-key-screenshots.sh <evidence_dir>
#
# Example:
#   bash docs/qa/scripts/lib/qa-key-screenshots.sh .sisyphus/evidence/qa/B3-skill-training

set -euo pipefail

EVIDENCE_DIR="${1:-}"
if [[ -z "$EVIDENCE_DIR" ]] || [[ ! -d "$EVIDENCE_DIR" ]]; then
  echo "Usage: $0 <evidence_dir>" >&2
  echo "Error: '$EVIDENCE_DIR' is not a directory" >&2
  exit 1
fi

ACTIONS_LOG="$EVIDENCE_DIR/actions.log"
if [[ ! -f "$ACTIONS_LOG" ]]; then
  echo "Error: actions.log not found in $EVIDENCE_DIR/actions.log" >&2
  exit 1
fi

# State: tracks whether we've passed a wizard state transition
POST_STATE_TRANSITION=false

while IFS= read -r line || [[ -n "$line" ]]; do
  # Trim leading/trailing whitespace
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  [[ -z "$line" ]] && continue

  # Line format: DATE | step=STEP | CONTENT...
  # Extract step from 2nd pipe-delimited field
  step="$(echo "$line" | cut -d'|' -f2 | sed 's/^ *step=//; s/ *$//')"
  [[ -z "$step" ]] && continue

  # Content is everything after " | step=STEP | " prefix
  content="$(echo "$line" | cut -d'|' -f3- | sed 's/^ *//')"

  # --- State transition detection ---
  # Trigger: any CLICK whose label contains "Continue", or any ASSERT_WIZARD_STATUS
  if echo "$content" | grep -q '^CLICK | label=' && echo "$content" | grep -q 'Continue'; then
    POST_STATE_TRANSITION=true
  fi
  if echo "$content" | grep -q 'ASSERT_WIZARD_STATUS'; then
    POST_STATE_TRANSITION=true
  fi

  screenshot_path=""

  # --- SCREENSHOT entries:  SCREENSHOT | tag=TAG ---
  # File at: $EVIDENCE_DIR/${TAG}-${STEP}.png
  if echo "$content" | grep -q '^SCREENSHOT '; then
    tag="$(echo "$content" | sed -n 's/.*tag=\([^|]*\).*/\1/p' | sed 's/^ *//; s/ *$//')"
    if [[ -n "$tag" ]]; then
      screenshot_path="$EVIDENCE_DIR/${tag}-${step}.png"
    fi
  fi

  # --- REVIEW_NEEDED entries:  REVIEW_NEEDED | screenshot=PATH | prompt=... ---
  if echo "$content" | grep -q '^REVIEW_NEEDED '; then
    path="$(echo "$content" | sed -n 's/.*screenshot=\([^ ]*\).*/\1/p')"
    if [[ -n "$path" ]]; then
      screenshot_path="$path"
    fi
  fi

  [[ -z "$screenshot_path" ]] && continue

  # --- Exclusion check ---
  fn="$(basename "$screenshot_path")"
  if echo "$fn" | grep -qiE '(login|refuse|loading)'; then
    continue
  fi

  # --- Inclusion check (any of these qualifies) ---
  include=false
  [[ "$POST_STATE_TRANSITION" == "true" ]] && include=true
  echo "$fn" | grep -q '1920' && include=true
  echo "$fn" | grep -qiE '(skill|career|background|event|survival)' && include=true

  if [[ "$include" == "true" ]]; then
    echo "$screenshot_path"
  fi

done < "$ACTIONS_LOG"
