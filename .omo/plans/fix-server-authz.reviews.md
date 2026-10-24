# Momus verdict: fix-server-authz.md — round 1 (bg_a9e1c1b9, retry after session abort)

## [OKAY] — APPROVED

All referenced files/lines/patterns verify (hocuspocus.ts:105/144/237, conflicts.ts:20/76-77/136-137, knowledge.ts:20/56-58, portraits.ts:59/166/207, api/index.ts:33, auth.ts signHocuspocusJwt, conflicts-routes.test.ts mock pattern, schema.ts tables). Every task has concrete starting point + Verify/Done gate; F1-F4 executable. F04-2 decision's load-bearing Hocuspocus claims source-checked against installed @hocuspocus/server@2.15.3: onAuthenticate DOES receive documentName (types.d.ts:143); onChange fires after update applied (esm.js:2695-2709). Premise source-backed, not asserted.

### Non-blocking risks (recorded — implementer must heed)

1. **T10 broadcast gap**: plan prescribes DB-load → fresh Y.Doc → documentUpdates insert; live Hocuspocus clients won't see the mutation until reload. Apply to the live document (hocuspocus.documents.get / direct connection) or document eventual consistency. F3 only checks HTTP status — could pass gates while UI silently lags.
2. **T21 helper name**: getSessionUserId() doesn't exist — actual is getOrCreateUser() in apps/web/lib/identity.ts; useGMControls mounted at 5 sites, not one.
3. **T7**: removing campaign auto-creation can FK-fail fetchDocumentState (/api/doc, export) for unknown campaigns — add campaign-missing → null/404 guard.
4. **T11 hook naming**: Hocuspocus exposes onChange, not onUpdate; auditor belongs in onChange.

```yaml
review_ledger:
  plan: .omo/plans/fix-server-authz.md
  round: 1
  budget: '4+2: round 1/4 standard'
  verdict: OKAY
  findings: []
  disposition: 'approved; risks recorded as non-blocking'
  remaining_risks:
    [T10 broadcast gap, T21 helper name + 5 mount sites, T7 FK guard, T11 onChange naming]
```
