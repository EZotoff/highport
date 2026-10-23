# Lane 03-coverage (unspecified-high, glm-5.3/zai-coding-plan, bg_74a773e7, 2m46s)

lane: 03-coverage
resolved_model: "glm-5.3 (zai-coding-plan/glm-5.3)"
forced_checks:
a:
status: REFUTED (as claimed) — residual gap CONFIRMED
tier: REPRODUCED (grep enumeration + vitest exit=0)
evidence: "Actual call sites of getCrossCharacterLinksMap: 6 internal (state.ts:624,631,652,662,721) + 2 external callers (hooks.ts:220 useCrossCharacterLinks; GMControlPanel.tsx:136 handleAcceptProposal). '9 callers' overstated; 'zero tests' false — **tests**/cross-character-proposals.test.tsx:42-146 exercises acceptCrossCharacterLink dual-acceptance, yMapToCrossCharacterLink round-trip, and edge creation; GMControlPanel.test.tsx:179 covers GM accept path. 45/45 tests pass (exit 0)."
required_test: "Two synchronized Y.Docs (manual update exchange): char-1 accepts in docA while char-2 accepts same linkId in docB; assert merged acceptedBy nested-map has both keys, status='accepted', exactly one edge after sync. NOT covered — all current tests single-doc sequential; CRDT concurrent dual-acceptance is the remaining gap."
findings:

- id: F03-1
  severity: MAJOR
  claim: "Concurrent dual-acceptance across two synced Y.Docs has zero regression coverage; existing tests single-doc sequential only"
  receipt: "apps/web/**tests**/cross-character-proposals.test.tsx:42-146"
  verification_status: INSPECTED
  impact: "f099fe2/2f12578 dual-accept race (acceptedBy nested-map merge, edge double-create) can regress silently"
  confidence: HIGH
  fix_sketch: "Add two-doc vitest spec exchanging encoded updates; assert acceptedBy merge + single edge"
- id: F03-2
  severity: MAJOR
  claim: "30e50a5 (persist cross-character proposals at generation time) has no test of the generation→Yjs write path; tests only read pre-seeded maps"
  receipt: "apps/web/**tests**/useNarrative.test.ts:204-313; lib/chargen/**tests**/persistence.test.ts covers unrelated persistence"
  verification_status: INSPECTED
  impact: "Regression dropping the generation-time linksMap.set would leave UI empty with all green tests"
  confidence: MEDIUM
  fix_sketch: "Unit test generation callback asserting addCrossCharacterLink called on Yjs write"
- id: F03-3
  severity: MINOR
  claim: "GMControlPanel.handleAcceptProposal bypasses acceptCrossCharacterLink: resolveCrossCharacterLink(accepted=true)+createCrossCharacterLinkEdge directly, skipping dual-acceptance gate"
  receipt: "apps/web/components/chargen/GMControlPanel.tsx:139-146"
  verification_status: INSPECTED
  impact: "Player-to-player mode invariant (both must accept) rests solely on CrossCharacterProposalList.tsx:32; player path only indirectly covered"
  confidence: HIGH
  fix_sketch: "Component test for CrossCharacterProposalList accept invoking acceptCrossCharacterLink"
- id: F03-4
  severity: MINOR
  claim: "Debate-plan premises wrong on two counts: 'spawnEntity (0 tests)' — actually 3 tests at chargen-flow-integration.test.ts:94,123,162; '9 callers' for getCrossCharacterLinksMap — actual 8 refs/2 external callers"
  receipt: "apps/web/**tests**/chargen-flow-integration.test.ts:94"
  verification_status: REPRODUCED(exit=0)
  impact: "Triage based on plan's blast-radius numbers would misprioritize"
  confidence: HIGH
  fix_sketch: "Ledger corrects both premises"
- id: F03-5
  severity: MINOR
  claim: "Blast-radius: state.ts 46 exports bulk-covered (chargen-state.test.ts 33 tests); gm-approval 3 fns covered (chargen-flow-integration:179-234); entity-spawner covered; finalize covered (flow test:247); useNarrative fully covered; hooks.ts useCharacter/useAllCharacters/useSession/useEntityPool/useConnectionRequests/useChargenActions — NO dedicated tests"
  receipt: "apps/web/lib/chargen/hooks.ts:1-245"
  verification_status: INSPECTED
  impact: "hooks.ts observer subscribe/unsubscribe leaks unguarded by direct tests"
  confidence: MEDIUM
  fix_sketch: "renderHook tests for observer cleanup"
- id: F03-6
  severity: INFO
  claim: "apps/web/**tests** 32 files + lib/chargen/**tests** 2; chargen ≈18 files, sampled 45/45 pass exit 0; AGENTS.md '34/241' plausible repo-wide"
  receipt: "apps/web/**tests**/ (listing)"
  verification_status: INSPECTED
  confidence: HIGH
- id: F03-7
  severity: INFO
  claim: "packages/mgt2e HAS career-table coverage: careers-invariants.test.ts, career-flavor.test.ts, draft.test.ts"
  receipt: "packages/mgt2e/**tests**/careers-invariants.test.ts"
  verification_status: INSPECTED
  confidence: HIGH
