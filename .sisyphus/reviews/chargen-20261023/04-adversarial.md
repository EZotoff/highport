# Lane 04-adversarial (mephistopheles, openai/gpt-6.1-sol, bg_e0e5296a, 3m29s)

lane: 04-adversarial
resolved_model: "openai/gpt-6.1-sol"
context: "JWT signature/expiry checks present. Weak trust boundaries: WS auth ignores document name; chargen GM status from local identity + writable shared state; REST routes trust caller-supplied headers."
findings:

- id: F04-1
  severity: CRITICAL
  claim: "Valid WS JWTs are not campaign/document-scoped; authentication ignores documentName"
  receipt: "apps/server/src/ws/hocuspocus.ts:237"
  verification_status: INSPECTED
  exploit_scenario: "Registered player reuses their signed token for another campaign's graph document; fetch and update persistence have no membership check"
  confidence: HIGH
  mitigation: "Authorize document membership and access level before synchronization"
- id: F04-2
  severity: CRITICAL
  claim: "Shared Yjs writes have no server authorization or semantic validation"
  receipt: "apps/server/src/ws/hocuspocus.ts:224"
  verification_status: INSPECTED
  exploit_scenario: "Connected player deletes others' characters, sets both acceptedBy keys, forges accepted provenance, fabricates approved requests/claimedBy. Client helpers require no authenticated actor"
  confidence: HIGH
  mitigation: "Move privileged mutations behind authenticated commands; reject unauthorized CRDT updates before application"
- id: F04-3
  severity: MAJOR
  claim: "Chargen GM identity is localStorage userId compared with writable session.createdBy, not JWT identity"
  receipt: "apps/web/lib/chargen/useGMControls.ts:14"
  verification_status: INSPECTED
  exploit_scenario: "Set highport_user.userId to shared createdBy and reload: GM UI/drafts unlock. resolveAIDraft accepts no actor and records by=gm. Strict undefined-provenance path reachable via TermResolutionStep:927 for bare/missing fields; bare legacy text alone is not proof of an AI leak (f partially refuted)"
  confidence: HIGH
  mitigation: "Derive campaign roles server-side; enforce review transitions there"
- id: F04-4
  severity: CRITICAL
  claim: "X-User-Id impersonates campaign owners: GET/POST /api/campaigns; GET/DELETE /api/campaigns/:id"
  receipt: "apps/server/src/routes/campaigns.ts:19"
  verification_status: INSPECTED
  exploit_scenario: "Supply victim owner ID to enumerate/read/delete campaigns or create under their identity"
  confidence: HIGH
  mitigation: "Replace header identity with verified principal"
- id: F04-5
  severity: MAJOR
  claim: "Spoofed X-Is-GM authorizes PATCH /api/documents/:sourceId/scope and GET /api/conflicts, POST /api/conflicts/:id/resolve, DELETE /api/conflicts/:id"
  receipt: "apps/server/src/routes/documents.ts:22"
  verification_status: INSPECTED
  exploit_scenario: "header=true → publicize restricted documents, resolve/dismiss global conflicts; X-User-Id forges attribution"
  confidence: HIGH
  mitigation: "Authenticate and verify campaign GM role"
- id: F04-6
  severity: MAJOR
  claim: "Knowledge grants/scope trust supplied user/character/GM; REST reads and portrait writes lack ownership checks"
  receipt: "apps/server/src/api/index.ts:35"
  verification_status: INSPECTED
  exploit_scenario: "POST knowledge/grant; GET knowledge/:characterId, knowledge/scope, doc/:campaignId/:docType, documents/:sourceId, conflicts/:id, export/{actors,json}, portraits/{search,:portraitId/image}; POST portraits/{generate,:portraitId/remix}, nodes/:nodeId/portrait. Forge headers/IDs to grant secrets, dump campaign state, generate/remix portraits"
  confidence: HIGH
  mitigation: "Apply principal-derived campaign and object ACLs to every listed route"
