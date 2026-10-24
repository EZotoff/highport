# [SCHEDULED WAKE] chargen fix-plan execution start

You are the Sisyphus orchestrator session ses_e957650e0ffesIFi5cOt5UhO3b, woken by a systemd timer armed ~4h ago (unit wake-chargen-fix-20261025). The operator directed: "Proceed sequentially, but start in 4 hours."

## RECONCILE FROM DURABLE STATE FIRST — not from this prompt, not from memory

1. Read `/home/ezotoff/AI_projects/traveller/.sisyphus/execution/chargen-fix-execution.json`. It is the single source of truth: mission, execution order (C -> B -> A -> D), per-plan protocol, operator directives, stop conditions.
2. If the suppression marker `.sisyphus/execution/.chargen-fix-execution-complete` exists, or the state file shows all plans done — the work already finished: do nothing beyond a brief acknowledgment.
3. If a plan shows `in_progress` or `done` with evidence, resume from the first non-done plan. Re-read that plan file and its `.reviews.md` from disk before dispatching anything.
4. If git history already contains execution commits (check `git log --oneline -20` for chargen-fix work), reconcile statuses against reality before re-dispatching.

## EXACT ACTION

Begin sequential execution per the state file's `per_plan_protocol`, starting with the first `pending` plan in `order` (expected: Plan C, fix-server-authz). Operator rules that bind:

- **Orchestrate only** — never hand-implement code yourself; dispatch to worker agents and verify.
- **Sequential** — one plan at a time.
- Each plan must pass its entire Final Verification Wave before merge/push and before the next plan starts.
- Keep the state file updated after every status change and commit it.

If the session's prior context was lost, everything needed is in the state file + plan docs. Do not re-run reviews; do not re-plan.
