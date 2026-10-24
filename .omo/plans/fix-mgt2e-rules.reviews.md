# Momus verdict: fix-mgt2e-rules.md — round 1 (bg_26aae297)

## [OKAY] — APPROVED

All 21 referenced files verified against disk; every cited line range contains the claimed content (aging inversion, ungated window.\_\_qaForceRoll\* block, rollMusteringBenefit(career, 0, highRank), confirmEvent stub, skillsGained: [] term creation, 'drive|flyer' in army.ts, SRD_SKILLS validation). Each todo has a concrete starting point, acceptance criteria, and executable QA scenario. Package names confirmed: @highport/mgt2e / @highport/web (bare --filter mgt2e/web would NOT match — plan uses correct names).

Non-blocking notes:

- T2 acceptance wording self-contradictory (grep packages/ cannot return apps/web file); intent unambiguous via F2 (zero hits in packages/mgt2e).
- T7: parseBenefit returns value 'INT +1' (reordered); helper must consume that shape; stated assertion still holds.
- T3-T5 share TermResolutionStep.tsx with Plans A/B — D-last ordering specified; merge-conflict surface nonzero.
- T5 promotion-training flow reuses skill-phase picker via new flag; finishTerm re-entry path described but unproven against the existing phase machine.

Remaining risks:

- CRB band values unverified against the actual rulebook — marked "CRB per reviewer" with in-code CRB references as diff fallback (satisfies unverified-risk-with-fallback bar).
- load-bearing Yjs-adjacent semantics n/a here; dice interceptor injection must not leak to prod bundles (env-gated).

```yaml
review_ledger:
  plan: .omo/plans/fix-mgt2e-rules.md
  round: 1
  budget: '4+2: round 1/4 standard'
  verdict: OKAY
  findings: []
  disposition: 'Approved for execution'
```
