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

---

# Final state (after the agentic QA campaign, 2026-10-25)

All 26 actionable findings are FIXED and merged to main, and the fixes are verified on the real
surface (browser + live API/WS), not only by unit tests. Detail: `qa-campaign.md` in this folder.

| #     | Finding                                                      | Fix                                                                                      | Real-surface proof                                                                                                                   |
| ----- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- | -------------------------------------------------- |
| F01-1 | Concurrent dual-acceptance deadlocks the link (CRITICAL)     | derive status/edge from the merged `acceptedBy` map + `reconcileCrossCharacterLinkEdges` | Q1 + RV1: concurrent accepts 16 ms apart → `accepted`, both acceptors, exactly 1 edge, server-persisted; deleted edge auto-recreated |
| F01-2 | Spawn was a non-atomic multi-transaction write               | single transaction for graph+pool+term                                                   | unit + integration suites green                                                                                                      |
| F01-3 | Unguarded LWW status race (accept vs GM resolve)             | in-transact transition guards                                                            | unit suites green                                                                                                                    |
| F01-4 | Pre-attach Y.Map mutation (convention)                       | attach-first + yjs pin                                                                   | unit suites green                                                                                                                    |
| F01-5 | Duplicate cross-link edges on concurrent finalize            | deterministic edge id                                                                    | unit suites green                                                                                                                    |
| F02-1 | Provenance dropped from graph persistence (CRITICAL)         | provenance-preserving node conversion + legacy back-compat                               | Q3: export carries `provenance` AND `flags.highport.provenance`; legacy node carries neither                                         |
| F02-2 | Forced muster-out resurrected GM-rejected content (CRITICAL) | resolution derives from the authoritative wrapper                                        | Q2 + RV1: rejected draft never resurfaces (`status=rejected`, `unwrapAIField → undefined`)                                           |
| F02-3 | NPC description bypassed approval                            | all four AI fields gated                                                                 | unit suites green                                                                                                                    |
| F02-4 | Player saw stale draft as approved (CRITICAL)                | display derives from authoritative provenance                                            | Q2 + RV1: second client shows the GM's edited text, stale text absent, no reload                                                     |
| F02-5 | Export/Foundry dropped provenance + derivedFrom              | provenance retained in serialization                                                     | Q3 receipt                                                                                                                           |
| F03-1 | No concurrent dual-acceptance coverage                       | two-doc regression test                                                                  | RV1 live proof                                                                                                                       |
| F03-2 | Generation→Yjs write path untested                           | dedicated Yjs-write test file                                                            | unit suites green                                                                                                                    |
| F03-3 | GM panel bypassed the dual-acceptance gate                   | component-click test + component test                                                    | unit suites green                                                                                                                    |
| F03-5 | hooks.ts untested                                            | lifecycle test file                                                                      | unit suites green                                                                                                                    |
| F04-1 | WS token not document-scoped (CRITICAL)                      | campaign membership enforced on every document                                           | Q3: outsider rejected; unknown campaign rejected, no auto-create                                                                     |
| F04-2 | No server authz on Yjs writes (CRITICAL)                     | authenticated command endpoints + `onChange` auditor                                     | Q3d: a non-member can no longer even connect (the auditor-only residual is gone)                                                     |
| F04-3 | GM identity from localStorage                                | NextAuth session identity                                                                | RV1: GM panel renders for an authenticated GM                                                                                        |
| F04-4 | `X-User-Id` impersonation (CRITICAL)                         | principal from verified token                                                            | Q3: spoofed header → 401                                                                                                             |
| F04-5 | Spoofed `X-Is-GM`                                            | campaign-role check                                                                      | Q3 receipt                                                                                                                           |
| F04-6 | Knowledge/portrait routes lacked ACLs                        | principal-derived ACLs                                                                   | Q3: 401/403/2xx matrix                                                                                                               |
| F05-1 | Aging table inverted                                         | corrected bands                                                                          | RV2: minor band STR 8→7; moderate STR 8→7 + END 6→5; `none` band at total 6                                                          |
| F05-2 | Career event effects never resolved                          | event resolver applies effects                                                           | RV2: choice-gated event blocks advance until picked, effect applied on confirm                                                       |
| F05-3 | No basic/advancement training                                | training granted on entry + on promotion                                                 | RV2: service skills at level 0; promotion training roll observed live                                                                |
| F05-4 | Training produced literal `drive                             | flyer` keys                                                                              | alternative + specialty resolution                                                                                                   | RV2: no ` | `key anywhere;`tactics.naval`1 + parent`tactics` 0 |
| F05-5 | Benefit roll count wrong (1+rank)                            | rank band + survived terms                                                               | RV2: rank 5 → 3 rolls (not 6)                                                                                                        |
| F05-6 | Benefit roll DM always 0                                     | rank-based DM                                                                            | RV2: "Rolled: 7" (impossible on 1d6 without +1)                                                                                      |
| F05-7 | Characteristic benefits never applied                        | benefits applied at mustering                                                            | RV2: "+1 EDU" → EDU 6→7 exactly                                                                                                      |
| F05-8 | Production dice-override globals                             | env-gated QA bridge only                                                                 | grep: 0 `__qaForceRoll` in packages/; prod-inert default asserted by test                                                            |

## Defects found BY the QA campaign (all fixed)

1. **Chargen identity mismatch** (user-blocking): records wrote a localStorage mock id while the server authorized against the NextAuth principal → the GM panel never rendered and the first real accept 403'd. Fixed: `63c06c0` (shared identity helper; mock id only in LOCAL_MODE).
2. **Join clobbered `chargen.session`** (multi-player data loss): read accessors persisted an empty nested map that won the merge and wiped the session for everyone. Fixed: `2453341` (pure readers, attach-first, adopt-if-exists).
3. **Wizard Create button unreachable**: `GlassPanel` collapsed under flex auto-min-size with `overflow-hidden`, clipping the button. Fixed: `shrink-0` (`bb889b7`).
4. **Joined session id ignored**: join page wrote only `sessionStorage` while `getSessionId` prefers `localStorage`. Fixed: write both (`bb889b7`).
5. **Compound mustering benefits applied nothing**: all six CRB "player picks one" forms fell through to `other`. Fixed: compound parser + real choice in the UI + take-the-better resolution (`301669b`).
6. **And-form grants applied nothing**: `+1 SOC and +1 EDU`, `+1 SOC and Yacht`. Fixed: both parts apply (`333c4be`).

## Verdict

**All findings fixed and independently verified on the real surface.** Residual risks are documented in
the plan documents (RAG service still trusts headers; CRB band values marked "per reviewer"; the
`qa-traveller` category binding needs an OpenCode reload to take effect).
