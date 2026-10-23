# Lane 02-provenance (code-reviewer, openai/gpt-6.1-sol, bg_8154445c, 4m17s)

lane: 02-provenance
resolved_model: "openai/gpt-6.1-sol"
verdict: FIX-NEEDED (lane-local)
forced_checks:
d: {status: CONFIRMED, tier: INSPECTED, evidence: "export.ts:79 extractNodesFromYDoc explicitly projects fields without provenance; routes at 167-171 and 194-200 map through nodeToFoundryActor whose wire object also omits it. SpawnedEntityRef separately omits derivedFrom. Runtime stripping PROVEN on the export path."}
f: {status: CONFIRMED-REACHABLE / LEAK-REFUTED, tier: INSPECTED, evidence: "Undefined-provenance path IS reachable via legacy string descriptions at TermResolutionStep eventProvenance extraction, but the strict-mode leak is REFUTED on that path (supported backcompat); EntitySpawnForm guards undefined provenance."}
findings:

- id: F02-1
  severity: CRITICAL
  claim: "Graph persistence discards provenance — spawnEntity passes provenance to addNode, but addNode/nodeToYMap/yMapToNode all omit it"
  receipt: "apps/web/lib/yjs-helpers.ts:61"
  verification_status: INSPECTED
  impact: "Spawned AI-authored NPC's graph Y.Map lacks authorship, approval status and derivation → sync/persistence cannot preserve them"
  confidence: HIGH
  fix_sketch: "Preserve provenance in every graph conversion"
- id: F02-2
  severity: CRITICAL
  claim: "Leaving a career resurrects rejected mishap content — handleForcedMusterOut rebuilds provenance from generatedMishapDesc, sets draft/accepted, drops reviewLog"
  receipt: "apps/web/components/chargen/steps/TermResolutionStep.tsx:535"
  verification_status: INSPECTED
  impact: "GM rejects/edits narrative via resolveAIDraft → player clicks Accept Mishap & Leave Career → stale local text overwrites the resolution, restoring draft or accepted status in lenient mode"
  confidence: HIGH
  fix_sketch: "Preserve the authoritative resolved wrapper when completing the term"
- id: F02-3
  severity: MAJOR
  claim: "NPC description bypasses approval through its name — submitDisabled checks only nameProv; submission stamps only name provenance while copying descriptionProv.value"
  receipt: "apps/web/components/chargen/EntitySpawnForm.tsx:241"
  verification_status: INSPECTED
  impact: "Manually named NPC + AI-generated description in strict/moderate mode → pending AI text enters the graph attributed to the player, review requirement dropped"
  confidence: HIGH
  fix_sketch: "Preserve and enforce approval for every submitted AI-authored field"
- id: F02-4
  severity: MAJOR
  claim: "GM edits reveal the old draft as approved text — local generatedDescription refreshes only on character/term identity change"
  receipt: "apps/web/components/chargen/steps/TermResolutionStep.tsx:149"
  verification_status: INSPECTED
  impact: "GM edits strict-mode draft → pendingReviewBy clears → player sees original local draft, not approved replacement"
  confidence: HIGH
  fix_sketch: "Derive resolved display text from authoritative provenance"
- id: F02-5
  severity: MINOR
  claim: "Forced (d): derivation and export metadata omitted — extractNodesFromYDoc projects without provenance; Foundry wire object omits it; SpawnedEntityRef omits derivedFrom"
  receipt: "apps/server/src/routes/export.ts:79,167-171,194-200"
  verification_status: INSPECTED
  impact: "Export loses provenance even when the Y.Map contains it; spawn references lose derivation"
  confidence: HIGH
  fix_sketch: "Preserve derivation in references; define provenance retention in export serialization"

blocking_issues: F02-1, F02-2
