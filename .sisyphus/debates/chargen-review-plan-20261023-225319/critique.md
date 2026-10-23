# Stage 2: CRITIQUE (Mephistopheles, generous-steelman, bg_cc49681a)

**Strongest form:** Prioritize recently changed shared state and provenance invariants, inspect them through independent lenses, and require source receipts rather than reviewer confidence. Separate lane artifacts reduce write contention; explicit degradation prevents missing reviewers from becoming a clean PASS. Strong foundation for a risk-led review — but assignments and some "verified" hotspots do not yet support their claims.

## Critiques

- **b1 / risk / MAJOR**: Six ranked angles ≠ six owned workstreams: b2 assigns no MGT2E-rules reviewer. Server sync/persistence in scope but no lane has mandatory authz, persistence, reconnect/offline, cross-campaign isolation checks. Add a coverage matrix with explicit inclusion/exclusion of RAG, Foundry, performance, a11y.
- **b2 / assumption / MAJOR**: Agent/category names don't establish distinct LLM families; "one family per angle" asserted, not configured. Only code-reviewer has a model identified. Record actual resolved provider/model/family before dispatch; verify oracle can actually read repo files.
- **b3 / feasibility / MAJOR**: "Each reviewer writes" conflicts with read-only reviewer constraint. Reviewers should RETURN structured output; orchestrator persists. Verification command ≠ evidence it ran: require actual result/exit code or NOT-RUN reason, impact, confidence, repro preconditions, disposition/owner. Otherwise ledger mixes hypotheses with reproduced defects.
- **b4 / risk / MAJOR**: "Any CRITICAL blocks PASS" conflicts with corroboration-required only for mephistopheles. An uncorroborated security finding could vanish precisely because no other lane owns its specialty. Keep unresolved until adjudicated. Specify whether MAJOR blocks PASS and how b5's advisory downgrade changes the 3/4 denominator.
- **b4 / feasibility / MINOR**: 20-min timeout unsupported; one retry permits 40 min after recon; narrowed retries may omit mandatory checks. Define overall deadline, preserved coverage requirements, surface partial receipts before retrying.
- **b5 / evidence / MAJOR**: Provenance claim (d) conflates two schemas. SpawnEntityInput accepts ProvenanceEntry which has derivedFrom but NO value/mode/reviewLog — claiming those are dropped is FALSE. derivedFrom genuinely omitted from returned ref; graph node receives complete input. Export interface lacks provenance but that alone doesn't prove runtime stripping — trace the serializer. Receipts: graph.ts:10-16, entity-spawner.ts:40,81-88.
- **b5 / evidence / MAJOR**: Three forced checks VERIFIED: separate graph/pool transactions (entity-spawner.ts:57-73); linkMap mutated before attach (state.ts:641-658); strict-mode undefined-provenance returns true (gm-approval.ts:21). But observations ≠ established impact: require observer/reconnect tests, attached-map round-trip, caller trace for undefined-provenance path. Legacy bare values explicitly supported.

## Fact-check scorecard

| b5 check                                                | verified                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| (b) non-atomic spawn (addEntityToPool outside transact) | ✅ TRUE                                                           |
| (e) detached linkMap mutation before attach             | ✅ TRUE                                                           |
| (f) strict-mode gate leak on undefined provenance       | ✅ TRUE (impact unproven)                                         |
| (d) 4-field provenance copy claim                       | ⚠️ PARTIALLY FALSE — schema conflation; derivedFrom omission real |
