T7 verification / implementation handoff

- RED helper test: `pnpm --filter @highport/web test -- --run mustering-benefits`: exit 1, 10 failures because applyCharacteristicBenefit did not exist.
- RED real surface: `pnpm --filter @highport/web test -- --run mustering-benefits-flow`: exit 1, both tests expected INT 8 but got 7 in character and finalized graph metadata.
- GREEN regression sweep: `pnpm --filter @highport/web test -- --run`: exit 0, 49 files / 340 tests, including 12 new characteristic-benefit tests.
- `pnpm --filter @highport/web typecheck`: exit 0.
- `pnpm --filter @highport/mgt2e test -- --run`: exit 0, 23 tests.
- `pnpm --filter @highport/mgt2e build`: exit 0.
- `grep` equivalent scoped search of packages/mgt2e for banned browser globals: zero matches.
- Characteristic helper consumes parseBenefit's reordered `INT +1` shape, preserves numeric-guard semantics for malformed persisted slots, no cap invented. Non-characteristic benefits return null.
- React/Yjs integration proves one transaction for characteristic + benefit ledger + mustering state; remaining rolls are 2 after one of 3 is consumed. Actual createCharacterNode metadata retains INT 8 and the original string.
- LSP run on every changed TypeScript source/test. Existing errors: dice seed assignment expression; wizard scroll-effect dependency; MusteringOutStep pre-existing array-index display key. Other existing unused/style/import-order notices remain. No newly introduced diagnostics errors remain.
- Source size review: all new helpers/tests <250 pure LOC. Warning band: existing types 234, wizard 243, mustering component 238; new mechanical interaction test 209, existing unit suite 201. Existing career/term components remain oversized (446/1467) to honor binding handler-local scope and preserve merged A/B/C seams; no broad refactor attempted.
- Architectural self-review: helpers own individual rule resolutions; no new external input boundary, no new type escapes/dependencies, effect/benefit variant switches exhaustive, shared helpers reused, tests lock each behavior. Numeric guards retained only where explicitly required by plan.
- No dev servers, pushes, merges, branch switches, F1-F4 reviewers, web production build, or browser F3 QA run. Visual acceptance and production bundle inspection remain with orchestrator's reserved final wave; no visual PASS claimed.

Changed implementation/test/docs inventory (plus this plan and seven per-todo receipts):

```text
packages/mgt2e/src/tables/aging.ts
packages/mgt2e/src/tables/dice.ts
packages/mgt2e/__tests__/aging.test.ts
packages/mgt2e/__tests__/dice.test.ts
apps/web/lib/chargen/term-resolution.ts
apps/web/lib/chargen/event-effects.ts
apps/web/lib/chargen/training.ts
apps/web/lib/chargen/mustering.ts
apps/web/lib/chargen/types.ts
apps/web/lib/qa/dice-qa-bridge.ts
apps/web/components/chargen/ChargenWizard.tsx
apps/web/components/chargen/steps/TermResolutionStep.tsx
apps/web/components/chargen/steps/CareerSelectionStep.tsx
apps/web/components/chargen/steps/MusteringOutStep.tsx
apps/web/__tests__/chargen-unit.test.ts
apps/web/__tests__/dice-qa-bridge.test.ts
apps/web/__tests__/event-effects.test.ts
apps/web/__tests__/skill-resolution.test.ts
apps/web/__tests__/term-resolution-mechanics.test.tsx
apps/web/__tests__/training-entry.test.tsx
apps/web/__tests__/training.test.ts
apps/web/__tests__/mustering-benefits.test.ts
apps/web/__tests__/mustering-benefits-flow.test.tsx
docs/qa/charters/B5-mishap-flow.md
docs/qa/charters/G1-rules-integrity.md
docs/qa/scripts/lib/qa-assertions.sh
```
