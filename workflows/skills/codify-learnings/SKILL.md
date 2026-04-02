---
id: codify-learnings
summary: Turn non-obvious session learnings into durable repo artifacts such as AGENTS rules, skills, and harness history entries.
---

# Codify Learnings

Use this after we discover something non-obvious that future agents should not have to rediscover.

## Use Cases

- Capturing durable guidance after debugging, incident work, or process thrash.
- Converting chat-only learnings into repo artifacts.
- Use when the user says or implies:
- "Codify our learnings."
- "Save this as a skill."
- "Make sure we do not repeat this mistake."

## Automatic Triggers

Run this after a task when any of these happened:

- The fix required real investigation or trial-and-error.
- The root cause was not obvious from existing docs.
- A repeatable workflow emerged during the work.
- A durable repo rule changed but is still only implicit in chat.

## Workflow

1. Search what already exists.

```bash
npm run harness:prep
rg -n "keyword|error text" .harness/context/history workflows/skills AGENTS.md
```

2. Extract the actual learning.

- What was the user trying to do?
- What was surprising or misleading?
- What signal proved the truth?
- What should future agents do differently?

3. Pick the smallest durable artifact set.

- Put short always-true rules in `AGENTS.md`.
- Put conditional playbooks in `workflows/skills/*`.
- Put incidents, decisions, and change rationale in `.harness/context/history/*`.

4. Prefer updating an existing artifact over creating a duplicate.

- Update when the trigger and remedy are materially the same.
- Create new only when the workflow or root cause is genuinely distinct.

5. Write the artifact so future agents can act on it quickly.

- Include exact trigger conditions, not vague retrospectives.
- Prefer commands, checks, and decision rules over narrative.
- Keep sensitive information out of the artifact.

6. Report both results and leftovers.

- State what was codified.
- State any remaining frictions that still need code or tooling changes.
