# Chargen — Agentic QA Campaign (L4 real-surface verification)

Baseline of this campaign: main @ `7075235` (Plans C/B/A/D merged) + integration fixes.
Tooling: `.sisyphus/qa/chargen/README.md` (brief) + `hp.mjs` (token minting, headless Yjs client, doc helpers).
Environment: API :18122, WS :18121, web :18120 (`NEXT_PUBLIC_QA_HOOKS=1`), Postgres docker.

## Campaign 1 — lanes Q1–Q4

| Lane | Scope                                                                                                    | Verdict                                                                                                                                                                                                                                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1   | Two-browser concurrent dual-acceptance of a cross-character link (F01-1)                                 | **PASS** — concurrent accepts 16 ms apart → status `accepted`, `acceptedBy=[both]`, exactly 1 edge; three-way agreement (browser, toolkit, server API). Reconcile repair re-created a manually deleted edge.                                                                                                                                      |
| Q2   | GM draft resolve across two clients (F02-2, F02-4)                                                       | **PASS** (with identity workaround) — GM edit propagated to the second client with no reload (`DRAFT-ALPHA` → `DRAFT-EDITED`, stale text gone); rejected mishap did not resurrect after forced muster-out (`status: rejected`, `unwrapAIField → undefined`).                                                                                      |
| Q3   | Export payloads, knowledge/portrait ACLs, cross-campaign isolation, privileged-write residual, auto-join | **PASS** — export carries top-level `provenance` + `flags.highport.provenance` (legacy node: neither); knowledge/portrait 401/403/2xx matrix; cross-campaign 403/404; spoofed `X-User-Id` → 401. F04-2 residual now **blocked at the WS gate** (non-member cannot connect). Auto-join verified (membership rows created; unknown campaign → 403). |
| Q4   | MGT2E rules edges (aging, rank-5 DM, choice gating, specialty, benefit)                                  | **INCONCLUSIVE** — lane aborted after 1h35m; screenshots did not capture characteristics or a choice selector. Re-run as RV2.                                                                                                                                                                                                                     |

## Defects found by the campaign (both fixed, merged)

**Defect A — chargen identity mismatch (user-blocking).** `createSession` / `createCharacter` recorded a
localStorage mock id (`getOrCreateUser().userId`) as `createdBy` / `playerId`, while server commands
authorize against the NextAuth principal. Effects: the GM panel never rendered for an authenticated GM
(no draft approval possible) and the first real cross-character accept returned **403 "Campaign access denied"**.
Confirmed independently by Q1 and Q2. Fix: `63c06c0` — shared NextAuth identity helper
(`apps/web/lib/chargen/identity.ts`) used by all creation callers; mock id retained only for the
LOCAL*MODE offline path. Server rule confirmed (not relaxed): \_acceptLink = campaign role gm|player AND
principal owns source or target*; GM draft resolution requires campaign role `gm`.

**Defect B — joining a session clobbered `chargen.session` (multi-player data loss).** Read accessors
created and persisted an empty nested `Y.Map` when the key was absent; because a nested map is a single
whole-value key, a joining client's empty map won the merge and replaced the populated session (GM identity

- settings lost for everyone). Fix: `2453341` — readers are pure, creation attaches first and adopts an
  existing session instead of replacing it; regression test `chargen-join-safety.test.tsx` (two-doc
  preservation + repeat creation).

## Infrastructure notes (not product defects)

- `qa-traveller` category was bound to the removed model `zai-coding-plan/glm-5.2` → now `glm-5.3`
  (project-local `.opencode/oh-my-openagent.json`, deliberately untracked per `.gitignore`; takes effect for
  new sessions after an OpenCode reload).
- A production `pnpm --filter web build` run while the dev server was serving `apps/web` overwrote
  `.next` and broke the dev server mid-campaign (404 chunks / "require is not defined"). Dev server restarted.
  Lesson: do not build an app while its dev server is serving it.
