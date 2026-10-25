# Plan: Fix Server-Side Authorization (Plan C — F04-1…F04-6)

Source: `.sisyphus/reviews/chargen-20261023/04-adversarial.md` + `ledger.md` (baseline `22911ea`).
Scope: ONLY the six F04 findings. F01/F02/F03/F05 lanes are out of scope.

## Problem

The server trusts client-supplied identity (`X-User-Id`, `X-Is-GM`, `X-Character-Id` headers, writable Yjs `session.createdBy` compared against localStorage), and the WebSocket layer authenticates JWTs but never authorizes them against the document being synced. Any registered player can: sync any campaign's documents (F04-1), forge privileged Yjs state (`acceptedBy`, `AIProvenance`, delete others' characters) (F04-2), unlock GM UI by editing localStorage (F04-3), impersonate campaign owners on REST (F04-4), publicize documents / resolve conflicts with a spoofed header (F04-5), and dump or mutate knowledge/portrait/export resources with no ownership ACL (F04-6).

## Target architecture (4 waves, strictly sequenced)

1. **Wave 1 — Principal model.** JWT-derived identity replaces header trust on every Fastify route. A shared HS256 secret already exists (web `apps/web/auth.ts` signs `hocuspocusToken`; server `apps/server/src/ws/hocuspocus.ts` verifies it). Extend the same scheme with an `api`-purpose token carried as `Authorization: Bearer`.
2. **Wave 2 — Campaign-membership authorization for WS document access.** New `campaign_members` table; Hocuspocus hooks authorize `documentName` (`campaignId:docType`) before fetch/persist.
3. **Wave 3 — Privileged-mutation gating for Yjs writes.** Authenticated server command endpoints for destructive/privileged mutations (F04-2), plus a server-side audit/reconcile hook. Rationale for enforcement point in W3-T1.
4. **Wave 4 — Route-by-route ACL conversion** (campaigns, documents/scope, conflicts, knowledge, portraits, export, `/api/doc`) and the web-side GM-identity fix (F04-3).

## F04-2 enforcement point — decision (required by brief)

Two candidate enforcement points were evaluated:

- **(a) `beforeApply`/`onUpdate` server-side inspection of update payloads.** Hocuspocus receives opaque Yjs binary updates. Decoding them in `onUpdate` (apply to a scratch Y.Doc, diff privileged keys) can _detect_ a forbidden write, but **cannot reliably reject it**: by the time `onChange`/`onUpdate` fires, Hocuspocus has already applied and broadcast the update to all peers, and Yjs CRDT semantics mean the malicious state is durable in every replica and in `document_updates` persistence. Reconstructing per-client attribution from merged updates is also unreliable. Rejecting here would require an upstream protocol change (pre-apply veto in the provider ↔ server sync step) — a full protocol redesign.
- **(b) Authenticated server-command pattern (CHOSEN).** Move privileged mutations (delete character, `resolveAIDraft`, dual-acceptance status flips, GM session settings) behind authenticated, role-checked Fastify endpoints that mutate the Y.Doc **server-side** (load state from DB, apply a transaction, persist a normal update row). Clients keep read/free-write for non-privileged keys and sync via CRDT as today. Pragmatic phasing:
  - **Phase 1 (W2):** membership authz on WS stops all cross-campaign access — the highest-severity exploit class (outsiders) is closed without any protocol change.
  - **Phase 2 (W3):** privileged command endpoints + UI switch; `onUpdate` demoted to an **auditor** (scratch-doc diff of `acceptedBy`/provenance keys → structured log + `privilege_violations` record), with a reconciler as an explicit follow-up, NOT in this plan's scope.

Justification: (b) achieves real enforcement of every privileged flow with existing CRDT infrastructure; residual risk (a malicious _campaign member_ can still hand-craft a raw WS update touching privileged keys) is documented, logged by the auditor, and acceptable for the local-play threat model. This residual risk and the reconciler are recorded in Must-NOT-Have / Residual risks below.

