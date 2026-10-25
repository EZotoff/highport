T3 verification

- RED: `pnpm --filter @highport/web test -- --run skill-resolution`: exit 1, four failures because resolveSkillTableEntry did not exist.
- GREEN: `pnpm --filter @highport/web test -- --run skill-resolution chargen term-resolution-narrative conscription`: exit 0, 109 tests.
- `pnpm --filter @highport/web typecheck`: exit 0.
- Alternatives resolve via public getSkill/rollDie, specialty grants parent 0, characteristic parser preserved, unknown candidates throw a typed data error.
- LSP: no errors in three changed source/test files; existing component unused mishap variables/import-order/style notices remain.
- Existing oversized component retained to honor binding mechanical-handler-only scope; pure resolution extracted to the existing 90-line mechanical helper, no authz, reconcile, narrative derivation, or muster-out handler changes.
