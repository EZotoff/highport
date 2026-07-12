#!/usr/bin/env bash
# docs/qa/scripts/lib/qa-runtime.sh
#
# Runtime capture helpers for QA charter scripts. This file is sourced by the
# QA harness and uses only agent-browser's native console/errors/network
# commands; it does not inject JavaScript listeners or override native fetch.
#
# Design principles:
#   1. Native capture only: agent-browser console/errors/network are the source
#      of truth for browser runtime state.
#   2. Evidence first: assertions capture JSON artifacts before evaluating them.
#   3. Graceful parsing: empty or malformed command output is treated as an
#      empty buffer, not as a charter crash.
#   4. Exit code protocol: fatal assertions call qa_report_bug (exit 1), while
#      advisory variants call qa_warn and continue.
#
# Usage (after sourcing qa-assertions.sh):
#   source "$(dirname "$0")/lib/qa-runtime.sh"
#   qa_runtime_clear
#   QA_STEP="after-action"
#   assert_runtime_clean

# Console error noise allowlist. Extend this array with grep -E patterns only
# when a message is known dev-mode noise and not a product defect.
QA_RUNTIME_CONSOLE_ERROR_ALLOWLIST=(
  'Download the React DevTools'
  'React StrictMode'
  'StrictMode.*double[- ]render'
  'double[- ]render'
  'Highport dev[- ]mode'
  'HocuspocusProvider.*development'
)

qa_runtime_clear() {
  agent-browser --session "$QA_SESSION" console --clear >/dev/null 2>&1 || true
  agent-browser --session "$QA_SESSION" errors --clear >/dev/null 2>&1 || true
  agent-browser --session "$QA_SESSION" network requests --clear >/dev/null 2>&1 || true
  qa_log "RUNTIME_CLEAR | session=${QA_SESSION}"
}

qa_capture_runtime() {
  mkdir -p "$QA_EVIDENCE_DIR"

  _qa_runtime_capture "console" "agent-browser --session '$QA_SESSION' console --json"
  _qa_runtime_capture "errors" "agent-browser --session '$QA_SESSION' errors --json"
  _qa_runtime_capture "network" "agent-browser --session '$QA_SESSION' network requests --json"

  local console_count errors_count requests_count
  console_count=$(_qa_runtime_count "$QA_EVIDENCE_DIR/console-${QA_STEP}.json" '.data.entries // [] | length')
  errors_count=$(_qa_runtime_count "$QA_EVIDENCE_DIR/errors-${QA_STEP}.json" '.data.errors // [] | length')
  requests_count=$(_qa_runtime_count "$QA_EVIDENCE_DIR/network-${QA_STEP}.json" '.data.requests // [] | length')

  qa_log "RUNTIME_CAPTURED | step=${QA_STEP} | console=${console_count} errors=${errors_count} requests=${requests_count}"
}

_qa_runtime_capture() {
  local kind="$1" command="$2" target
  target="$QA_EVIDENCE_DIR/${kind}-${QA_STEP}.json"
  { eval "$command" 2>/dev/null | tail -1 > "$target"; } || true
}

_qa_runtime_count() {
  local file="$1" filter="$2"
  if [[ ! -s "$file" ]]; then
    printf '0\n'
    return 0
  fi
  if command -v jq >/dev/null 2>&1; then
    jq -r "try (${filter}) catch 0" "$file" 2>/dev/null || printf '0\n'
    return 0
  fi
  python3 - "$file" "$filter" <<'PY' 2>/dev/null || printf '0\n'
import json
import sys

path, mode = sys.argv[1], sys.argv[2]
try:
    with open(path, encoding="utf-8") as fh:
        payload = json.load(fh)
except Exception:
    print(0)
    raise SystemExit(0)

data = payload.get("data") if isinstance(payload, dict) else {}
if mode.startswith(".data.entries"):
    value = data.get("entries", []) if isinstance(data, dict) else []
elif mode.startswith(".data.errors"):
    value = data.get("errors", []) if isinstance(data, dict) else []
elif mode.startswith(".data.requests"):
    value = data.get("requests", []) if isinstance(data, dict) else []
else:
    value = []
print(len(value) if isinstance(value, list) else 0)
PY
}