## Key files

| File                                                                                   | Role in this plan                                                                                                                             |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/lib/principal.ts`                                                     | NEW — JWT verify (purpose `api`), `requirePrincipal` Fastify preHandler                                                                       |
| `apps/server/src/lib/authz.ts`                                                         | NEW — membership helpers: `getMembership`, `requireCampaignRole`, `authorizeDocument(documentName, userId)`                                   |
| `apps/server/src/db/schema.ts`                                                         | + `campaign_members` table                                                                                                                    |
| `apps/web/auth.ts`                                                                     | + `apiToken` (purpose `api`) in session callback                                                                                              |
| `apps/web/lib/api-client.ts`                                                           | NEW — fetch wrapper attaching Bearer token                                                                                                    |
| `apps/server/src/ws/hocuspocus.ts`                                                     | onAuthenticate/onConnect authz; `onUpdate` auditor                                                                                            |
| `apps/server/src/routes/chargen-commands.ts`                                           | NEW — privileged mutation endpoints                                                                                                           |
| `apps/server/src/routes/{campaigns,documents,conflicts,knowledge,portraits,export}.ts` | ACL conversion                                                                                                                                |
| `apps/server/src/api/index.ts`                                                         | `/api/doc/:campaignId/:docType` ACL; register new routes                                                                                      |
| `apps/web/lib/chargen/useGMControls.ts`                                                | F04-3 identity fix                                                                                                                            |
| `apps/server/__tests__/authz.test.ts`, `chargen-commands.test.ts`, `principal.test.ts` | NEW test files (pattern: `__tests__/conflicts-routes.test.ts` — `vi.mock('../src/db/client.js')`, local Fastify instance, `fastify.inject()`) |

## Assumptions (non-blocking defaults adopted)

- One shared HS256 secret (`AUTH_SECRET` / `HOCLUSPOCUS_JWT_SECRET`) continues to serve both token purposes; `purpose` claim distinguishes `hocuspocus` vs `api` tokens. API token TTL = 12h.
- Roles: `gm` | `player` in `campaign_members`. Campaign `ownerId` is auto-inserted as `gm`. A campaign has at least one GM; chargen-session "GM" (session.createdBy) maps to the campaign-owner GM until chargen sessions gain their own membership table (out of scope — recorded as follow-up).
- `DEFAULT_CAMPAIGN_ID` (`campaign_default`) legacy behavior: documents are auto-created only under **existing** campaigns; auto-creating campaigns from arbitrary doc names is removed. The `default` campaign used by graph views without a campaign context is created by migration/seed, not by client doc names.
- Knowledge per-character identity: `X-Character-Id` is replaced by server-side resolution — a character is owned by the user whose principal owns the corresponding chargen entity (resolved via campaign membership + GM override for scope decisions). Where a character→user mapping does not yet exist in DB, GM role gates `char:<id>` grants (documented residual limitation, follow-up recorded).
- WS integration testing stays at the unit level (extracted pure `authorizeDocument` + mocked db), matching the repo's existing mock-heavy pattern; a live WS handshake test is manual verification.

## Todos

### Wave 1 — Principal model (F04-4 foundation, F04-5/F04-6 foundation)

- [ ] 1. Create `apps/server/src/lib/principal.ts` with `verifyApiJwt()` (HS256, timing-safe, mirrors `verifyHocuspocusJwt` in `apps/server/src/ws/hocuspocus.ts:105` but requires `purpose === 'api'`) and a Fastify plugin `requirePrincipal` that reads `Authorization: Bearer <token>`, verifies it, decorates `request.principal = { userId, email }`, replies 401 `{ error: 'Authentication required' }` on failure. Secret resolution identical to `getHocuspocusJwtSecret()`. — Verify: `pnpm --filter server typecheck` exit 0. Done: unit-testable exports exist; no header reads for identity anywhere new.
- [ ] 2. Add `apiToken` to the NextAuth session in `apps/web/auth.ts`: in the `session` callback, sign a second JWT (`purpose: 'api'`, `exp` now + 12h, same `sub`/email/name) via the existing `signHocuspocusJwt` generalized to take a purpose+TTL; declare `apiToken?: string` on the Session interface. — Verify: `pnpm --filter web typecheck` exit 0. Done: `useSession()` exposes `apiToken`.
- [ ] 3. Create `apps/web/lib/api-client.ts`: `apiFetch(input, init)` that resolves the session (`getSession()` from `next-auth/react`), attaches `Authorization: Bearer`, and strips any `X-User-Id`/`X-Is-GM`/`X-Character-Id` headers. Do NOT convert call sites yet (Wave 4 does that per route). — Verify: `pnpm --filter web typecheck` exit 0. Done: wrapper exported; no header-based identity emitted by it.
- [ ] 4. Write `apps/server/__tests__/principal.test.ts` (pattern: `__tests__/conflicts-routes.test.ts`): (a) request without Authorization → 401; (b) garbage/expired/wrong-purpose (`hocuspocus`) token → 401; (c) valid `api` token → handler sees `request.principal.userId`. Sign test tokens with the same HS256 construction as `apps/web/auth.ts`. — Verify: `docker compose up -d && pnpm --filter server test -- principal` pass. Done: 3 cases green.

### Wave 2 — Membership model + WS document authorization (F04-1)

- [ ] 5. Add `campaign_members` to `apps/server/src/db/schema.ts`: `{ campaignId (FK campaigns.id), userId (varchar 64), role ('gm'|'player', varchar 20, check), joinedAt }`, primary key `(campaignId, userId)`; run `pnpm --filter server db:generate` then `pnpm --filter server db:migrate`. Seed migration also inserts the `default` campaign row. — Verify: `pnpm --filter server db:migrate` exit 0 against dockerized Postgres. Done: table exists, migration committed.
- [ ] 6. Create `apps/server/src/lib/authz.ts`: `getMembership(campaignId, userId)` → `null | {role}`; `requireCampaignRole(campaignId, userId, roles)` (throws `AuthorizationError`); `authorizeDocument(documentName, userId)` — parses `campaignId:docType` (fallback `campaign_default` for bare names, matching `ensureDocumentExists` at `hocuspocus.ts:144`), returns the campaignId after `requireCampaignRole(campaignId, userId, ['gm','player'])`. — Verify: `pnpm --filter server typecheck` exit 0. Done: helpers exported, no direct db access outside them for membership.
- [ ] 7. Wire WS authorization in `apps/server/src/ws/hocuspocus.ts`: `onAuthenticate` returns `{ userId, email }` (unchanged verify, keep `purpose === 'hocuspocus'`); add authorization by using the Hocuspocus `onConnect`/`fetch` path to call `authorizeDocument(documentName, context.userId)` and throw `HocuspocusAuthenticationError` on failure — apply it in `onAuthenticate` where `documentName` is available on the connection argument (Hocuspocus passes `documentName` to `onAuthenticate`), falling back to `onConnect` re-check. Change `ensureDocumentExists` to insert only the `documents` row and only when the campaign row exists (no campaign auto-creation except the seeded `default`). — Verify: `pnpm --filter server typecheck && pnpm --filter server build` exit 0. Done: non-members cannot load or persist any document.
- [ ] 8. GM-side member management: extend `apps/server/src/routes/campaigns.ts` with `POST /api/campaigns/:id/members` `{ userId, role }` (GM or owner only) and `GET /api/campaigns/:id/members`; `POST /api/campaigns` auto-inserts owner as `gm` in `campaign_members`. — Verify: `pnpm --filter server typecheck` exit 0. Done: membership can be provisioned through the API.
- [ ] 9. Write `apps/server/__tests__/authz.test.ts`: (a) `authorizeDocument('campA:graph', memberUser)` resolves; (b) non-member throws; (c) `authorizeDocument('otherCamp:graph', memberOfCampA)` throws; (d) `ensureDocumentExists` does not create a campaign row for an unknown campaignId (mocked db asserts insert calls). This is the F04-1 regression test (see Threat-model table). — Verify: `docker compose up -d && pnpm --filter server test -- authz` pass. Done: 4 cases green.

### Wave 3 — Privileged-mutation gating (F04-2)

- [ ] 10. Create `apps/server/src/routes/chargen-commands.ts` mounted in `apps/server/src/api/index.ts` with `requirePrincipal` on every route; each route re-loads the Y.Doc server-side (`fetchDocumentState` from `hocuspocus.ts`), applies the mutation in a `Y.Doc` transaction with `origin = 'server-command'`, and persists via a `documentUpdates` insert: `DELETE /api/chargen/:campaignId/:sessionId/characters/:characterId` (caller is GM, or the character's owning player); `POST .../drafts/:proposalId/resolve` `{ decision: 'accepted'|'rejected'|'edited', edits? }` (GM only — writes provenance `reviewedBy/by` from `request.principal.userId`); `POST .../links/:linkId/accept` (caller must be one of the two link parties — dual-acceptance status flips); `POST .../session/settings` (GM only). All write `by = principal.userId`, never client-supplied. — Verify: `pnpm --filter server typecheck && pnpm --filter server build` exit 0. Done: every privileged mutation reachable only via an authenticated, role-checked endpoint.
- [ ] 11. Add the `onUpdate` auditor in `apps/server/src/ws/hocuspocus.ts`: apply `update` to a scratch doc loaded from current state; if the diff touches `acceptedBy`, `provenance`/`AIProvenance` fields, or deletes a key under `characters` with an origin other than `'server-command'`, log a structured pino warning with documentName + key paths. Detection-only (see F04-2 decision). — Verify: `pnpm --filter server typecheck` exit 0. Done: violations observable in server logs.
- [ ] 12. Switch web privileged flows to the command endpoints: in `apps/web/lib/chargen/state.ts` callers — `resolveAIDraft` (used by `components/chargen/steps/TermResolutionStep.tsx` and GM panels), character deletion, and cross-character accept UI — call `apiFetch` command routes instead of writing Yjs directly when authenticated; keep the direct Yjs path only as the unauthenticated/local fallback behind an explicit `LOCAL_MODE` flag defaulting to server commands when a session exists. — Verify: `pnpm --filter web typecheck && pnpm --filter web test` exit 0 (update affected chargen tests). Done: no privileged write path from an authenticated client bypasses the server.
- [ ] 13. Write `apps/server/__tests__/chargen-commands.test.ts`: (a) resolve endpoint without token → 401; (b) player calling GM-only resolve → 403; (c) player A deleting player B's character → 403; (d) link accept by non-party user → 403; (e) happy-path resolve writes `by = principal userId` into the persisted update (scratch-doc assert). F04-2 regression test. — Verify: `docker compose up -d && pnpm --filter server test -- chargen-commands` pass. Done: 5 cases green.

### Wave 4 — Route-by-route ACL conversion + web GM identity

- [ ] 14. Convert `apps/server/src/routes/campaigns.ts` (F04-4): delete `getUserId()` header reader; add `requirePrincipal` preHandler to all four routes; replace `userId` source with `request.principal.userId`. — Verify: `pnpm --filter server typecheck` exit 0. Done: no `X-User-Id` read remains in the file.
- [ ] 15. Convert `apps/server/src/routes/documents.ts` (F04-5): `PATCH /api/documents/:sourceId/scope` — `requirePrincipal`, resolve `ingestedDocuments.campaignId`, GM role via `requireCampaignRole`; `GET /api/documents/:sourceId` — `requirePrincipal` + campaign membership (any role). — Verify: typecheck 0. Done: no `X-Is-GM` read.
- [ ] 16. Convert `apps/server/src/routes/conflicts.ts` (F04-5, header reads at lines 20, 76–77, 136–137): `requirePrincipal` on all routes; GM checks via campaign membership resolved from the conflict's campaign; `resolvedBy`/attribution from `request.principal.userId`. — Verify: typecheck 0. Done: no `X-Is-GM`/`X-User-Id` reads.
- [ ] 17. Convert `apps/server/src/routes/knowledge.ts` (F04-6, header reads at 20, 56–58): `requirePrincipal`; `POST /api/knowledge/grant` — GM or owning player; list/scope reads — campaign membership, `char:<id>` scope rows only for GM or the character's owner (see Assumptions limitation). — Verify: typecheck 0. Done: no identity headers read.
- [ ] 18. Convert `apps/server/src/routes/portraits.ts` (F04-6, header reads at 59, 166, 207): `requirePrincipal`; generate/remix — campaign member; read/image — campaign member; `createdByUserId` from principal. — Verify: typecheck 0. Done: conversion complete.
- [ ] 19. Convert `apps/server/src/routes/export.ts` and `/api/doc/:campaignId/:docType` in `apps/server/src/api/index.ts:33` (F04-6): `requirePrincipal` + `authorizeDocument`/`requireCampaignRole` (export: GM only; doc fetch: any member). — Verify: typecheck 0. Done: no unauthenticated doc/export read.
- [ ] 20. Web call-site conversion: replace `X-User-Id`/`X-Is-GM` headers with `apiFetch` in `apps/web/app/campaigns/page.tsx` (36, 58), `app/campaigns/new/page.tsx` (39), `app/campaigns/[id]/page.tsx` (35), `lib/portrait/usePortrait.ts` (75, 120, 179), `lib/rag-client.ts` (26–28), `lib/chargen/narrative.ts` (267, 398), `components/portrait/PortraitLibrary.tsx` (152). For `rag-client.ts`/`narrative.ts` (SSE to RAG service), send the Bearer token in the `Authorization` header instead of spoofable headers; RAG-service-side enforcement is a follow-up (not Plan C scope) — note it in the handoff. — Verify: `pnpm --filter web typecheck && pnpm --filter web test` exit 0 (update `__tests__/narrative.test.ts` expectations). Done: `grep -ri 'x-user-id\|x-is-gm\|x-character-id' apps/web --include='*.ts*'` returns no production-code matches (tests excluded).
- [ ] 21. Fix F04-3 in `apps/web/lib/chargen/useGMControls.ts`: `useGMControls` receives `currentUserId` from the NextAuth session (`useSession().user.id`), not the localStorage `highport_user` identity; `isGM` is explicitly documented as UX-only (server command endpoints enforce authority). Update the component that mounts `useGMControls` to pass the session id; remove any `getSessionUserId()`-from-localStorage dependency on this path. — Verify: `pnpm --filter web typecheck && pnpm --filter web test` exit 0. Done: GM gate derives from JWT-backed session identity; localStorage cannot unlock GM UI.
- [ ] 22. Write `apps/server/__tests__/routes-authz.test.ts` — the F04-4/F04-5/F04-6 regression suite (pattern: `conflicts-routes.test.ts` mock style, one describe per route family): campaigns (no header honored — request with ONLY `X-User-Id` and no token → 401; valid token of non-owner → 404 on GET/DELETE of another's campaign); documents scope (valid non-GM token → 403; spoofed `X-Is-GM: true` ignored → 403); conflicts/knowledge/portraits/export/`/api/doc` (no token → 401; non-member token → 403/404). Exact case list in Threat-model regression below. — Verify: `docker compose up -d && pnpm --filter server test -- routes-authz` pass. Done: all cases green.

## Threat-model regression (each exploit scenario → named test)

| Finding | Exploit scenario (lane artifact)                                                 | Catching test (added above)                                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F04-1   | Signed token reused for another campaign's graph doc                             | authz.test.ts (9c) `authorizeDocument` cross-campaign throw + (9d) no campaign auto-create                                                                                       |
| F04-2   | Player deletes others' characters, sets both `acceptedBy`, forges provenance     | chargen-commands.test.ts (13c, 13d, 13e) + auditor in W3-T11                                                                                                                     |
| F04-3   | Set `highport_user.userId` = shared `createdBy`, reload → GM UI unlocks          | Wave 4 T21: web vitest asserting `isGM` is false when localStorage identity ≠ session identity, and session identity is the only input (add case to existing chargen hook tests) |
| F04-4   | Victim owner ID in `X-User-Id` enumerates/deletes campaigns                      | routes-authz.test.ts (22, campaigns block): header-only request → 401; non-owner token → 404                                                                                     |
| F04-5   | `X-Is-GM: true` publicizes restricted docs, resolves/dismisses conflicts         | routes-authz.test.ts (22, documents+conflicts blocks): spoofed header with valid non-GM token → 403                                                                              |
| F04-6   | Forged headers/IDs: grant secrets, dump campaign state, generate/remix portraits | routes-authz.test.ts (22, knowledge/portraits/export/`/api/doc` blocks): no token → 401, non-member → 403/404                                                                    |

## Must-NOT-Have (scope guardrails)

- No Yjs protocol/provider redesign, no pre-apply update veto, no per-key CRDT ACL engine.
- No RAG-service (Python) auth changes — its header trust is a recorded follow-up, not Plan C.
- No reconciler job that reverts malicious CRDT writes (auditor is detection-only this plan).
- No chargen-session membership table; campaign GM role proxies for chargen GM.
- No F01/F02/F03/F05 findings touched, even where adjacent (e.g. provenance-stripping bugs are lane 02's).

## Residual risks (documented, accepted for this plan)

1. A malicious campaign **member** can still craft raw WS updates touching privileged keys (F04-2 phase-2 residual) — detected by the auditor, not blocked.
2. `char:<id>` knowledge scopes gated by GM role, not per-character ownership, until a character→user mapping exists.
3. RAG service still trusts headers on the direct SSE path.

## Final verification wave

Environment gate first: `docker compose up -d` (PostgreSQL 18123) — required by `apps/server/AGENTS.md`.

- [ ] F1. Static + unit gates: `pnpm --filter server typecheck && pnpm --filter server build && docker compose up -d && pnpm --filter server test` — all exit 0, all new test files (`principal`, `authz`, `chargen-commands`, `routes-authz`) green, zero pre-existing regressions.
- [ ] F2. Web gates: `pnpm --filter web typecheck && pnpm --filter web test` — exit 0; plus `grep -ri 'x-user-id\|x-is-gm\|x-character-id' apps/web/lib apps/web/app apps/web/components` returns no production matches.
- [ ] F3. Manual curl adversarial spot-checks against running server (`pnpm --filter server dev`, port 18122): (a) `GET /api/campaigns` with `X-User-Id: victim` and no token → 401; (b) valid non-member `api` token → `GET /api/doc/<campId>/graph` → 403; (c) `PATCH /api/documents/:id/scope` with valid player token + `X-Is-GM: true` → 403; (d) `POST /api/knowledge/grant` no token → 401; (e) valid GM token happy path → 200. Record outputs in `.sisyphus/evidence/authz-curl.md`.
- [ ] F4. WS check: connect to `ws://localhost:18121` for doc `<campB>:graph` using a member-of-`campA` hocuspocus token → connection rejected (no sync); member token for own campaign → sync handshake completes. Record in the same evidence file.

## Execution Record

Execution baseline: 0fe8d9064e54e2932831d8b1e65e355915312b0b (branch agent/sisyphus/chargen-fix-c)

<!-- F-box verdicts are appended here by the orchestrator during execution, e.g.:
F#1: APPROVE — bash `pnpm --filter server test` exit 0 -->
