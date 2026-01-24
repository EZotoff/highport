# OhMyOpenCode Operator Guide

## Agent Hierarchy

```
Prometheus (plans) → Atlas (orchestrates) → Sisyphus (executes)
```

| Agent | Role | Writes Code? |
|-------|------|--------------|
| **Prometheus** | Strategic planner | No |
| **Atlas** | Orchestrator, delegates all work | No |
| **Sisyphus** | Executor, hands-on + can delegate | Yes |

---

## Loop Commands

| Command | Use When |
|---------|----------|
| `/sisyphus-work` | Complex multi-module projects with a Prometheus plan |
| `/ulw-loop` | Continuous execution of understood work, no plan needed |
| `/ralph-loop` | Iterative refinement until completion |

---

## `/sisyphus-work` vs `/ulw-loop`

| Aspect | `/sisyphus-work` | `/ulw-loop` |
|--------|------------------|-------------|
| Requires plan file | ✅ Yes | ❌ No |
| Orchestrator | Atlas | Sisyphus |
| Cross-session memory | Notepad system | Session only |
| Best for | Multi-module, days/weeks | Single session, focused |

---

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

## Workflow: Complex Projects

### Step 1: Create Plan (Prometheus)

```
I want to build [PROJECT DESCRIPTION].

Requirements:
- [Requirement 1]
- [Requirement 2]

Tech stack: [languages, frameworks]
```

*(Prometheus interviews, then outputs to `.sisyphus/plans/{name}.md`)*

### Step 2: Execute Plan (Atlas)

```
/sisyphus-work

Execute the plan at .sisyphus/plans/[project-name].md
```

---

## Workflow: Simple/Continuous Work

```
/ulw-loop

Build [WHAT YOU WANT]:

## Requirements
1. [Requirement 1]
2. [Requirement 2]

## Success Criteria
- [ ] [Measurable outcome]
- [ ] [Verification command] passes
```

---

## Available Skills

Pass via `load_skills=["skill-name"]` in delegations.

| Skill | When Required |
|-------|---------------|
| `playwright` | Any browser tasks |
| `frontend-ui-ux` | UI/UX design work |
| `git-master` | Any git operations |

---

## Categories (for `delegate_task`)

| Category | Domain |
|----------|--------|
| `visual-engineering` | Frontend, UI/UX, styling |
| `ultrabrain` | Complex architecture, deep reasoning |
| `quick` | Trivial single-file changes |
| `unspecified-low` | Low-effort misc tasks |
| `unspecified-high` | High-effort misc tasks |
| `writing` | Documentation, prose |
| `artistry` | Creative/artistic tasks |

---

## Specialized Agents

| Agent | Purpose |
|-------|---------|
| `oracle` | Read-only consultation |
| `librarian` | Docs, GitHub, external references |
| `explore` | Codebase grep/search |

---

## File Structure

```
.sisyphus/
├── plans/           # Prometheus plans (read-only)
│   └── {name}.md
└── notepads/        # Cross-task learnings
    └── {name}/
        ├── learnings.md
        ├── decisions.md
        └── issues.md
```

---

## Quick Decision Tree

```
Complex project, need structure?
  → Prometheus first, then /sisyphus-work

Clear work, just execute?
  → /ulw-loop directly

Resuming interrupted work with plan?
  → /sisyphus-work, reference the plan

Resuming without plan?
  → /ulw-loop, list remaining tasks
```
