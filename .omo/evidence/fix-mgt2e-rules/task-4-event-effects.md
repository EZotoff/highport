T4 verification

- RED: `pnpm --filter @highport/web test -- --run event-effects`: exit 1, 7 behavioral failures against inert resolver/choice guard (not an import failure).
- GREEN: event-effects + skill-resolution + term-resolution-mechanics + term-resolution-narrative + chargen: exit 0, initially 111 tests; additional real-component DM/skip-auto-pass cases verified before commit.
- Web typecheck exit 0 after representing event availability explicitly in event-choice render.
- Real React/Yjs interaction test proves choices start unselected, Continue disabled, no effect before confirmation, one transaction for chosen effects, and synthetic automatic commission with no dice roll.
- Mechanical flags are persisted in term records, consumed/cleared, and automatic commission transfers to advancement on skip. No edits to narrative derivation, reconcile, authz, forced muster-out, or provenance paths.
- Dot-specialty alternatives resolve through the shared T3 grammar; public skill list resolves the existing `any` event target rather than creating a bogus skill key.
- Navy roll 12 has no choices in current source; choice-gating tests use an actual Navy choice event plus a component fixture combining unconditional/choice effects. Pure deterministic effects return replacement maps; repeating on the same input does not mutate/double-apply.
- New helper/tests LSP clean apart from import-order information. Existing component warnings unchanged.
