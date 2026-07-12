# QA Review Prompt Templates

Prompt templates for visual QA screenshot review using `look_at`.

## Usage

These prompt templates are used with the `look_at` tool to analyze screenshots for visual defects. The orchestrating agent passes one of these prompts as the `goal` parameter when calling `look_at` on a key screenshot (identified by `qa-key-screenshots.sh`).

```bash
# Example: running a comprehensive review on a screenshot
# (the orchestrating agent does this — not a shell script)
look_at --file "path/to/screenshot.png" --goal "$COMPREHENSIVE_PROMPT"
```

All prompts are designed to be used as the `goal` parameter of `look_at`. The tool returns findings that are recorded in the evidence ledger.

## Two-Pass Strategy

A two-pass approach ensures thorough coverage without excessive cost:

### Pass 1: Comprehensive (all key screenshots)

Run the **Comprehensive** prompt on every key screenshot. This catches all classes of visual defects in a single pass. Screenshots that pass (no issues found) require no further review.

### Pass 2: Focused (only screenshots with issues)

For each screenshot where Pass 1 found one or more issues, run the relevant focused prompt(s) to dig deeper into the specific defect class. This provides precise, actionable details for the fix phase.

| If Pass 1 found…         | Run focused prompt…       |
| ------------------------ | ------------------------- |
| Text overflow / clipping | `Focused-text-overflow`   |
| Layout / width issues    | `Focused-layout-width`    |
| Element overlap          | `Focused-element-overlap` |

The focused prompts are narrower and produce more specific remediation guidance.

## Prompt Templates

### Comprehensive

```
You are a QA engineer reviewing a web app screenshot. List every visual problem: text overflow, cramped layout, empty/wasted space, misaligned elements, text that doesn't fit in its container, overlapping elements, clipped content.

Use these severity definitions:
- CRITICAL = blocks task completion.
- MAJOR = significant visual problem on primary user path (text unreadable, content clipped, layout broken).
- MODERATE = cosmetic issue on secondary element.

Is the primary content well-distributed across the available space, or is it bunched/clumped in a narrow column despite having room? If cramped despite available space, rate as MAJOR.

For each issue found, list: severity, location, description.

### Focused-text-overflow

```

Check every text label, heading, button label, table cell, badge. Look at: skill table section headers, career card descriptions, character sheet name/stats, button labels in narrow containers.

### Focused-layout-width

```
Check specifically for LAYOUT WIDTH: does the main content area use at least 70% of the viewport width? Is there a large empty margin?
```

### Focused-element-overlap

```
Check specifically for ELEMENT OVERLAP: does any UI element overlap or obscure another?
```

### Context-prefix

```
This is a {app_name} screenshot at {viewport}. The current wizard step is {step}. {additional_context}
```

The `Context-prefix` template is designed to be prepended to any of the focused prompts (or the comprehensive prompt) to provide the model with situational awareness. Replace the placeholders:

- `{app_name}` — name of the application under review (e.g., "Highport")
- `{viewport}` — viewport dimensions (e.g., "1280x720" or "1920x1080")
- `{step}` — current wizard or flow step (e.g., "Step 3: Equipment")
- `{additional_context}` — any other relevant context (e.g., "User has just clicked 'Next'")
