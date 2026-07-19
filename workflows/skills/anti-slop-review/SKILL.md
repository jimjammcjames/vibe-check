---
id: anti-slop-review
summary: Audit a recent diff for broader AI-slop patterns such as weak task contracts, dead code, docs drift, weak tests, architectural drift, and performance or resource regressions.
---

# Anti Slop Review

Use this after implementation when a diff exists and you want a broader
anti-slop pass than naming cleanup alone.

## Use Cases

- Reviewing a substantial AI-authored or AI-assisted diff before handoff.
- Checking whether a change is semantically tight, not just cosmetically tidy.
- Auditing docs, tests, config, and runtime behavior for low-signal churn.
- Running a proactive code-health pass after implementation, not just when the user explicitly asks for a review.
- Use when the user says or implies:
- "Make sure this is not AI slop."
- "Do a broader slop review."
- "Pressure-test this diff."

## Principle

Choose the right control surface for the problem:

- Binary, high-confidence invariant -> deterministic harness, lint, or policy
  check
- Judgment-heavy maintainability, review depth, or code-health concern ->
  AGENTS guidance, a skill, or a review prompt

Do not reach for a new threshold, scorecard, or wrapper script just because the
concern is important. If reviewer judgment is the real requirement, keep the
enforcement agentic.

## Workflow

1. Load the real review surface.

```bash
BASE_REF="$(node .harness/framework/scripts/print-base-ref.mjs)"
git diff --name-only "$BASE_REF"...HEAD
git diff "$BASE_REF"...HEAD
```

- Keep the review scoped to the current diff unless correctness requires a
  nearby read.
- Assume the generated code is wrong until verified; do not trust polish as a
  quality signal.

2. Check assumptions, scope, and verification.

- Flag diffs that silently picked one interpretation of an ambiguous request
  without surfacing the tradeoff or verifying the intended contract.
- For non-trivial work, verify the handoff, history, or session still carries a
  lightweight task contract: goal, non-goals, likely touched surfaces,
  acceptance criteria, close-but-wrong risks, and validation plan.
- Ensure every changed line still traces to the request, required
  verification/history, or cleanup created by the task.
- If the diff makes a non-trivial debugging, live-validation, optimization, or
  correctness claim, verify it used `prove-it` or an equally explicit evidence
  loop proportionate to the risk.
- If the landed implementation narrowed or shifted the original contract,
  require the handoff or linked artifacts to explain that change instead of
  silently shipping the easier adjacent version.
- If a simpler interpretation or cheaper path existed, check whether the diff
  considered it before committing to a larger design.

3. Check redundancy and dead code.

- Remove duplicate logic, duplicate configuration paths, and duplicate docs
  that answer the same question.
- Remove dead branches, compatibility layers, and fallback paths that no longer
  have a real caller or rollout trigger.
- Collapse one-off helpers when locality is clearer without them.

4. Check complexity and fake leverage.

- Reduce needless nesting, parameter sprawl, state indirection, and multi-step
  flows that could be one explicit path.
- Remove abstractions that save no real repetition or boundary.
- Prefer clear ownership over "maybe reusable later" structure.

5. Check state and function contract discipline.

- Prefer derivable state over stored duplicate flags, cached conclusions, or
  parallel status fields.
- If mutable state is genuinely needed, scope it to the smallest owner that can
  mutate it.
- Look for optional-field bags, sentinel values, or dead variants that allow
  impossible combinations or hide missing data.
- Look for primitive aliases or loosely typed identifiers that let callers pass
  the wrong concept through a technically compatible type.
- Keep semantic helpers pure and orchestration helpers explicit about side
  effects. Flag helpers that both mutate inputs and return the same reference.
- If a helper mutates its input, prefer returning `void`; if it returns a
  value, prefer cloning first instead of mutating and returning the same
  reference.
- When a long branch chain returns the same shape from each branch, consider
  whether a data table or earlier normalization would be clearer than repeated
  control flow.

6. Check documentation and prompt truthfulness.

- Ensure comments, README text, prompts, examples, and setup docs match the
  shipped behavior exactly.
