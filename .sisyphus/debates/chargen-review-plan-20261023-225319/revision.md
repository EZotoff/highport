# Stage 3: REVISION (Oracle, same session, bg_56049035)

## Change log

```yaml
revisions:
  - {
      addresses_critique: c1,
      block_id: b1,
      change_type: strengthen,
      change: 'Coverage matrix added — OWNED: chargen core+Yjs (oracle), provenance lifecycle (code-reviewer), test blast radius (unspecified-high), adversarial authz/isolation (mephistopheles), MGT2E rules + chargen mechanical flow (deep — NEW binding lane), spawn determinism/atomicity (oracle mandatory). IN at seams: RAG→provenance-in (code-reviewer), server persistence/reconnect/offline resync (oracle), cross-campaign isolation + X-Is-GM/X-Character-Id (mephistopheles). OUT with reason: RAG internals (no chargen write path), Foundry (experimental, no chargen coupling), performance (no requirements), a11y (not chargen-correctness this cycle).',
    }
  - {
      addresses_critique: c2,
      block_id: b2,
      change_type: strengthen,
      change: 'Dispatch-time family verification gate: record resolved category+provider+model per lane BEFORE dispatch; same-family collision between binding lanes → re-route or mark non-compliant. Correction: oracle is read-only WITH file tools — it must read repo files.',
    }
  - {
      addresses_critique: c3,
      block_id: b3,
      change_type: replace,
      change: 'Reviewers RETURN structured findings in final message; ORCHESTRATOR persists to .sisyphus/reviews/chargen-20261023/<angle>.md + ledger.md. Schema adds verification_status ∈ {REPRODUCED(exit-code), INSPECTED, HYPOTHESIS-NOT-RUN}, impact, confidence, repro preconditions, disposition/owner. Command-without-result = HYPOTHESIS-NOT-RUN, never evidence. Ledger binds baseline SHA.',
    }
  - {
      addresses_critique: c4,
      block_id: b4,
      change_type: replace,
      change: 'Unified: ALL binding-lane CRITICALs block until adjudicated (fix or operator waiver); corroboration accelerates triage, never silences. ≥3 unadjudicated MAJORs in one lane → DEGRADED cap. Advisory downgrade removes lane from quorum denominator (floor 3); any downgrade → DEGRADED verdict cap.',
    }
  - {
      addresses_critique: c5,
      block_id: b4,
      change_type: add_fallback,
      change: 'Campaign deadline 90 min. Per-lane 20 min + one 25-min retry preserving ALL mandatory items; partial receipts published before retry. Retry missing mandatory items → DEGRADED. Deadline with <3 binding lanes complete → INCONCLUSIVE + reschedule.',
    }
  - {
      addresses_critique: c6,
      block_id: b5,
      change_type: retract,
      change: 'RETRACTED 4-field-drop claim (schema conflation: SpawnEntityInput.provenance is ProvenanceEntry; node gets full input at entity-spawner.ts:40). Replacement (d): HYPOTHESIS — returned SpawnedEntityRef omits derivedFrom (entity-spawner.ts:81-88); export gap (export.ts:16) needs serializer trace before counting as defect.',
    }
  - {
      addresses_critique: c7,
      block_id: b5,
      change_type: strengthen,
      change: 'All forced checks are HYPOTHESES with named evidence tiers and required adjudication: (b) observer/reconnect divergence test; (e) attached-map round-trip + concurrency trace; (f) caller trace proving strict-mode undefined-provenance reachability; (c) cross-client/replay divergence trace. unwrapAIField bare-value backcompat = supported behavior.',
    }
```

## Revised thesis tree (full)

- **b1 (claim)** Ranked angles: (1) CRDT/sync correctness — Yjs authoritative, Y.Map migration 30e50a5/f099fe2/2f12578 fresh; (2) AIProvenance lifecycle integrity (anti-pattern: never strip provenance); (3) untested blast radius — getCrossCharacterLinksMap (9 callers), spawnEntity (0 tests); (4) spawn determinism/atomicity; (5) adversarial GM-approval/authz/isolation bypass; (6) MGT2E rules fidelity. Coverage matrix per c1 (in/out + reasons).
- **b2 (implementation)** Binding parallel lanes: oracle→CRDT/sync + reconnect/persistence + spawn atomicity (mandatory: b,e); code-reviewer→provenance lifecycle + RAG seam; unspecified-high→test-coverage blast radius; mephistopheles→authz/isolation/strict-mode (X-Is-GM, cross-campaign); deep→MGT2E rules + mechanical flow. Advisory: artistry (flow coherence), quick/low (dedupe only — model floor). explore/librarian recon first (shared call-site map). Dispatch-time family verification gate.
- **b3 (implementation)** Reviewers RETURN findings; orchestrator persists `<angle>.md` + ledger.md bound to baseline SHA. Schema: id, severity (CRITICAL/MAJOR/MINOR/INFO), claim, path:line receipt, verification_status {REPRODUCED(exit-code)|INSPECTED|HYPOTHESIS-NOT-RUN}, impact, confidence H/M/L, repro preconditions, disposition/owner. Merge dedupes + arbitrates severity.
- **b4 (fallback)** Deadline 90 min; per-lane 20 min + one 25-min coverage-preserving retry; partial receipts published pre-retry. Quorum: all remaining binding lanes complete (floor 3); downgraded lanes leave denominator. ALL binding CRITICALs block until adjudicated; corroboration never silences. ≥3 unadjudicated MAJORs/lane → DEGRADED cap. Degraded/downgraded lane → DEGRADED verdict. <3 lanes at deadline → INCONCLUSIVE + reschedule.
- **b5 (risk)** Forced checks — hypotheses with evidence tiers + required adjudication: (a) getCrossCharacterLinksMap state.ts:598 acceptedBy round-trip via yMapToCrossCharacterLink state.ts:606; (b) addEntityToPool outside transact entity-spawner.ts:57-62 → observer/reconnect divergence test; (c) Math.random position entity-spawner.ts:107-114 vs seeded rolls state.ts:106 → cross-client trace; (d) SpawnedEntityRef omits derivedFrom entity-spawner.ts:81-88; export.ts:16 gap needs serializer trace; (e) detached linkMap mutation state.ts:641-642 + resolve race 651-658 → attached round-trip + concurrency trace; (f) strict-mode undefined-provenance→true gm-approval.ts:21 → caller-trace reachability. unwrapAIField bare values (types.ts:95) = supported.

## Oracle postscript (from Stage 1, still standing)

- Non-atomic spawn: graph+pool in two separate transactions.
- Detached Y.Map mutation before attach — repo anti-pattern violation.
- Strict-mode shouldShowDraft returns true when provenance undefined.
