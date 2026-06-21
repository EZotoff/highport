---
id: U1
title: UI design critique — chargen wizard readability and polish
persona: ui-critic
timebox_minutes: 10
tags: [ui, design, readability, critique]
enabled: true
xfail: false
---

# Charter U1 — UI Design Critique

## Mission

Score the chargen wizard's visual design, readability, and interaction quality across 6 dimensions. Produce a structured critique with concrete findings and severity ratings.

**You are the UI critic, not a player.** You don't need to log in or complete chargen. Browse the public-facing surfaces and the wizard (if accessible) and judge what you see.

## Preconditions

| Service    | Required             |
| ---------- | -------------------- |
| web        | yes                  |
| fastify    | optional (for login) |
| hocuspocus | optional             |
| postgres   | optional             |
| rag        | optional             |
| ollama     | optional             |

If web is down → SKIP. If login is required for `/chargen` and fastify is down, evaluate `/login` and `/` only.

## Steps

1. **Open** `http://localhost:18120/`
2. **Screenshot**: `screenshots/01-home.png`
3. **Open** `http://localhost:18120/login`
4. **Screenshot**: `screenshots/02-login.png`
5. **Log in** as `agent-qa-player1@example.com` / `test-password-123` (if fastify is up)
6. **Navigate** to `/chargen`
7. **Wait** for wizard to render
8. **Screenshot**: `screenshots/03-chargen-wizard.png`
9. **Click** "Create New Character" (if visible)
10. **Wait** for background step
11. **Screenshot**: `screenshots/04-background-step.png`
12. **Read** the full accessibility tree:
    ```bash
    agent-browser snapshot
    ```
13. **Evaluate** each dimension (see below)
14. **Take additional screenshots** for any specific findings (e.g., contrast issues, layout problems)

## Evaluation Dimensions

Score each from 1 (poor) to 5 (excellent). Provide 1-3 sentences of justification per dimension.

### 1. Readability (1-5)

- Is body text legible at default zoom?
- Is the typography hierarchy clear (headings vs body vs labels)?
- Are font sizes appropriate for the content density?
- Do text/background combinations have sufficient contrast (WCAG AA = 4.5:1 for body text)?
- Are long blocks of text broken up appropriately?

### 2. Hierarchy (1-5)

- Is the most important information the most visually prominent?
- Can a user tell at a glance what the primary action is?
- Are secondary actions visually de-emphasized?
- Does the wizard step progression make sense visually?
- Is the relationship between elements clear?

### 3. Layout (1-5)

- Is whitespace used effectively (not too cramped, not too sparse)?
- Does the layout work at typical desktop resolutions (1280x720 minimum)?
- Are panels/cards aligned to a clear grid?
- Does the layout guide the eye through the workflow?
- Are interactive elements appropriately sized (44x44px minimum for touch)?

### 4. Color (1-5)

- Does the color palette feel cohesive?
- Is color used purposefully (status, hierarchy, branding) — not decoratively?
- Are interactive elements distinguishable by color?
- Is dark mode / light mode consistent (if both exist)?
- Does the color support the sci-fi/Traveller aesthetic without being cliché?

### 5. Interaction (1-5)

- Do buttons and links have clear hover/active states?
- Are loading states communicated (spinners, skeletons)?
- Are form inputs properly labeled and accessible?
- Do error states provide clear, actionable feedback?
- Is the AI assistance UI (generate buttons, regenerate, etc.) discoverable and clear?

### 6. Accessibility (1-5)

- Can all interactions be completed via keyboard?
- Do interactive elements have appropriate ARIA roles?
- Are images and icons labeled (alt text, aria-label)?
- Does the page work in high-contrast mode?
- Is the focus order logical?

## Verification Checklist

- [ ] All 6 dimensions scored 1-5 with justification
- [ ] Overall score computed (see below)
- [ ] At least 3 specific findings with severity ratings
- [ ] Screenshots captured for each finding
- [ ] Critique written to `critique.md` alongside `report.md`

## Severity Ratings for Findings

- **P0 (Blocker)**: Prevents task completion (e.g., button unclickable, text unreadable)
- **P1 (Major)**: Significantly degrades UX (e.g., low contrast on critical text, confusing hierarchy)
- **P2 (Minor)**: Annoying but workaround exists (e.g., hover state missing, spacing inconsistent)
- **P3 (Nitpick)**: Polish-level (e.g., slightly off alignment, color could be more saturated)

## Report Focus

The critique.md file should contain:

```markdown
# UI Critique — Chargen Wizard

**Overall Score**: N/100

## Dimension Scores

| Dimension     | Score    | Justification |
| ------------- | -------- | ------------- |
| Readability   | N/5      | ...           |
| Hierarchy     | N/5      | ...           |
| Layout        | N/5      | ...           |
| Color         | N/5      | ...           |
| Interaction   | N/5      | ...           |
| Accessibility | N/5      | ...           |
| **Total**     | **N/30** |               |

**Conversion**: (Total / 30) × 100 = N/100

## Findings

### P1 — {Finding title}

{Description with screenshot reference}
**Reproduction**: {how to see this}
**Suggested fix**: {what to change}

### P2 — {Finding title}

...

## What's Working Well

- {list 2-3 things the UI does right}

## Screenshots

- 01-home.png
- 02-login.png
- 03-chargen-wizard.png
- 04-background-step.png
```

## Pass Criteria

- All 6 dimensions scored
- Overall score computed
- At least 3 findings documented with severity
- Critique written

Note: **U1 cannot "fail" in the same way S0/A1/B1 can.** The point is to produce the critique, not to pass/fail the UI. If the UI is bad, the critique captures that — that's success.

## Fail Criteria

- Unable to access `/chargen` (would indicate web service issue)
- Unable to render the wizard at all
- Critique not written

## Score Conversion

Sum of 6 dimensions (out of 30) × 100/30 = score out of 100.

- 90-100: Excellent
- 75-89: Good
- 60-74: Acceptable
- 40-59: Needs Work
- Below 40: Poor

Previous run (2026-06-21): **66.7/100** — Acceptable. Readability, Hierarchy, Interaction, Accessibility all 3/5. Layout and Color 4/5.
