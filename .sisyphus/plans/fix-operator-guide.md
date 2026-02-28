# Fix Operator Guide: Add Prometheus Invocation Section

## Context

### Original Request

User asked to verify that best-practices for invoking Prometheus were documented.

### Finding

The `MEATBAGS.md` operator guide is missing critical information about how to invoke Prometheus.

---

## Work Objectives

### Core Objective

Add a dedicated "Invoking Prometheus" section to the operator guide.

### Concrete Deliverables

- Updated `MEATBAGS.md` with Prometheus invocation instructions

### Definition of Done

- [x] Guide includes "Invoking Prometheus" section before "Workflow: Complex Projects"
- [x] Section explains no loop command is needed
- [x] Section describes interview-first behavior
- [x] Prompt template is user-friendly (not prescriptive)

---

## TODOs

- [x] 1. Add "Invoking Prometheus" section to MEATBAGS.md

  **What to do**:
  Insert the following section BEFORE "## Workflow: Complex Projects" (line 38):

  ```markdown
  ## Invoking Prometheus (Planning)

  **No loop command needed.** Prometheus is a conversational planner.

  ### How to Invoke

  Simply describe your project. Prometheus will:

  1. **Interview you** — ask clarifying questions
  2. **Research** — explore codebase and docs via agents
  3. **Generate plan** — save to `.sisyphus/plans/{name}.md`

  ### Prompt Template
  ```

  I want to build [PROJECT DESCRIPTION].

  Requirements:
  - [Requirement 1]
  - [Requirement 2]

  Tech stack: [languages, frameworks]

  ```

  **Prometheus handles the rest.** When requirements are clear, plan is auto-generated.

  ### Explicit Triggers (optional)

  | Phrase | Effect |
  |--------|--------|
  | "Create the work plan" | Skip to plan generation |
  | "High accuracy mode" | Enable Momus review loop |

  ---
  ```

  **References**:
  - `MEATBAGS.md:38` — insertion point (before "## Workflow: Complex Projects")

  **Acceptance Criteria**:
  - [x] New section appears between "## Specialized Agents" and "## Workflow: Complex Projects"
  - [x] Section explains no `/ulw-loop` or `/ralph-loop` needed for Prometheus
  - [x] Interview-first behavior is documented

  **Parallelizable**: NO (single file edit)
  **Commit**: YES
  - Message: `docs: add Prometheus invocation section to operator guide`
  - Files: `MEATBAGS.md`

---

- [x] 2. Update "Step 1: Create Plan" to be less prescriptive

  **What to do**:
  Change the prompt template in "Workflow: Complex Projects" from:

  ```
  Create a Prometheus plan for: [PROJECT DESCRIPTION]
  ...
  Output: .sisyphus/plans/[project-name].md
  ```

  To a simpler, conversational format:

  ```
  I want to build [PROJECT DESCRIPTION].

  Requirements:
  - [Requirement 1]
  - [Requirement 2]

  Tech stack: [languages, frameworks]
  ```

  Remove the "Output:" line — Prometheus decides where to save.

  **References**:
  - `MEATBAGS.md:42-51` — current template location

  **Acceptance Criteria**:
  - [x] Template is conversational, not command-like
  - [x] No "Output:" directive (Prometheus handles this)

  **Parallelizable**: NO (same file as TODO 1)
  **Commit**: Groups with TODO 1

---

## Success Criteria

### Verification Commands

```bash
grep -A 20 "Invoking Prometheus" MEATBAGS.md  # Should show new section
grep "No loop command" MEATBAGS.md            # Should find this phrase
```

### Final Checklist

- [x] "Invoking Prometheus" section exists
- [x] No loop commands mentioned for Prometheus
- [x] Interview-first behavior documented
- [x] Prompt templates are user-friendly