_qa_runtime_allowed_console_error() {
  local text="$1" pattern
  for pattern in "${QA_RUNTIME_CONSOLE_ERROR_ALLOWLIST[@]}"; do
    if grep -Eiq -- "$pattern" <<< "$text"; then
      return 0
    fi
  done
  return 1
}

_qa_runtime_console_rows() {
  local file="$1"
  [[ -s "$file" ]] || return 0
  if command -v jq >/dev/null 2>&1; then
    jq -r '
      try (.data.entries // [] | .[] |
        select(((.level // "") | ascii_downcase) == "error") |
        ["console.error", (.text // .message // .value // "")] | @tsv
      ) catch empty
    ' "$file" 2>/dev/null || true
    return 0
  fi
  python3 - "$file" <<'PY' 2>/dev/null || true
import json
import sys

try:
    payload = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    raise SystemExit(0)
for entry in payload.get("data", {}).get("entries", []):
    if str(entry.get("level", "")).lower() == "error":
        print("console.error\t" + str(entry.get("text") or entry.get("message") or entry.get("value") or ""))
PY
}

_qa_runtime_error_rows() {
  local file="$1"
  [[ -s "$file" ]] || return 0
  if command -v jq >/dev/null 2>&1; then
    jq -r '
      try (.data.errors // [] | .[] |
        ["uncaught", (.text // .message // .error // ""), (.url // .source // ""), (.line // ""), (.column // "")] | @tsv
      ) catch empty
    ' "$file" 2>/dev/null || true
    return 0
  fi
  python3 - "$file" <<'PY' 2>/dev/null || true
import json
import sys

try:
    payload = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    raise SystemExit(0)
for entry in payload.get("data", {}).get("errors", []):
    print("uncaught\t{}\t{}\t{}\t{}".format(
        entry.get("text") or entry.get("message") or entry.get("error") or "",
        entry.get("url") or entry.get("source") or "",
        entry.get("line") or "",
        entry.get("column") or "",
    ))
PY
}

_qa_runtime_console_issues() {
  local console_file="$QA_EVIDENCE_DIR/console-${QA_STEP}.json"
  local errors_file="$QA_EVIDENCE_DIR/errors-${QA_STEP}.json"
  local kind text url line column

  while IFS=$'\t' read -r kind text; do
    [[ -n "${kind:-}" ]] || continue
    if ! _qa_runtime_allowed_console_error "$text"; then
      printf '%s: %s\n' "$kind" "$text"
    fi
  done < <(_qa_runtime_console_rows "$console_file")

  while IFS=$'\t' read -r kind text url line column; do
    [[ -n "${kind:-}" ]] || continue
    if ! _qa_runtime_allowed_console_error "$text"; then
      printf '%s: %s (%s:%s:%s)\n' "$kind" "$text" "${url:-unknown}" "${line:-0}" "${column:-0}"
    fi
  done < <(_qa_runtime_error_rows "$errors_file")
}

_check_no_console_errors() {
  local fail_fn="$1"
  qa_capture_runtime

  local issues issue_count first_issues
  issues=$(_qa_runtime_console_issues)
  [[ -z "$issues" ]] && return 0

  issue_count=$(grep -c '^' <<< "$issues" || true)
  first_issues=$(printf '%s\n' "$issues" | head -3 | paste -sd '; ' -)
  "$fail_fn" "Console/runtime errors: ${issue_count} issue(s): ${first_issues}"
  return 1
}

assert_no_console_errors() {
  _check_no_console_errors qa_report_bug
  qa_log "ASSERT_NO_CONSOLE_ERRORS | pass"
}

assert_no_console_errors_warn() {
  if _check_no_console_errors qa_warn; then
    qa_log "ASSERT_NO_CONSOLE_ERRORS_WARN | pass"
  fi
}

_qa_runtime_network_rows() {
  local file="$1"
  [[ -s "$file" ]] || return 0
  if command -v jq >/dev/null 2>&1; then
    jq -r '
      try (.data.requests // [] | .[] |
        [
          (.status // .statusCode // .responseStatus // .response.status // .response.statusCode // .res.status // .res.statusCode // ""),
          (.method // .request.method // ""),
          (.url // .request.url // .resource // "")
        ] | @tsv
      ) catch empty
    ' "$file" 2>/dev/null || true
    return 0
  fi
  python3 - "$file" <<'PY' 2>/dev/null || true
import json
import sys

def pick(obj, *paths):
    for path in paths:
        cur = obj
        for key in path:
            if not isinstance(cur, dict) or key not in cur:
                cur = None
                break
            cur = cur[key]
        if cur not in (None, ""):
            return cur
    return ""

try:
    payload = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    raise SystemExit(0)
for entry in payload.get("data", {}).get("requests", []):
    status = pick(entry, ("status",), ("statusCode",), ("responseStatus",), ("response", "status"), ("response", "statusCode"), ("res", "status"), ("res", "statusCode"))
    method = pick(entry, ("method",), ("request", "method"))
    url = pick(entry, ("url",), ("request", "url"), ("resource",))
    print(f"{status}\t{method}\t{url}")
PY
}

_qa_runtime_network_issues() {
  local mode="$1" network_file="$QA_EVIDENCE_DIR/network-${QA_STEP}.json"
  local status method url
  while IFS=$'\t' read -r status method url; do
    [[ "$status" =~ ^[0-9]+$ ]] || continue
    if [[ "$status" -eq 401 || "$status" -eq 403 || "$status" -eq 404 || "$status" -ge 500 ]]; then
      printf 'fatal\t%s\t%s\t%s\n' "$status" "${method:-GET}" "${url:-unknown-url}"
    elif [[ "$mode" == "warn" && ( "$status" -eq 400 || "$status" -eq 409 || "$status" -eq 422 || "$status" -eq 429 ) ]]; then
      printf 'warn\t%s\t%s\t%s\n' "$status" "${method:-GET}" "${url:-unknown-url}"
    fi
  done < <(_qa_runtime_network_rows "$network_file")
}

_check_no_network_failures() {
  local fail_fn="$1" include_warns="${2:-0}"
  qa_capture_runtime

  local fatal_issues warn_issues fatal_count warn_count first_fatal first_warn
  fatal_issues=$(_qa_runtime_network_issues fatal | grep '^fatal' || true)
  warn_issues=$(_qa_runtime_network_issues warn | grep '^warn' || true)

  warn_count=0
  if [[ -n "$warn_issues" ]]; then
    warn_count=$(grep -c '^' <<< "$warn_issues" || true)
    first_warn=$(printf '%s\n' "$warn_issues" | cut -f2- | head -3 | paste -sd '; ' -)
    qa_warn "Network warning statuses: ${warn_count} request(s): ${first_warn}"
  fi

  [[ -n "$fatal_issues" ]] || return 0
  fatal_count=$(grep -c '^' <<< "$fatal_issues" || true)
  first_fatal=$(printf '%s\n' "$fatal_issues" | cut -f2- | head -3 | paste -sd '; ' -)

  if [[ "$include_warns" -eq 1 ]]; then
    "$fail_fn" "Network failures: ${fatal_count} fatal request(s), ${warn_count} warning request(s): ${first_fatal}"
  else
    "$fail_fn" "Network failures: ${fatal_count} request(s) with fatal status: ${first_fatal}"
  fi
  return 1
}

assert_no_network_failures() {
  _check_no_network_failures qa_report_bug 1
  qa_log "ASSERT_NO_NETWORK_FAILURES | pass"
}

assert_no_network_failures_warn() {
  if _check_no_network_failures qa_warn 1; then
    qa_log "ASSERT_NO_NETWORK_FAILURES_WARN | pass"
  fi
}

assert_runtime_clean() {
  assert_no_console_errors
  assert_no_network_failures
  qa_log "RUNTIME_CLEAN | pass"
}

assert_runtime_clean_warn() {
  assert_no_console_errors_warn
  assert_no_network_failures_warn
  qa_log "RUNTIME_CLEAN_WARN | complete"
}
