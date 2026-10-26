# Closeout — chargen fix episode (chargen-fix-20261023)

## Problem + intent

The chargen (character generation) functionality of the Highport platform had never been reviewed
holistically: no one had asked whether the shared-state model, the AI-provenance pipeline, the
server's trust boundary, or the MGT2E rules layer actually behaved correctly for a real player. The
episode set out to review chargen and its linked features from several different LLM families, plan
the resulting fixes through a debate plus Prometheus/Momus, execute the plans with verified waves, and
then close the integration gap with agentic real-surface QA until every finding was fixed and
independently verified on the running system.

## Work recap per phase

### review
Five review lanes across distinct model families (MiMo, GPT-6.1-Sol, GLM-5.3) audited chargen and its
linked features and produced **26 actionable findings** (6 CRITICAL, 14 MAJOR, 6 MINOR) plus 3
informational observations, each with a file:line receipt. The lanes fact-checked the plan premises
against source and refuted two of them (spawnEntity is covered by three tests; the linksMap caller
count was 8, not 9), and forced-check adjudication downgraded three hypotheses (the Math.random spawn
position is cosmetic, pre-attach Y.Map mutation is safe on yjs 13.6.29, and the strict-mode gate path
is reachable but does not leak).

### planning
A decision-review debate planned the campaign; its critique round fact-checked the proposal against
source and forced one false claim to be retracted, and a revision added the post-merge
edge-reconciliation design the executor needed. Four Prometheus plans were written and reviewed by
Momus: three approved on round 1 (provenance, server authz, MGT2E rules) and one after three rounds
(CRDT cross-character — rejected twice for real defects: an unachievable acceptance test and a
recursive reconcile wiring).

### execution
All four plans were executed and every Final Verification Wave recorded **APPROVE** verdicts in the
plan documents: F1–F4 for the server authz plan, F1–F5 for the provenance plan, F1–F4 for the CRDT
plan, F1–F4 for the MGT2E rules plan. The authz wave included live adversarial curls (header-only
impersonation 401, non-member 403, spoofed header ignored, purpose separation 401) and live WebSocket
handshakes (member authenticated, outsider rejected, unknown campaign rejected without auto-create).

### qa-campaign
An agentic QA campaign executed **21 checks across eight lanes on the running system** (browser plus
live API and WebSocket); all 21 passed. Coverage included concurrent dual-acceptance producing exactly
one edge, session survival across a join, GM draft reject and edit propagating to a second client,
aging losses applied, rank-5 benefit roll count and non-zero DM, a choice-gated event blocking
advance, no literal pipe skill keys, export carrying both provenance shapes, and cross-campaign access
denied. The campaign found **eight product defects that mocked-database unit tests could not see** — an
identity mismatch that hid the GM panel and 403-ed the first accept, a join that wiped the shared
session, a clipped wizard button, an ignored joined session id, compound and and-form mustering
benefits applying nothing, a missing and-grant ledger entry, and a relabel that erased earlier grants
— all fixed, merged, and re-verified. After the fixes: web 382 tests passed, server 141 passed with 37
pre-existing skips, both typechecks clean.

## Learnings TLDR

Five learnings were captured; four are promoted to the runtime knowledge store and one is scoped to
this repository only.

- **Promoted (global):** never run a production build for an app whose dev server is serving it — the
  build overwrites the build output and broke the running dev server mid-campaign.
- **Promoted (global):** a relabel step that filters a whole ledger array by label erases unrelated
  earlier entries; slice at the pre-application lengths and replace only the tail.
- **Promoted (repo):** a read accessor that creates and persists a nested Y.Map can destroy populated
  shared state, because a nested map is one whole-value key and a later client's empty map wins the
  merge. Readers must never write.
- **Promoted (repo):** mocked-database unit tests cannot see integration breaks — the authorization
  gate that closed a real hole also bricked the primary flow for every user, and only a real browser
  with a real token surfaced it.
- **Kept in-repo, not promoted:** untargeted dice cannot be seeded from the page (the QA roll
  interceptor only fires on targeted rolls), so verifying an untargeted roll needs repeated real rolls
  or fabricated state.

## Next steps

### Potential (optional follow-on work)
- Add a two-browser chargen journey to the Playwright suite so the concurrent dual-acceptance race stays
  covered without manual QA lanes.
- Expose stable test hooks on the chargen action buttons, since synthetic ref-clicks do not fire their
  React handlers.

### Mandatory (material gaps carried forward)
- `fu-chargen-1` — Give the RAG service the same principal-derived authorization as the game API; it
  still trusts caller-supplied identity headers.
- `fu-chargen-2` — Reconcile the CRB band values in `packages/mgt2e` against an authoritative rules
  source; they are currently marked "per reviewer".
- `fu-chargen-3` — Confirm the `qa-traveller` category binding (`zai-coding-plan/glm-5.3`) resolves
  after the next OpenCode server reload; the dead `glm-5.2` id blocked that category for the whole
  campaign.

### Residual risks recorded during the episode
- The privileged raw-WebSocket write path is detected by an auditor but not blocked; non-members are
  refused at the membership gate, so it is not reachable by an outsider today.
- The `default` local-play campaign auto-join gives any authenticated user membership in the seeded
  local campaign; cross-campaign isolation is unaffected.
- Two review findings remain informational only: the unseeded spawn position (cosmetic) and the
  pre-attach Y.Map mutation (safe on yjs 13.6.29, pinned).
