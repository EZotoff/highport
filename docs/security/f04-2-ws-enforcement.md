# F04-2: pre-merge chargen enforcement

## Installed hook investigation

Subject: `@hocuspocus/server` **2.15.3**, installed under
`apps/server/node_modules/@hocuspocus/server/` (not a newer API).

The per-message rejection hook is **`beforeHandleMessage`**, not
`onBeforeHandleMessage`:

- `src/types.ts:47,266–276` and
  `dist/packages/server/src/types.d.ts:215–226` expose the hook and its complete
  incoming frame, authenticated context, document, and connection.
- `src/ClientConnection.ts:149–164` registers it on each authenticated document
  connection, before queued sync messages are handled.
- `src/Connection.ts:218–239` awaits its promise before calling
  `MessageReceiver.apply`; rejection skips application and closes the document
  connection using the error's code/reason.
- `src/MessageReceiver.ts:40–43,161–215` accepts writes in both `Sync` and
  `SyncReply`, with Yjs subtypes `SyncStep2` (1) and `Update` (2).

Other pre-admission controls are `onUpgrade` (`src/Server.ts:44`), `onConnect`
(`src/ClientConnection.ts:335`), and `onAuthenticate`
(`src/ClientConnection.ts:244`). These reject admission rather than individually
authorize updates from an admitted member. `connection.readOnly`, initialized
from connection/authentication configuration, suppresses both write subtypes in
`MessageReceiver.ts:168,204`, but cannot express per-record ownership.
`beforeBroadcastStateless` and `onStateless` operate on stateless messages, not
Yjs updates. Document loading/storage hooks do not filter incoming updates;
`onChange` is post-merge. `connected` runs after queued frames have already been
dispatched (`ClientConnection.ts:199–212`), and is not an admission filter.
Current upstream documentation also describes `beforeSync` and v4 ordered
message processing; neither is exposed in this installed 2.15.3 hook interface.
No library patch or version upgrade is needed.

## Enforcement

An admitted member may change/delete only their own character, vote only for
their own link endpoint, and cannot impersonate a GM review or another owner's
provenance decision.

The configured hook decodes all four write-frame variants and applies each
update to an isolated copy first. The policy compares existing ownership with
the candidate state, prevents ownership changes, validates endpoint votes and
derived link status, preserves GM resolutions, and protects GM-pending review
metadata. Ordinary owner edits and non-GM-pending owner review remain allowed.
Server commands continue to bypass this raw-client path using their existing
authorization.

Validation and application to the authoritative document happen synchronously
inside the hook: Hocuspocus awaits hooks without serializing all connections,
so merely approving a candidate and letting a later continuation commit it
would create a check/use race. The ordinary receiver then reapplies the same
Yjs update idempotently. Tests assert exactly one authoritative update event.
Pending structs/delete sets are refused, preventing deferred unauthorized
operations from activating under a later actor.

A rejected frame never reaches the authoritative document or its persistence
observer. The offending connection receives a `privilege_rejected` stateless
notification and document-connection close code 4403. Structured
`chargen.privilege_rejected` warnings identify the document, socket, and path;
they contain no token or payload. The existing `onChange` auditor is unchanged
as a tripwire (including its intentionally broader warnings on raw owner writes).

## Verification

Behavior commit: `3408ff5` (policy dependency `9823384`).

- `privilege-enforcement.test.ts`: 13 cases, including non-owner deletion,
  mutation, ownership/provenance forgery; owner success; forged votes/status;
  sequential and concurrent dual acceptance; GM-pending review; deferred structs.
- `ws-privilege-enforcement.test.ts`: 11 cases using the configured production
  hook and real Hocuspocus Connection/MessageReceiver, without a listening port:
  four rejection frames, four owner-success frames, vote/provenance rejection,
  and both-owner acceptance. Rejection cases were red before hook registration.
- Existing `chargen-commands.test.ts`: 14 pass; web
  `cross-character-proposals.test.tsx`: 12 pass, including F01-1 behavior.
- `docker compose up -d`: exit 0, existing PostgreSQL container running.
- Server typecheck, test, build: exit 0; **167 passed, 37 existing skips**.
- Web typecheck, test: exit 0; **386 passed**, 53 test files.
- Changed TypeScript files: LSP diagnostics clear.

Full gates ran on a detached verification worktree at the exact behavior commit,
after an offline frozen-lockfile install and shared/mgt2e builds. This avoids
concurrent FU2 edits in the main checkout: its earlier web run failed an aging
assertion and attempted to read a test file removed during that run. Those
unrelated changes were neither edited nor committed here.

## Limits

There is no remaining Hocuspocus hook limitation for these three chargen rules.
This is not a schema-wide authorization system: independent graph/node/edge
fields outside `chargen` remain ordinary collaborative writes, and arbitrary
session settings are not made GM-only by this patch. Server-internal mutations
still rely on their command authorization. Rejected local/offline client state
is not rolled back; clients must discard/reload it before retrying, and updates
with missing causal dependencies must be resynchronized before resubmission.
Candidate cloning has document-size-dependent cost; resource quotas are outside
this authorization change.

## Implementer alignment ledger

Self-verification, not independent acceptance. Bound at 2026-10-26T00:12:53+01:00
to branch `agent/sisyphus/fu4-2-ws-enforcement`, behavior HEAD
`3408ff5b7974cc45aff526d28747ff6d278e6052`. Server diff is clean (SHA-1
`da39a3ee5e6b4b0d3255bfef95601890afd80709`); main checkout contains unrelated
FU2 dirt and this untracked evidence document. The detached verification tree
contains only the committed behavior.

| Requirement                                                           | Verdict and evidence                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Inspect installed source and types before choosing architecture       | SATISFIED: installed hook references above                                                 |
| Pre-merge rejection, offender notification, backup auditor retained   | SATISFIED: `3408ff5`, `src/ws/privilege-enforcement.ts`; 11 protocol cases                 |
| Non-owner rejection and owner success                                 | SATISFIED: `9823384`, 13 policy cases; four wire variants for each actor                   |
| Both owners' legitimate acceptance, F01-1 preserved                   | SATISFIED: protocol dual-accept test; 12 web proposal tests; 14 server command tests       |
| Docker and complete server/web verification, all exit 0               | SATISFIED: gate counts above; tool output `tool_175554ae5001rZK2SFPGqfxNtl`                |
| No dev servers, no push/merge, explicit paths, no unsafe type escapes | SATISFIED: commands and scoped commit diffs; 5 changed TS files have clear LSP diagnostics |
| 2–3 atomic Conventional Commits on requested branch                   | SATISFIED: two behavior commits above plus this evidence-only commit                       |

Recommendation: **accept** for the specified chargen insider-write rules. This
ledger does not certify unrelated graph authorization, resource limits, client
recovery UX, or an independent deployment penetration test.
