T6 verification

- RED: `pnpm --filter @highport/web test -- --run chargen-unit`: exit 1, 13 failures (rank-5 old 9 vs expected 5; rank-6/four survived old 11 vs expected 7; failed terms old 11 vs expected 5; DM absent/zero).
- GREEN: `pnpm --filter @highport/web test -- --run chargen`: exit 0, 105 tests, including 21 chargen-unit.
- Web typecheck exit 0. LSP: no errors, pre-existing mustering unused-import/radix/style notices only.
- Real seeded dice (no mock): seed 30 rolls 6, rank-5 DM makes 7 and reaches Navy row 7; seed 7 rolls 1, DM makes 2. High-rank alternate preserved.
- Read MusteringOutStep: rollsRemaining = corrected totalRolls - (persisted rollsUsed, otherwise local collected length); no double subtraction. Cash DM, MAX_CASH_ROLLS, parser unchanged.
- CRB bands documented as per-reviewer, no invented cap.
