#!/usr/bin/env bash
# docs/qa/scripts/run-qa.sh
#
# Wrapper to launch OpenCode with QA-friendly subagent-loop-guard thresholds.
#
# Why this exists:
#   The subagent-loop-guard plugin ( ~/.opencode/plugin/subagent-loop-guard.ts )
#   blocks bash calls when the same tool is invoked too many times in a window.
#   Defaults are tuned for implementation work and trip legitimate QA flows:
#     Rule A: >30 same-tool calls in a 50-call window  -> BLOCK
#     Rule B: >20 same-tool calls in a 30-call window  -> BLOCK  (fires first)
#   Sequential `agent-browser <cmd>` invocations in QA charters trip Rule B at
#   call ~20, killing the subagent before a 30-step charter finishes. Multiplayer
#   charters (two sessions, 2x commands) trip even faster.
#
# What this wrapper does:
#   Raises both thresholds to 100 (5x headroom). Combined with `&&` command
#   chaining in charter scripts (5-10x call-count reduction), this comfortably
#   covers any charter including multiplayer ones.
#
# What it does NOT do:
#   - Does NOT set OMO_LOOP_GUARD_DISABLE=1. The guard protects implementation
#     work from real infinite loops. Disable globally and you'll lose a key
#     safety net. Raise thresholds for QA sessions only.
#   - Does NOT override OMO_LOOP_GUARD_COOLDOWN_MS or OMO_LOOP_GUARD_INFO_THRESHOLD
#     — defaults (60s cooldown, 300-call soft warning) are fine for QA.
#
# Usage:
#   ./docs/qa/scripts/run-qa.sh                 # launch opencode in cwd
#   ./docs/qa/scripts/run-qa.sh --task "..."    # args pass through to opencode
#
# Env vars (override on the command line if needed):
#   OMO_LOOP_GUARD_N_A    (default raised to 100; plugin default 30)
#   OMO_LOOP_GUARD_N_B    (default raised to 100; plugin default 20)
#
# See:
#   - Plugin source: ~/.opencode/plugin/subagent-loop-guard.ts
#   - Wisdom entry: 20260705-155819-587w (system scope)
#   - Plan context: .omo/plans/qa-process-overhaul.md (T6)

set -euo pipefail

export OMO_LOOP_GUARD_N_A="${OMO_LOOP_GUARD_N_A:-100}"
export OMO_LOOP_GUARD_N_B="${OMO_LOOP_GUARD_N_B:-100}"
# Auto-kill idle agent-browser daemons after 120 seconds of inactivity.
# This is a SAFETY NET for leaked sessions — the primary cleanup is the EXIT trap
# in qa-assertions.sh. But if a script is killed with SIGKILL (uncatchable), or
# crashes before the trap is installed, the daemon would persist forever without this.
export AGENT_BROWSER_IDLE_TIMEOUT_MS="${AGENT_BROWSER_IDLE_TIMEOUT_MS:-120000}"

echo "[run-qa] OMO_LOOP_GUARD_N_A=$OMO_LOOP_GUARD_N_A  OMO_LOOP_GUARD_N_B=$OMO_LOOP_GUARD_N_B  IDLE_TIMEOUT=${AGENT_BROWSER_IDLE_TIMEOUT_MS}ms" >&2

exec opencode "$@"
