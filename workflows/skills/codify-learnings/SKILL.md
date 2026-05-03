---
id: codify-learnings
summary: Turn non-obvious session learnings into durable repo artifacts such as AGENTS rules, skills, and harness history entries.
---

# Codify Learnings

Use this after we discover something non-obvious that future agents should not have to rediscover.

## Use Cases

- Capturing durable guidance after debugging, incident work, or process thrash.
- Converting chat-only learnings into repo artifacts.
- Localizing external skills, workflows, or upstream docs into repo-owned guidance.
- Capturing repeated user steering once a workflow preference becomes explicit.
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
- A long-lived automation, runtime, or operator-facing surface became part of
  the repo contract.
- The task imported or adapted an external skill, workflow, or vendor guide.
- The user spent multiple turns steering the same workflow or collaboration preference.
- A relevant skill should have guided the work but did not, or the final
  validation proved the implementation shape without proving the requested
  behavior.

## Quality Bar

Codify only when the learning is:

- Reusable: future work would benefit from finding it quickly.
- Non-obvious: it required discovery, not just rereading a README.
- Specific: the trigger and remedy can be stated concretely.
- Verified: the solution actually worked, not just sounded plausible.
- Behavior-shaping: the codified guidance would have changed what a future
  agent does before the same mistake or follow-up happens again.

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

  2.25. Abstract before you encode.

- Ask what broader principle would have changed the agent's behavior before the
  specific mistake, clarification, or missed check.
- Prefer principle-first guidance over narrow incident recipes unless the exact
  if-then condition is itself the recurring reusable pattern.

  2.5. Infer the broader meta intent when workflow-governing surfaces changed.

- If the task touched `AGENTS.md`, repo skills, review prompts, or imported outside guidance, ask what durable preference the user was really expressing beyond the literal edit.
- If repeated user steering already made that preference explicit, codify it directly instead of waiting for a separate reflection request.

  2.75. Route the artifact before editing.

- State the lesson, the owner artifact, why that owner is correct, and at
  least one tempting non-owner.
- If a named skill was relevant, edit that skill only when the workflow itself
  is what failed. Otherwise run it to choose the real owner.

3. Pick the smallest durable artifact set.

- Put short always-true rules in `AGENTS.md`.
- Put conditional playbooks in `workflows/skills/*`.
- Put incidents, decisions, and change rationale in `.harness/context/history/*`.
- If the learning is about a long-lived runtime, automation, or operator
  surface, use `durable-surface-contracts` to record its boundary, validation,
  and monitoring story in the abstract.
- If an existing skill should have covered the situation but did not, treat that
  as a skill-coverage gap and update that skill during the same task.

4. Prefer updating an existing artifact over creating a duplicate.

- Update when the trigger and remedy are materially the same.
- Create new only when the workflow or root cause is genuinely distinct.
- Prefer consolidation over adding a sibling artifact when the same owner can absorb the new learning cleanly.
- Do not leave a behavior-changing lesson only in history when the responsible
  skill or always-on rule is what future agents will actually consult.

  4.5. Adapt external inputs before finalizing local artifacts.

- Keep high-fit guidance.
- Link to existing repo owners when the imported material is only support.
- Merge only when the owner and trigger surface are truly the same.
- Cut advice that is stack-mismatched, irrelevant, or too context-specific for this repo.

5. Write the artifact so future agents can act on it quickly.

- Include exact trigger conditions, not vague retrospectives.
- Prefer commands, checks, and decision rules over narrative.
- Keep sensitive information out of the artifact.

6. Use the session artifact as raw material.

- Pull candidate items from `## Corrections & Thrash`,
  `## Workflow Repetition`, `## Codify Candidates`, and `## Guidance Impact`.
- Prefer codifying the highest-leverage 1-3 learnings rather than spraying low
  value updates everywhere.

7. Report both results and leftovers.

- State what was codified.
- State any remaining frictions that still need code, tooling, or validation
  changes.

## Session-End Self-Check

Before wrapping a substantial task, ask:

- Did we spend meaningful time discovering something?
- Did the work expose a repeated workflow or recurring failure mode?
- Did durable guidance move with the implementation?

If yes to any, run this skill before handoff.

## Anti-Patterns

- Over-extracting one-off trivia into a new skill.
- Writing vague summaries that future search will never find.
- Recording a guidance change in chat but not in tracked repo artifacts.
- Claiming a durable surface exists without also documenting how it is
  validated or monitored.
