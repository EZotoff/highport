T5 verification

- RED: training + term-resolution-mechanics: exit 1, missing level-0 skills, false pending marker, promotion finished without pending training (3 failures).
- GREEN: `pnpm --filter @highport/web test -- --run training term-resolution-mechanics chargen term-resolution-narrative conscription`: exit 0, 119 tests. Web typecheck exit 0.
- Real React/Yjs entry tests: qualified, Drifter, drafted recruits get service training and level-0 term records; qualified entry proves one transaction. Draft route added because the shared entry rule must not omit conscripts.
- Public service tables include alternatives (Army drive|vaccsuit), so assertions check exactly one valid resolved skill, not the literal expression. Repeated training preserves the already trained alternative and higher skill levels.
- Promotion test proves pending training, age unchanged until one extra roll, record written, then age increases exactly once at 18 and 30. END 8 -> 9 promotion training feeds aging DM 0 (1 END DM minus 1 term), preventing stale-character aging.
- Small finishTerm extension accepts an optional END override solely for training-to-aging re-entry. Forced muster-out helper, narrative derivation, reconcile/authz untouched. No extra roll on commission.
- LSP: existing component unused variables/import/style warnings remain; new summary index-key error fixed. New training helpers/tests have no errors.
- Existing ChapterCard duplicate-skill display keys can warn when two gains repeat a skill; outside this plan's rendering scope. Assertions remain intact.
