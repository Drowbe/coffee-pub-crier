# Custom Subagents

This folder holds **Cursor subagents** for this project. Each file defines a specialized agent the main Agent can delegate work to.

## Format

Each subagent is a `.md` file with:

1. **YAML frontmatter** (between `---` lines):
   - `name` — Short identifier (e.g. `verifier`, `doc-writer`).
   - `description` — When and why the main agent should use this subagent. Be specific so the main agent picks it correctly.

2. **Body** — The subagent’s system prompt: goals, steps, and constraints.

## Where they apply

- **Here** (`.cursor/agents/`) — Project-only; only affects this repo.
- **User-wide** (`~/.cursor/agents/`) — Affects all projects.

Project-level subagents override user-level ones when names match.

## Example layout

```markdown
---
name: verifier
description: Validates completed work, runs tests, and reports what passed vs what’s incomplete.
---

You are a verification subagent. When given a task:
1. Inspect the implementation and any tests.
2. Run relevant tests or checks.
3. Report what passed, what failed, and what’s missing.
Keep the final report concise and actionable.
```

## When to use subagents vs skills

- **Subagent** — Multi-step, needs its own context, or “separate expert” (research, verification, deep exploration).
- **Skill** — Single-purpose, repeatable, one-shot (e.g. “generate changelog”, “format imports”).

See [Cursor’s Subagents docs](https://cursor.com/docs/context/subagents) for more.
