---
id: feature-discovery
summary: Clarify ambiguous, exploratory, or multi-approach feature requests before implementation by checking repo context, resolving the real open questions, and choosing an implementation direction.
---

# Feature Discovery

Use this when the repo needs a short discovery loop before coding.

## Source of Truth

- This skill owns the front-door discovery loop for ambiguous feature work.
- Use it before implementation-oriented skills when the main question is still
  "what exactly should we build?"
- After discovery, hand off to the narrower local owner instead of duplicating
  discovery logic across implementation skills.

## Use Cases

- Ambiguous requests with several plausible product, UX, architecture, or workflow shapes.
- Exploratory work where acceptance criteria are still fuzzy enough that coding immediately would likely create rework.
- New flows with real tradeoffs around ownership, rollout shape, validation, or success criteria.
- Use when the user says or implies:
- "Figure out the best way to add this."
- "What should this flow look like?"
- "Let's think through this before building it."
- "There are a few ways we could do this."

## Goal

Resolve only the uncertainty that materially affects implementation, then move
into the appropriate repo-local implementation owner with an approved direction.

## Workflow

1. Explore current repo context first.

- Read the nearby files, recent history/session artifacts, and any relevant
  local skills before proposing a direction.
- Check whether the request is truly ambiguous enough to need discovery. If the
  behavior is already clear and the task is mechanical, exact, or a simple bug
  fix, skip this skill and implement.

2. Decompose oversized requests early.

- If the request actually bundles multiple independent subsystems or a too-large
  product surface, split it into smaller slices first.
- Pick the first slice that can reasonably go through one design ->
  implementation cycle.

3. Ask only the questions that change the build.

- Ask one clarifying question at a time.
- Prefer concise plain-text questions.
- Focus on purpose, users, constraints, success criteria, rollout boundaries,
  and what would make one approach better than another.
- Stop asking questions once the remaining uncertainty is non-material.

4. Choose the right exploration mode.

- If the request is mainly about durable workflow or operator behavior, keep the
  discussion at the contract level before proposing code.
- If the uncertainty is about a long-lived automation, runtime, or service
  boundary, use `durable-surface-contracts` after the direction is approved.
- If the uncertainty is only visual polish or implementation detail, do not
  over-upgrade the task into discovery theater.

5. Compare approaches only when there are real tradeoffs.

- Propose 2-3 approaches when there are materially different choices.
- Lead with the recommended approach and explain the tradeoffs plainly.
- If the alternatives are fake distinctions, present one recommended direction
  with a short rationale instead of manufacturing option theater.

6. Present the design at the right level of detail.

- Scale the output to task size: a few sentences for a small feature, a
  structured outline for a larger one.
- Cover the parts that matter for implementation: product contract, UX flow,
  architecture seam, data or ownership implications, edge cases, validation,
  and rollout path.
- When unresolved choices would materially change UX, architecture, data shape,
  or scope, get explicit approval before starting implementation.

7. Capture durable design only when it helps.

- For larger or longer-running efforts, capture the approved direction in the
  repo's normal artifacts such as a decision entry or requested doc.
- For smaller tasks, a concise approved thread summary is enough.
- Do not make a committed design doc mandatory for trivial work.

8. Hand off to the right local owner.

- Use the narrowest existing implementation skill, workflow doc, or durable
  owner that covers the approved direction.
- If no such owner exists and the workflow is likely to recur, consider
  creating or extending a skill instead of leaving the guidance only in chat.

## Output

- One short approved design summary.
- The chosen implementation path or next owner.
- Any intentionally deferred questions that do not block implementation.

## Notes

- Keep the loop proportionate; the point is to prevent expensive assumptions,
  not to stall obvious work with ceremony.
- Follow existing repo patterns and improve nearby boundaries only when they
  affect the requested work.
