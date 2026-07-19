---
id: followup-prevention
summary: Convert repeated user redirects, stronger follow-up asks, or large non-feature lessons into durable repo behavior instead of answering them as one-off polish.
---

# Follow-up Prevention

Use this when the thread itself is teaching the repo a durable lesson.

## Use Cases

- The user has already had to correct or redirect the thread twice or more.
- The user keeps asking for stronger validation, clearer explanation, safer lifecycle handling, or a tighter control surface.
- A "what did you learn?" or "why was this not caught?" follow-up is really pointing at a missing default, rule, test, or explanation.
- A large non-feature pass such as hardening, validation overhaul, migration cleanup, or policy correction likely exists because the repo learned something.
- The user asks for follow-up work after an implementation or review pass and that follow-up smells like a missing default, proof, or codified explanation rather than net-new scope.
- Use when the user says or implies:
- "We keep missing this."
- "How do we stop making this mistake again?"
- "Why wasn't this caught beforehand?"
- "Codify the lesson."

## Principle

Repeated follow-ups are evidence that the repo is missing a durable behavior:

- a missing default
- a missing explanation
- a missing lifecycle rule
- a missing validation proof
- a missing guidance surface
- a missing harness or hook enforcement point

A first post-implementation follow-up is an early warning sign that one of
those durable behaviors may still be missing.

A large non-feature diff is often not "just cleanup." It can be the repo
learning something about defaults, validation, lifecycle, or operator
expectations.

Do not just answer the follow-up. Convert it into reusable repo behavior when
the pattern is likely to happen again.

## Workflow

1. Identify the repeated pattern.

- What did the user have to ask for more than once?
- Did the user ask for follow-up work because something still felt off after an
  implementation or review pass?
- Is this large non-feature diff better understood as a lesson learned rather
  than a feature addition?
- Which category does it fit?
  - zero-context explanation
  - exact user-path validation
  - lifecycle, cleanup, or rollback
  - naming or defaults
  - guidance or skill behavior
  - harness enforcement

2. Decide where the prevention belongs.

- `AGENTS.md` for standing behavioral rules.
- A skill for workflow-specific behavior.
- Harness or hook enforcement for binary fail-closed rules.
- README or setup docs for operator explanation.
- Tests for proving the new rule sticks.

3. Codify the prevention in the same change when feasible.

Examples:

- add or sharpen a skill trigger
- strengthen a review prompt or workflow checklist
- add the missing validation or regression test
- add a harness rule for the exact operator-facing command when the invariant
  is binary
- add cleanup, rollback, or destroy proof when the workflow creates temporary
  state
- update setup or operator docs to explain the real command path
- move a recurring judgment call into the right durable owner instead of chat

4. Record the prevention explicitly.

- In the paired session/history artifacts, name the repeated pattern in
  `Corrections & Thrash`, `Codify Candidates`, or `Guidance Impact`.
- State what now prevents the same follow-up next time.
- If you choose not to codify a repeated follow-up, say why instead of silently
  skipping it.

## Constraints

- Do not invent a broad repo rule for a one-off preference unless recurrence is
  likely.
- Prefer the narrowest durable surface that will actually prevent recurrence.
- A first follow-up does not always require a new standing rule, but it does
  require checking whether codification is warranted.
