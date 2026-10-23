# Lane 01-crdt-sync (oracle, mimo/mimo-v2.6-pro, bg_ddd30094, 12m)

lane: 01-crdt-sync
resolved_model: "mimo/mimo-v2.6-pro"
forced_checks:
b: {status: CONFIRMED, tier: INSPECTED, evidence: "spawnEntity callers: only EntitySpawnForm.tsx:251 → onComplete→TermResolutionStep.tsx:326-334 writes term.spawnedEntities via updateCharacterFields (3rd transact). entity-spawner.ts:57-60 'chargen-spawn' + :62→state.ts:388 'entity-pool-add' are separate top-level transacts → 2 distinct updates; portrait await (EntitySpawnForm.tsx:258-265) widens the gap before update 3. Server persists each update as its own documentUpdates row (hocuspocus.ts:228-238); fetch replays with zero graph↔pool reconciliation (hocuspocus.ts:174-205); no client reconciler (hooks.ts:144-164 observers only re-render). Crash/observer-throw between updates leaves orphan graph node (createdDuringChargen=true, entity-spawner.ts:33) with no pool/term record; nobody repairs it."}
c: {status: REFUTED, tier: INSPECTED, evidence: "calculateSpawnPosition (entity-spawner.ts:107-114) runs once at creation; position is baked into the shared node and synced as data — all clients converge on one value. No replay path recomputes positions (sole caller entity-spawner.ts:29). Seeded rolls (state.ts:106) guard rules-replay, not layout. Cosmetic, not a sync/replay divergence."}
e: {status: CONFIRMED, tier: REPRODUCED, evidence: "Pre-attach sub-hypothesis REFUTED: yjs installed 13.6.29 (apps/web/package.json:41); YMap.\_integrate applies \_prelimContent (yjs.cjs:6062-6067) — linkMap construct+set (state.ts:641-642) round-trips correctly (repro exit 0), so no data loss, only an apps/web/AGENTS.md convention violation. Status-race CONFIRMED (repro exit 0): two docs accepting 'A'/'B' concurrently converge to acceptedBy=['A','B'] but status='pending' and edge never created — bothAccepted (state.ts:722-728) is computed outside the write; guard at :722 blocks re-accept repair. resolveCrossCharacterLink (state.ts:651-658) is an unguarded LWW status write racing accept's status write (state.ts:731); edge from accept (state.ts:732) never rolled back on flip. Hocuspocus: no chargen-specific handling — generic JWT + per-update append (hocuspocus.ts:226-238), store() empty (:213-217), y-indexeddb local persistence (apps/web/lib/sync.ts:33-38) is client-local only."}
findings:

- id: F01-1
  severity: CRITICAL
  claim: "Concurrent dual-acceptance permanently sticks a cross-character link at status='pending' with both acceptors recorded, the graph edge never created, and re-accept blocked by the acceptedBy.has(characterId) early-return"
  receipt: "apps/web/lib/chargen/state.ts:715-736 (guard :722, bothAccepted :723-726, status :731, edge :732)"
  verification_status: REPRODUCED(exit=0)
  impact: "Multi-player chargen is the core scenario; a source+target accepting near-simultaneously silently loses the relationship edge; only resolveCrossCharacterLink (GM, status-only — no edge) can lift 'pending', so the dual-acceptance contract is defeated under concurrency"
  confidence: HIGH
  fix_sketch: "Recompute bothAccepted inside doc.transact from the merged acceptedBy map after the set (or derive status/edge from acceptedBy keys on read); drop the has() early-return as sole repair path; make edge creation idempotent + status derived, not written"
- id: F01-2
  severity: MAJOR
  claim: "spawnEntity is a non-atomic 3-transaction write (graph, entityPool, character.terms) with an await between updates 2 and 3; partial states persist forever with no reconciler"
  receipt: "apps/web/lib/chargen/entity-spawner.ts:57-62; apps/web/components/chargen/steps/TermResolutionStep.tsx:326-334; apps/web/components/chargen/EntitySpawnForm.tsx:258-265"
  verification_status: INSPECTED
  impact: "Crash/tab-kill/observer exception between updates persists orphan graph nodes or node+pool entities invisible to term records/finalize links; server replays updates verbatim (hocuspocus.ts:174-205) so the inconsistency is durable across reconnects"
  confidence: HIGH
  fix_sketch: "Wrap all three writes in one doc.transact (nested transacts merge); defer portrait attach after the atomic block; optional: load-time sweep marking createdDuringChargen nodes lacking pool entries"
- id: F01-3
  severity: MAJOR
  claim: "resolveCrossCharacterLink and acceptCrossCharacterLink race on the status register with no transition guard; a concurrent GM reject can flip a dual-accepted link (and vice versa) without rolling back the created edge"
  receipt: "apps/web/lib/chargen/state.ts:651-658 vs :730-734"
  verification_status: INSPECTED
  impact: "Final status is CRDT LWW arbitration (client clock/clock), not application intent; accepted→rejected flips orphan the already-created edge; deterministic convergence but semantically arbitrary outcome"
  confidence: HIGH
  fix_sketch: "Guard transitions in-transact (read current status inside doc.transact; reject illegal flips) and couple edge create/delete with status writes"
- id: F01-4
  severity: MINOR
  claim: "Systemic pre-attach Y.Map mutation (repo anti-pattern) — safe only via yjs 13.6.29 prelimContent buffering"
  receipt: "apps/web/lib/chargen/state.ts:641-642, :149-156, :389-398; apps/web/lib/chargen/persistence.ts:70-75"
  verification_status: REPRODUCED(exit=0)
  impact: "No data loss on current yjs (13.6.29 YMap.\_integrate applies \_prelimContent), but violates apps/web/AGENTS.md; a Yjs downgrade or reuse of detached maps could silently drop ops; acceptedBy plain-array overwrite path (state.ts:640-642) would silently degrade via state.ts:608 instanceof guard if ordering changed"
  confidence: HIGH
  fix_sketch: "Build entries, attach via set, then mutate inside doc.transact; pin yjs minor"
- id: F01-5
  severity: MINOR
  claim: "Concurrent finalization of both linked characters can create duplicate cross-link edges (check-then-add on a local edge scan is TOCTOU across clients)"
  receipt: "apps/web/lib/chargen/finalize.ts:83-104; apps/web/lib/chargen/state.ts:687-698"
  verification_status: INSPECTED
  impact: "Two parallel edges between the same node pair after simultaneous finalize; cosmetic graph noise, converges"
  confidence: MEDIUM
  fix_sketch: "Deterministic edge id (hash of sorted node pair + relationship) so concurrent creates collapse"
- id: F01-6
  severity: INFO
  claim: "Spawn position uses unseeded Math.random while rules rolls are seeded — cosmetic only"
  receipt: "apps/web/lib/chargen/entity-spawner.ts:107-114 vs apps/web/lib/chargen/state.ts:106"
  verification_status: INSPECTED
  impact: "None for sync/replay: position is creation-time shared data, replicated verbatim; noted only for determinism hygiene"
  confidence: HIGH
  fix_sketch: "Optional: derive position from nodeId hash for replay-stable layout"
