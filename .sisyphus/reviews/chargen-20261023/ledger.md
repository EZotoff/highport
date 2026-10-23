# Chargen Review — Consolidated Ledger

Baseline: 22911ea2d489c66a9d94d22e32cbface7d2dbb54
Plan: .sisyphus/debates/chargen-review-plan-20261023-225319/revision.md (ADOPT)
Lanes: 5/5 binding complete. Quorum met. Deadline met (~30 min wall-clock).
Per-lane artifacts: 01-crdt-sync.md, 02-provenance.md, 03-coverage.md, 04-adversarial.md, 05-mgt2e-rules.md (this dir).

## Family-diversity audit (dispatch gate)

| Lane         | Category/agent   | Resolved model     | Family                         |
| ------------ | ---------------- | ------------------ | ------------------------------ |
| 01           | oracle           | mimo/mimo-v2.6-pro | MiMo                           |
| 02           | code-reviewer    | openai/gpt-6.1-sol | OpenAI                         |
| 03           | unspecified-high | glm-5.3 (zai)      | Zhipu                          |
| 04           | mephistopheles   | openai/gpt-6.1-sol | OpenAI ⚠️ collision with 02    |
| 05           | deep             | openai/gpt-6.1-sol | OpenAI ⚠️ collision with 02/04 |
| orchestrator | Sisyphus         | glm-5.3-flash      | Zhipu                          |

**Family gate: NON-COMPLIANT** — 3 of 5 binding lanes resolved to the same family. Plan rule offered re-route or non-compliant marking; retroactive re-route impossible, so marked NON-COMPLIANT honestly. Mitigation: distinct mandates + cross-lane corroboration retained (e.g., F04-3's strict-mode reachability cross-checked by lane 02's forced check f; lane 03's premise corrections fact-checked lanes' assumptions). Distinct families cover the two highest-severity findings: F01-1 (MiMo) and F02-1/F04-x (OpenAI), with premise-audit by Zhipu.

## Consolidated findings (severity-arbitrated; orchestrator disposition: fix-phase-backlog unless noted)

### CRITICAL (6) — all block until fixed or operator-waived

| id    | claim                                                                                                             | receipt                    | status                 | corroborated                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------- | -------------------------------------------- |
| F01-1 | Concurrent dual-acceptance deadlocks cross-char link at 'pending', edge never created, re-accept blocked by guard | state.ts:715-736           | **REPRODUCED(exit=0)** | F03-1 (zero concurrent-accept test coverage) |
| F02-1 | Provenance silently dropped from graph persistence (addNode/nodeToYMap/yMapToNode omit it)                        | yjs-helpers.ts:61          | INSPECTED              | —                                            |
| F02-2 | Forced muster-out resurrects GM-rejected mishap content (stale local text overwrites resolution)                  | TermResolutionStep.tsx:535 | INSPECTED              | —                                            |
| F04-1 | WS JWT not document-scoped — any valid token syncs any campaign doc                                               | hocuspocus.ts:237          | INSPECTED              | —                                            |
| F04-2 | No server authz/validation on Yjs writes — player can delete others' characters, forge acceptedBy/provenance      | hocuspocus.ts:224          | INSPECTED              | —                                            |
| F04-4 | X-User-Id header impersonates campaign owners (read/create/delete campaigns)                                      | campaigns.ts:19            | INSPECTED              | —                                            |

### MAJOR (13)

F01-2 spawn 3-transaction non-atomic write, no reconciler (entity-spawner.ts:57-62 + TermResolutionStep.tsx:326-334) · F01-3 unguarded LWW status race accept vs GM resolve, edge orphaning (state.ts:651-658 vs 730-734) · F02-3 NPC AI description bypasses approval via name-stamping (EntitySpawnForm.tsx:241) · F02-4 player sees stale draft as approved after GM edit (TermResolutionStep.tsx:149) · F03-1 zero coverage of concurrent dual-acceptance (cross-character-proposals.test.tsx single-doc only) · F03-2 generation→Yjs write path untested (30e50a5) · F04-3 GM identity = localStorage vs writable session.createdBy (useGMControls.ts:14) · F04-5 spoofed X-Is-GM on scope/conflict routes (documents.ts:22) · F04-6 knowledge/portrait/export routes lack ownership ACLs (api/index.ts:35) · F05-1 aging table INVERTED vs CRB (aging.ts:25-74) · F05-2 career event effects never resolved (TermResolutionStep.tsx:300-324) · F05-3 no basic/advancement training granted (CareerSelectionStep.tsx:75-103) · F05-4 training treats choice expressions as literal skill IDs → invalid skills (TermResolutionStep.tsx:381-405) · F05-5..F05-8 mustering benefit math errors (rank counted raw, DM=0, string benefits, ungated QA dice globals in production — dice.ts:47-61)

(13 listed as 14 items above — F05-5..F05-8 counted as four: total MAJOR = 14.)

### MINOR (6)

F01-4 systemic pre-attach Y.Map mutation — safe on yjs 13.6.29 prelimContent, AGENTS.md violation, pin yjs · F01-5 duplicate cross-link edges on concurrent finalize (TOCTOU) · F02-5 export/Foundry serialization drops provenance + derivedFrom (export.ts:79,167-200) · F03-3 GMControlPanel bypasses dual-acceptance gate (GMControlPanel.tsx:139-146) · F03-5 hooks.ts has no dedicated tests · F03-2 (see MAJOR)

### INFO (3)

F01-6 Math.random spawn position cosmetic-only (forced check c REFUTED as sync risk) · F03-6 test-count claims accurate · F03-7 mgt2e career tables have invariants tests

## Forced-check adjudication summary

| check                 | verdict                                                                                | evidence tier                    |
| --------------------- | -------------------------------------------------------------------------------------- | -------------------------------- |
| (a) linksMap untested | REFUTED as stated; residual gap = concurrency-only                                     | REPRODUCED (grep + vitest 45/45) |
| (b) non-atomic spawn  | CONFIRMED, upgraded: 3 transactions not 2, await widens gap                            | INSPECTED                        |
| (c) Math.random       | REFUTED (sync-correctness), cosmetic                                                   | INSPECTED                        |
| (d) provenance strip  | CONFIRMED and UPGRADED: runtime drop in yjs-helpers + export path                      | INSPECTED                        |
| (e) detached Y.Map    | SPLIT: pre-attach REFUTED (prelimContent safe); status-race CONFIRMED → F01-1 CRITICAL | REPRODUCED(exit=0)               |
| (f) strict-mode gate  | REACHABLE but leak REFUTED on the found path (legacy backcompat)                       | INSPECTED                        |

## Plan-premise corrections (lane 03)

- "spawnEntity zero tests" — FALSE: 3 integration tests exist (chargen-flow-integration.test.ts:94,123,162).
- "getCrossCharacterLinksMap 9 callers" — actual 8 references / 2 external callers.

## Overall verdict

**REVIEW COMPLETE — 6 CRITICAL, 14 MAJOR, 6 MINOR, 3 INFO. Fix phase required.** The CRITICAL set spans three independent root systems: cross-character CRDT state machine (F01-1), provenance preservation pipeline (F02-1/F02-2), and server-side authorization (F04-1/F04-2/F04-4). MGT2E mechanical fidelity is systemically weak (8 majors) despite existing table invariants tests — the invariants don't cover CRB-conformance.
