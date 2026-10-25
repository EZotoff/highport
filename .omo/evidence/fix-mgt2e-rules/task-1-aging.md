T1 verification

- `pnpm --filter @highport/mgt2e test -- --run`: exit 0, 20 tests (8 aging boundaries).
- `pnpm --filter @highport/mgt2e build`: exit 0.
- `pnpm --filter @highport/web typecheck`: exit 0.
- Mutation: changed 6+ physicalLosses to 1; aging test exit 1, totals 6 and 12 failed (expected 0, received 1). Reverted mutation.
- No retired tier literals in web; both changed TypeScript files have clean LSP diagnostics.
- CRB bands implemented exactly per reviewer; modifier unchanged.
