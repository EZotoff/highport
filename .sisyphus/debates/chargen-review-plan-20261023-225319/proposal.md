# Stage 1: PROPOSAL (Oracle, bg_56049035)

```yaml
blocks:
  - id: b1
    type: claim
    text: >
      Ranked review angles: (1) CRDT/sync correctness — Yjs Y.Map is authoritative shared state and the
      cross-character Y.Map migration (30e50a5, f099fe2, 2f12578) just landed; (2) AIProvenance lifecycle
      integrity — repo anti-pattern "never strip provenance between layers"; (3) untested blast-radius
      symbols — getCrossCharacterLinksMap (9 callers) and spawnEntity have zero tests; (4) spawn
      determinism/atomicity; (5) GM-approval + knowledge-gating adversarial bypass; (6) MGT2E rules fidelity.
    evidence: 'codegraph: spawnEntity entity-spawner.ts:19 / getCrossCharacterLinksMap state.ts:598 — no covering tests; AIProvenance types.ts:70; shouldShowDraft gm-approval.ts:12; brief blast-radius section.'
    tradeoffs: '6 angles costs wall-clock; rank 5-6 are cheap single-pass lanes. Dropping (1) or (2) would skip exactly where recent churn + repo anti-patterns live.'
    risks: 'Angles 1-3 overlap at state.ts; must assign distinct lenses (sync semantics vs type lifecycle vs coverage) or findings duplicate.'

  - id: b2
    type: implementation
    text: >
      Binding lanes (parallel background): oracle→CRDT/sync correctness; code-reviewer→provenance lifecycle +
      type safety; unspecified-high→test-coverage blast radius + regression-gap map; mephistopheles→adversarial
      (GM-approval bypass, strict-mode gate leaks, X-Is-GM trust). Advisory lanes: artistry→narrative/chargen
      flow coherence edge cases; quick/unspecified-low→finding dedupe/triage (advisory ONLY, model floor).
      explore/librarian run first as cheap recon producing a shared call-site map. All 4 binding lanes run
      concurrently; advisory lanes run after wave-1 output lands.
    evidence: 'Brief family list; binding-judge floor excludes quick/unspecified-low from binding weight. oracle is read-only architecture/debugging — matches sync lane; code-reviewer on GPT-6.1-Sol matches quality/security lanes.'
    tradeoffs: 'One family per angle gives true model diversity as required; mephistopheles binding on adversarial lane risks over-reporting → corroboration rule (b4).'
    risks: 'oracle and code-reviewer both read-only: no fix implementation in this phase. Cross-lane double-counting of state.ts findings handled in merge step.'

  - id: b3
    type: implementation
    text: >
      Each reviewer writes .sisyphus/reviews/chargen-20261023/<angle>.md with YAML frontmatter
      (reviewer, family, lane, status) + findings[]: id, severity (CRITICAL/MAJOR/MINOR/INFO), claim,
      receipt (repo-relative path:line — mandatory), repro/verification command, fix sketch.
      Orchestrator merges into ledger.md with dedupe + severity arbitration. Vibes findings rejected at merge.
    evidence: 'Repo verification contract (AGENTS.md): findings must cite file:line. Receipts anchor: entity-spawner.ts:19, state.ts:598/641, gm-approval.ts:12, types.ts:70/95.'
    tradeoffs: 'Markdown-per-lane + one merged ledger beats a shared doc for parallel writes; frontmatter makes ledger machine-checkable.'
    risks: 'Line drift if reviewers edit (forbidden) — read-only enforced; ledger records commit SHA of review baseline.'

  - id: b4
    type: fallback
    text: >
      Per-lane timeout 20min, one retry with narrowed scope. After 2 failures lane = DEGRADED.
      Quorum: verdict needs 3 of 4 binding lanes complete. Advisory lanes never block.
      Any CRITICAL from a binding lane blocks PASS until resolved or operator-waived.
      mephistopheles CRITICALs require one other binding lane's corroboration to escalate.
      If a binding lane is DEGRADED, overall verdict is DEGRADED-{PASS,FAIL} — never clean PASS.
    evidence: 'Budget constraint (parallel background, wall-clock matters); small-category floor means quick/low failure is non-blocking by construction.'
    tradeoffs: '3/4 quorum tolerates one lost lane without stalling; degraded-not-pass keeps honesty.'
    risks: 'Two degraded binding lanes → abort and reschedule rather than issue verdict.'

  - id: b5
    type: risk
    text: 'Mandatory forced checks (concrete, pre-circulated to all lanes):'
    evidence: >
      (a) getCrossCharacterLinksMap state.ts:598 — 9 callers, zero tests; verify acceptedBy nested-map
      round-trip via yMapToCrossCharacterLink state.ts:606. (b) spawnEntity entity-spawner.ts:19 — zero
      tests; addEntityToPool (line 62) runs OUTSIDE doc.transact (lines 57-60) → non-atomic graph+pool write.
      (c) calculateSpawnPosition entity-spawner.ts:107-114 Math.random vs seeded rollInitialCharacteristics
      state.ts:106 — determinism/replay divergence. (d) Provenance stripping: returned SpawnedEntityRef
      copies only 4 provenance fields (entity-spawner.ts:81-88), drops value/mode/derivedFrom/reviewLog;
      server GraphNode (apps/server/src/routes/export.ts:16) has no provenance field.
      (e) Dual-acceptance races: addCrossCharacterLink mutates DETACHED linkMap before attach
      (state.ts:641-642) — violates repo "Do NOT modify Y.Map before attaching"; resolveCrossCharacterLink
      status-set race (state.ts:651-658). (f) Provenance lifecycle: shouldShowDraft strict-mode returns
      true when provenance undefined (gm-approval.ts:21) — gate leak; isCanonical/requiresReview
      (gm-approval.ts:30/41) vs unwrapAIField rejected→undefined (types.ts:95); resolveAIDraft
      state.ts:740 callers in GMControlPanel.
    tradeoffs: 'These are verified hotspots, not hypotheticals — reviewers must adjudicate each as CONFIRMED/FALSE-ALARM/NEW with receipts.'
    risks: '(d) and (e) are the likeliest real bugs; if a lane skips its forced items its output is downgraded to advisory at merge.'
```

## Proposal Notes (extra hotspots Oracle found while grounding)

- `addEntityToPool` outside `doc.transact` in spawnEntity — atomicity gap.
- Detached Y.Map mutation in `addCrossCharacterLink` (state.ts:641-642) — repo anti-pattern.
- Provenance loss in spawnEntity return ref + export.ts GraphNode lacking provenance.
- strict-mode shouldShowDraft returns true when provenance undefined — potential gate leak.