- Remove aspirational claims, undocumented guarantees, and examples that were
  never verified.
- If the code changed a durable workflow or standing rule, update the owning
  doc in the same diff.

7. Check robustness and failure handling.

- Exercise empty, null, error, timeout, retry, cleanup, and partial-failure
  paths that the diff could have changed.
- Look for missing teardown, missing idempotency, stale cache/state handling,
  and assumptions that only hold on the happy path.
- Prefer explicit invariants and deterministic handling over silent fallback.

8. Check security and trust boundaries.

- Look for secrets in code, docs, tests, fixtures, and logs.
- Audit shell/file/path/URL handling for injection, traversal, unsafe quoting,
  or over-broad permissions.
- Check whether the change widened trust boundaries, auth assumptions, or
  default access without clearly documenting and validating that choice.

9. Check tests for signal, not theater.

- Prefer behavior-level assertions over source-string matching or duplicated
  production logic.
- Start from the failure mode and choose the smallest seam that could actually
  catch it instead of defaulting to the biggest screen, integration, or
  end-to-end harness.
- Re-derive verification from the requested behavior instead of from the
  implementation shape that already exists.
- Keep mocks limited to unavoidable boundaries such as network, time,
  randomness, or external SDKs.
- Cover the changed invariant plus at least one unhappy path when the diff
  introduces new failure modes.
- If the diff makes a non-trivial debugging, performance, live-validation, or
  correctness claim, check whether it used `prove-it` or an equally explicit
  ground-truth loop proportionate to the risk.
- Remove brittle or low-signal assertions that only prove the test ran.

Use this built-in rubric when the diff changes tests or user-visible behavior:

- Choose the smallest seam that can genuinely fail:
  - pure transformation bug -> utility test
  - state transition or orchestration bug -> controller/hook test
  - service contract bug -> service test
  - view wiring bug -> component/screen test
  - true multi-surface product flow -> integration or e2e coverage
- Prefer behavior assertions over source inspection, duplicated production
  logic, or giant mock harnesses.
- Treat tautologies, implementation-detail assertions, and tests that mostly
  prove the mock setup as low-signal smells.
- If the full user path still is not covered, require the handoff or linked
  artifact to say so instead of implying the suite is complete.

10. Check architecture, ownership, and guidance pressure.

- Ensure the change extends the canonical owner instead of creating a parallel
  source of truth.
- Keep responsibilities in the right module and avoid leaking workflow,
  persistence, or policy concerns across boundaries.
- If the change is trying to prevent a recurring but judgment-heavy mistake,
  prefer AGENTS guidance, a skill, or a review prompt over a brittle new
  threshold, scorecard, or wrapper script.
- If the diff touched workflow-governing surfaces such as `AGENTS.md`, repo
  skills, or review prompts, verify it captured the user's broader meta intent
  and consolidated the nearest existing owner instead of spawning another
  overlapping sibling artifact.
- If the diff deletes, renames, or extracts files, routes, public helpers, or
  flow owners, search docs, workflow notes, and harness history for stale
  references to the old names.
- If a second path is temporarily necessary, name the migration trigger and
  deletion condition.

11. Check performance and resource handling.

- Look for repeated expensive work, unbounded loops or concurrency, unnecessary
  synchronous IO, large allocations, and missing cleanup of temp files or
  handles.
- Prefer bounded, observable behavior over "probably fine" background work.

12. Prove the riskiest assumptions.

- Pick the top 1-3 assumptions that could still make the diff slop even if it
  looks clean.
- Re-derive those assumptions from the requested behavior rather than from the
  implementation shape that already exists.
- Before accepting a non-trivial change, reset the verification story from the
  requested behavior instead of inheriting confidence from the code that now
  happens to exist.
- Verify them with tests, targeted commands, a `prove-it` matrix, or an
  explicit manual check.
- When UI evidence, backend state, and runtime timing could disagree, prefer
  the most direct evidence source and call out any residual disagreement.
- If you cannot verify one, call out the gap plainly before handoff.