- Two worker providers were exhausted during the campaign (`kimi-for-coding-oauth/k3` weekly limit,
  `openai/gpt-6.1-sol` usage limit); OMO's fallback chain carried every affected lane to
  `zai-coding-plan/glm-5.3-flash` / `ollama-cloud/deepseek-v4.1-flash`.
- Web vitest needs a thread cap (`--poolOptions.threads.maxThreads=4`); an unrelated Tailwind test times out
  at default concurrency.

## Campaign 2 — RV1 / RV2 (post-fix re-verification, no workarounds)

- RV1: GM panel reachable, concurrent accept without id normalization, join preserves the session,
  GM draft reject/edit propagation across clients.
- RV2: aging at 36, rank-5 benefit roll count + non-zero DM, choice-gated event with a screenshot that
  actually shows the options, specialty/no-pipe skill keys, second characteristic benefit.

## Campaign 2 — RV1 / RV2 (post-fix re-verification, no workarounds)

| Lane | Check                              | Verdict                                                                                                                                                                                                                                                                                                                                    |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------------- | -------- | ------ | --------------------------------------------------------------------------------------------- |
| RV1  | RV1a GM panel + ownership          | **PASS** — GM panel renders (SESSION SETTINGS / PENDING APPROVALS / CROSS-CHARACTER PROPOSALS / PENDING AI REVIEW); the new character's `playerId` = authenticated GM id (stale localStorage anon id untouched) → fix `63c06c0` confirmed                                                                                                  |
| RV1  | RV1b concurrent dual-accept        | **PASS** — both accepted via the real UI (mode switched to Player-to-Player through the GM settings UI); `status=accepted`, `acceptedBy=[gmChar, playerChar]`, exactly ONE edge `xlink-3113a95e` (toolkit + server-persisted `GET /api/doc/<sid>/graph` HTTP 200); 'Campaign access denied' count unchanged (11→11), both accept POSTs 200 |
| RV1  | RV1c join preserves session        | **PASS** — before/after JSON identical (`createdBy` = GM id, `createdAt` preserved, keys intact), read AFTER the join with NO GM reload → fix `2453341` confirmed                                                                                                                                                                          |
| RV1  | RV1d GM reject/edit across clients | **PASS** — draft `RV1-ALPHA` appeared in PENDING AI REVIEW; GM Reject → `status=rejected` (reviewLog by the GM auth id) and the second client never sees it; draft `RV1-EDIT` edited via the panel → second client (no reload) shows the EDITED text, stale and alpha both absent                                                          |
| RV2  | R2a aging                          | **PASS** — losses now apply at positive totals (minor band: STR 8→7; moderate band: STR 8→7, END 6→5; 'none' band at total 6) — the old inversion is fixed, verified live with screenshots of the aging panel                                                                                                                              |
| RV2  | R2b benefit rolls + DM             | **PASS** — rank 5 → "Rolls Remaining = 3" (1 survived term + rank band 4-5 → +2, NOT raw 1+rank=6); "Rolled: 7" observed, impossible on 1d6 without DM+1 → non-zero benefit DM at rank 5 proven                                                                                                                                            |
| RV2  | R2c choice-gated event             | **PASS** — Navy event 11 renders "Choose an outcome" radios; Continue disabled with nothing picked, enabled after the pick; effect applied on confirm (`tactics.naval` 1)                                                                                                                                                                  |
| RV2  | R2d training + specialty           | **PASS** — Scholar basic training at level 0; NO '                                                                                                                                                                                                                                                                                         | ' key in any skills map (both 'drive | flyer' and the event's 'electronics | engineer | gunner | pilot' resolved); specialty appears as compound key `tactics.naval` 1 with parent `tactics` 0 |
| RV2  | R2e characteristic benefit         | **PASS** — "Rolled: 2 → +1 EDU": EDU 6→7 exactly +1, SOC unchanged                                                                                                                                                                                                                                                                         |

Workarounds used by RV1: **NONE**. Both defects are fixed on the real surface for a plain authenticated user.

### New defect from RV2 — compound mustering benefits apply nothing

Compound benefits (all CRB "player chooses one") fall through `parseBenefit` to `type:'other'` → no mechanical effect:

- `+1 EDU or Two Ship Shares` (navy roll 3)
- `+1 END or Cybernetic Implant` · `Armour or +1 END` (army roll 6)
- `Personal Vehicle or Ship Share` (navy roll 1) · `Ship's Boat or Two Ship Shares` (merchant roll 6)
- `Gun Combat (any) 1 or Melee (blade) 1` (marine rank benefit)
- `SOC 10 or +1 SOC, whichever is higher` (army/command rank 5-6)

Fix dispatched: `agent/sisyphus/chargen-fix-benefit-choice` — compound-aware parser + player choice in
MusteringOutStep + auto-resolution of the take-the-better form, with unit + component tests.

## Campaign 3 — RV3 / RV4 (mustering benefit forms + ledger integrity)

| Lane | Check                   | Verdict                                                                                                                                                                                                                                   |
| ---- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RV3  | RV3a compound choice    | **PASS** — roll 3 → "+1 EDU or Two Ship Shares": both alternatives shown, nothing applied pre-pick (EDU 9, shares 0) → picking "+1 EDU" → EDU 9→10, shares 0, ledger shows the chosen text; reload keeps EDU 10, no re-apply, no re-offer |
| RV3  | RV3b and-form mechanics | **PASS** — "+1 SOC and +1 EDU" → SOC +1 and EDU +1, each exactly once, no choice prompt (reproduced on two characters)                                                                                                                    |
| RV3  | RV3c simple benefit     | **PASS** — "+1 INT": no prompt, INT 8→9 exactly                                                                                                                                                                                           |
| RV3  | ledger defects found    | 2 — the and-grant never reached `rollHistory`/the UI ledger, and the relabel deleted earlier standalone grants sharing a label → fixed in `4ab61d0`                                                                                       |
| RV4  | (a) ledger completeness | **PASS** — `rollHistory` length == `rollsUsed` (9/9 and 3/3) and the and-grant entry `{"rollNumber":4,"roll":7,"result":"+1 SOC and +1 EDU"}` is present                                                                                  |
| RV4  | (b) no collateral loss  | **PASS** — exact defect-2 scenario: standalone "+1 SOC" then the and-grant → benefits `["+1 SOC","+1 INT"]` → `["+1 SOC","+1 INT","+1 SOC and +1 EDU"]`, identical in `character.benefits` and `mustering.benefits`                       |
| RV4  | (c) no double-apply     | **PASS** — SOC 7→8 (standalone)→9 (+1 exactly), EDU 9→10 (+1 exactly); reload changed nothing                                                                                                                                             |

### Method notes worth keeping

- **No deterministic path exists for untargeted dice**: `setRandomSeed` is module-private and the QA dice
  interceptor only fires on rolls that HAVE a target, so a benefit roll can only be driven by repeated
  real rolls (RV3/RV4 used fabricated characters parked at `mustering_out`).
- `agent-browser`'s synthetic ref-click does not fire React handlers on the SciFi buttons — the documented
  `eval` `.click()` fallback does. Same family as the original clipped-button defect.
- `localStorage['highport_active_character']` must be JSON; a plain string crashes `identity.ts:12`.

## Campaign totals

- Lanes run: Q1, Q2, Q3, Q4 (aborted), RV1, RV2, RV3, RV4 — 7 completed, 1 aborted and replaced.
- Checks executed on the real surface: 21 — all PASS.
- Product defects found by the campaign: 8 (2 identity/state-loss, 2 layout/session, 2 benefit-form, 2 ledger) — all fixed, merged, and re-verified.
