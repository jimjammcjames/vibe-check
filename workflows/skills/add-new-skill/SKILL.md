---
id: add-new-skill
summary: Create a new portable repo skill with the right frontmatter, folder layout, and only the supporting resources it genuinely needs.
---

# Add a New Skill

Use this when a workflow keeps recurring and should become a durable repo playbook.

## Use Cases

- Defining a reusable workflow for a repeated engineering task.
- Converting an ad hoc process into a repo-local skill.
- Use when the user says or implies:
- "Create a new skill for this."
- "Turn this into a reusable workflow."
- "We keep doing this; standardize it."

## Workflow

1. Check whether a skill already exists.

```bash
find workflows/skills -maxdepth 2 -name SKILL.md | sort
rg -n "keyword|workflow phrase" workflows/skills
```

- If an existing skill already covers the workflow, update it instead of creating a duplicate.

2. Decide whether the task deserves a skill.

- Create a skill only when the workflow is multi-step, reusable, and benefits from consistency.
- Do not create a skill for a one-off task or a single trivial command.

3. Create the skill folder and `SKILL.md`.

- Use `workflows/skills/<id>/SKILL.md`.
- Keep the folder name and frontmatter `id` identical and in kebab-case.
- Use this frontmatter shape:

```yaml
---
id: my-skill
summary: One-line description of what this skill does.
---
```

4. Keep the body procedural and compact.

- Start with the trigger and intended outcome.
- Add only the steps and decision rules Codex would not reliably infer on its own.
- Prefer imperative instructions and concrete commands over long explanation.

5. Add extra resources only when they buy real leverage.

- `scripts/` for deterministic or repetitive code you do not want rewritten each time.
- `references/` for long docs, schemas, or background material that should be loaded only when needed.
- `assets/` for templates or output resources.

6. Keep repo rules and scenario playbooks separated.

- Short, always-on invariants belong in `AGENTS.md`.
- Conditional workflows belong in `workflows/skills/*`.

7. Validate and sync.

```bash
npm run harness:prep
```

- `harness:prep` should regenerate the Skills Overview block in `AGENTS.md`.
- Confirm the new skill shows up there with a sensible one-line summary.
