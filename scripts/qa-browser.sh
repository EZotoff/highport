#!/usr/bin/env bash
set -euo pipefail

CDP_PORT=18125
PROFILE_DIR=/tmp/traveller-qa-chrome

case "${1:-start}" in
  start)
    mkdir -p "$PROFILE_DIR"
    setsid /opt/google/chrome/chrome \
      --remote-debugging-port=$CDP_PORT \
      --user-data-dir="$PROFILE_DIR" \
      --no-first-run \
      --no-default-browser-check \
      --disable-extensions \
      --headless=new \
      --disable-gpu \
      "http://localhost:18120/" \
      > /dev/null 2>&1 &
    echo $! > .sisyphus/pids/qa-browser.pid
    sleep 3
    if curl -s "http://localhost:$CDP_PORT/json/version" > /dev/null 2>&1; then
      echo "QA browser running on CDP port $CDP_PORT (PID $(cat .sisyphus/pids/qa-browser.pid))"
      echo "Connect: agent-browser --cdp $CDP_PORT open http://localhost:18120/chargen"
    else
      echo "ERROR: Browser failed to start on port $CDP_PORT"
      exit 1
    fi
    ;;
  stop)
    if [[ -f .sisyphus/pids/qa-browser.pid ]]; then
      kill "$(cat .sisyphus/pids/qa-browser.pid)" 2>/dev/null || true
      rm -f .sisyphus/pids/qa-browser.pid
      echo "QA browser stopped"
    else
      echo "No QA browser PID found"
    fi
    pkill -f "remote-debugging-port=$CDP_PORT" 2>/dev/null || true
    ;;
  status)
    if curl -s "http://localhost:$CDP_PORT/json/version" > /dev/null 2>&1; then
      echo "Running on CDP port $CDP_PORT"
    else
      echo "Not running"
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
