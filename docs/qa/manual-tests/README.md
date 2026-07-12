# Manual Test Cases

This directory contains step-by-step manual test cases for Highport features, authored by agents and reviewed optionally by the human.

## Format

Each file covers one feature. Use this template:

```markdown
# Manual Test Cases: <Feature Name>

## TC-001: <Test Case Name>

**Preconditions**:

- All services running (see AGENTS.md → Testing Infrastructure)
- Test user logged in (see chargen-qa skill → Test Users)
- <Any other preconditions>

**Steps**:

1. <Concrete action — "click X", "navigate to Y", "enter Z">
2. <Next action>
3. ...

**Expected Results**:

- After step 1: <what should happen>
- After step 2: <what should happen>

**Screenshot Checkpoints**:

- After step 1: `tc-001-step-1.png`
- After final step: `tc-001-final.png`

**Pass Criteria**: <binary pass/fail condition>
**Viewport**: 1280×720 AND 1920×1080

---

## TC-002: <Test Case Name>

...
```

## Coverage Requirements

Each feature's test cases must cover:

- **Happy path**: the normal flow
- **Edge cases**: empty state, maximum input, rapid clicking
- **Visual verification**: layout at 1280px AND 1920px width, text overflow, responsive behavior
- **Interaction reversibility**: if you can select something, can you deselect it? does the UI update?

## Naming Convention

Files: `<feature-name>.md` (e.g., `skill-deselection.md`, `wide-viewport-layout.md`)
Screenshots: `.sisyphus/evidence/<feature>/tc-XXX-step-Y.png`

## Status

(No test cases authored yet. To be created per feature during the Test Authoring phase.)
