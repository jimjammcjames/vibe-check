---
id: anti-slop-preflight
summary: Pressure-test a proposed change before editing so we extend canonical surfaces and avoid unnecessary files, abstractions, and workflow clutter.
---

# Anti Slop Preflight

Use this before implementation when the task might add new docs, commands,
helpers, wrappers, tests, or operator-facing workflow surfaces.

## Use Cases

- Adding a new root doc, command, script, helper, or review surface.
- Touching operator-facing docs and wanting one clear source of truth.
- Feeling tempted to add a wrapper, fallback path, or abstraction "just in case."
- Planning a substantial AI-authored diff and choosing the review path up front.
- Use when the user says or implies:
- "Avoid AI slop."
- "This feels sloppy."
- "Keep the repo tight."

## Workflow

1. Find the current owner of the behavior before adding anything new.

```bash
rg -n "keyword|workflow phrase" AGENTS.md .harness/Harness.md .harness/setup workflows/skills .harness/context/history .harness/context/sessions
```

- `AGENTS.md` owns the agent entrypoint.
- `.harness/Harness.md` owns the durable workflow contract.
- `.harness/setup/*` owns installation and adoption guidance.
- `workflows/skills/*` owns conditional playbooks.
- `.harness/context/*` owns rationale, comparisons, and change history.

2. Prefer extension over addition.

- Update an existing surface first.
- Add a new file only when the audience or lifecycle is genuinely different.
- If two files would answer the same "where do I look?" question, merge them.

3. Keep background material out of the root.

- Research notes, comparisons, and migration scratchpads belong in
  history/session artifacts or a dedicated docs subtree.
- Repo-root docs should be stable entrypoints or intentional long-lived
  reference material.

4. Pressure-test new code for fake leverage.

- Remove helpers used once unless they materially improve locality.
- Remove comments that only restate the code.
- Remove fallback paths, defensive branches, and wrappers without an observed
  caller, failure mode, or contract boundary.
- Prefer one explicit flow over multiple speculative paths.

5. Delete superseded surfaces in the same change.

- If the new shape makes an older doc, script, or helper redundant, remove the
  older surface before handoff.
- Do not leave both versions around unless there is an active migration and a
  named removal trigger.

6. Choose the follow-up review path before you start editing.

- If the task will produce a meaningful diff, plan to run `anti-slop-review`
  before handoff.
- If you want the normal final cleanup bundle, run `review-skill`; it now
  includes `anti-slop-review` plus `refine-code`.
- Keep `refine-code` for narrow cleanup when the broader anti-slop review is
  already done or unnecessary.

7. Still finish with the reactive pass.

```bash
npm run harness:prep
```

- If the task produced a real diff, follow with `anti-slop-review` or
  `review-skill` before handoff.
