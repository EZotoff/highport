# Highport Agent-QA

Agentic test harness for **Tier 1** (multi-player character creation). Drives a real AI agent (Browser-Use) through chargen charters, asserts FSM outcomes via Playwright, and scores UI readability via a critic persona. Output lands under `.sisyphus/evidence/agent-qa/{timestamp}/`.

**Not a Playwright e2e.** The agent drives the browser; the harness owns assertions. Non-deterministic OK; run occasionally (pre-flight before releases), not per-commit.

## Status

**Phase 0 — skeleton.** Schemas, probes, and FSM/budget modules under construction. No charters runnable yet.

## Stack (planned)

- Python ≥ 3.11
- Browser-Use (action layer) + Playwright (assertion layer)
- Haiku for cheap planning, Sonnet for UI critic
- Pydantic for charter/persona schemas, Typer for CLI

## Setup

```bash
cd apps/agent-qa
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[all]"
playwright install chromium
```

## Usage (once Phase 2 lands)

```bash
python -m agent_qa probe                  # service health
python -m agent_qa bootstrap              # docker compose up + pnpm dev
python -m agent_qa run --charter S0       # smoke
python -m agent_qa run --charter all      # full suite
python -m agent_qa run --only ui-critic   # standalone UI sweep
python -m agent_qa list                   # charters available
```

## Architecture

See `docs/architecture/ARCHITECTURE.md` at repo root for service map. Harness modules:

- `agent_qa/charters/` — YAML charter schema + 8 charter files (A1, B1, C1, C2, E1, F2, GM-D, UI-Q1, plus S0 smoke)
- `agent_qa/personas/` — player, gm, ui-critic persona YAMLs
- `agent_qa/runtime/` — FSM validator, budget guard, action tape, Browser-Use driver, multiplayer coordinator
- `agent_qa/health/` — service probes (web, hocuspocus, fastify, postgres, rag, ollama)
- `agent_qa/critic/` — UI readability rubric (typography/spacing/copy/CLS/contrast), Haiku planner, Sonnet critic
- `agent_qa/resilience/` — kill switches (e.g., RAG-down fault injection for F2)
- `agent_qa/reporting/` — SBTM markdown, JSONL tape, prompt manifest hashing, evidence paths
