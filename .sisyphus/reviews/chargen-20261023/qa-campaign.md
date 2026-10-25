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
LOCAL_MODE offline path. Server rule confirmed (not relaxed): _acceptLink = campaign role gm|player AND
principal owns source or target_; GM draft resolution requires campaign role `gm`.

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
