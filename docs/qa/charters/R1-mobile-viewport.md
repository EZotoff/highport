---
id: R1
title: Mobile and tablet responsive layout
persona: player
timebox_minutes: 12
tags: [responsive, mobile, layout, viewport]
enabled: true
xfail: false
scope: [ChargenWizard.tsx, all step components]
---

# Charter R1 — Mobile and Tablet Responsive Layout

## Mission

Verify the chargen background form remains usable at mobile and tablet portrait widths. At 375×667 (iPhone SE) and 768×1024 (iPad portrait), the page must avoid horizontal scroll, keep content readable, and avoid critical clipping or overlap of the primary Continue action.

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

1. **Open** `http://localhost:18120/login`.
2. **Log in** as `agent-qa-player1@example.com` / `test-password-123`.
3. **Navigate** to `http://localhost:18120/chargen`.
4. **Verify** the wizard is on the Background step.
5. **Click** "Create New Character" so the editable background form is visible.
6. **Set viewport** to 375×667.
7. **Verify** the browser reports 375×667.
8. **Screenshot**: `screenshots/mobile-375x667-chargen.png`.
9. **Check mobile layout**:
   - Page has no horizontal scrollbar.
   - Main form content is readable and not clipped.
   - Continue button is not occluded by floating GM Controls or other overlays.
10. **Set viewport** to 768×1024.
11. **Verify** the browser reports 768×1024.
12. **Screenshot**: `screenshots/tablet-768x1024-chargen.png`.
13. **Check tablet layout**:

- Page has no horizontal scrollbar.
- Main form content is readable and not clipped.
- Continue button is not occluded by floating GM Controls or other overlays.

14. **Capture** runtime warnings and console errors.

## Verification Checklist

- [ ] Login completed.
- [ ] `/chargen` loaded without redirect to `/login`.
- [ ] Background form rendered after "Create New Character".
- [ ] 375×667 viewport size confirmed.
- [ ] No horizontal scroll at 375px width.
- [ ] No critical content clipping at 375px width.
- [ ] Continue button not occluded at 375px width.
- [ ] 768×1024 viewport size confirmed.
- [ ] No horizontal scroll at 768px width.
- [ ] No critical content clipping at 768px width.
- [ ] Continue button not occluded at 768px width.
- [ ] Screenshots captured for both viewport sizes.
- [ ] No uncaught JavaScript exceptions.

## Report Focus

- Does the chargen form fit without horizontal scrolling at iPhone SE width?
- Do wide panels, grids, labels, and action buttons collapse or wrap cleanly?
- Is any critical content clipped or unreadable?
- Does the floating GM Controls area overlap the Continue button?
- Are mobile and tablet screenshots sufficient to reproduce any responsive failure?

## Pass Criteria

All verification checklist items pass at both 375×667 and 768×1024.

## Fail Criteria

Any checklist item fails. Common failure modes:

- Horizontal scroll appears because content is wider than the viewport.
- Multi-column content does not collapse at 375px.
- Text, controls, or form content overflow their containers.
- Continue button is covered by GM Controls or another overlay.
- Viewport resize is ignored or reports a different size than requested.
