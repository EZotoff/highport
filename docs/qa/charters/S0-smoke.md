---
id: S0
title: Harness smoke test
persona: player
timebox_minutes: 5
tags: [smoke, harness]
enabled: true
xfail: false
---

# Charter S0 — Harness Smoke Test

## Mission

Sign in as test player 1, navigate to `/chargen`, and verify the wizard shell renders with the background step visible.

This is the smoke test. If S0 fails, every other charter will also fail. Fix whatever S0 finds before moving on.

## Preconditions

| Service    | Required |
| ---------- | -------- |
| web        | yes      |
| fastify    | yes      |
| hocuspocus | optional |
| postgres   | optional |
| rag        | optional |
| ollama     | optional |

If web or fastify is down → SKIP with reason `"services not running"`.

## Steps

1. **Open** `http://localhost:18120/login`
2. **Log in** as `agent-qa-player1@example.com` / `test-password-123`
3. **Verify** redirect to `/` or `/chargen` (NOT still on `/login`)
4. **Screenshot**: `screenshots/01-after-login.png`
5. **Navigate** to `http://localhost:18120/chargen`
6. **Wait** for wizard to render (look for "Background" heading or "Character Gen" in page text)
7. **Screenshot**: `screenshots/02-chargen-wizard.png`
8. **Read** the page state via `agent-browser snapshot`
9. **Verify** the wizard is on the Background step:
   - URL contains `/chargen`
   - Page text mentions "Background" or "Characteristics"
   - "Create New Character" button is visible OR wizard already active
10. **Capture** browser console errors via `agent-browser eval "window.__consoleErrors || []"`

## Verification Checklist

- [ ] Login completed (URL is not `/login`)
- [ ] `/chargen` loaded without redirect to `/login`
- [ ] Wizard shell rendered (Background step visible)
- [ ] No uncaught JavaScript exceptions
- [ ] Screenshots captured

## Report Focus

- Did login work?
- Did the wizard render?
- What text/headings are visible on the background step?
- Are rolled characteristics visible?
- Any console errors?
- Any visual anomalies (missing assets, broken layout, etc.)?

## Pass Criteria

All verification checklist items pass.

## Fail Criteria

Any checklist item fails. Common failure modes:

- Login 401 ( Fastify down or test user not registered — re-register via curl)
- Redirected to `/login` after navigation (session not persisted — auth cookie issue)
- Wizard doesn't render (JS error, missing component, crash)
- Console throws an uncaught exception
