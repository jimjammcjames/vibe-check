---
id: anti-slop-review
summary: Audit a recent diff for broader AI-slop patterns such as dead code, docs drift, robustness gaps, security footguns, weak tests, architectural drift, and performance/resource regressions.
---

# Anti Slop Review

Use this after implementation when a diff exists and you want a broader
anti-slop pass than naming cleanup alone.

## Use Cases

- Reviewing a substantial AI-authored or AI-assisted diff before handoff.
- Checking whether a change is semantically tight, not just cosmetically tidy.
- Auditing docs, tests, config, and runtime behavior for low-signal churn.
- Use when the user says or implies:
- "Make sure this is not AI slop."
- "Do a broader slop review."
- "Pressure-test this diff."

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

2. Check redundancy and dead code.

- Remove duplicate logic, duplicate configuration paths, and duplicate docs
  that answer the same question.
- Remove dead branches, compatibility layers, and fallback paths that no longer
  have a real caller or rollout trigger.
- Collapse one-off helpers when locality is clearer without them.

3. Check complexity and fake leverage.

- Reduce needless nesting, parameter sprawl, state indirection, and multi-step
  flows that could be one explicit path.
- Remove abstractions that save no real repetition or boundary.
- Prefer clear ownership over "maybe reusable later" structure.

4. Check documentation and prompt truthfulness.

- Ensure comments, README text, prompts, examples, and setup docs match the
  shipped behavior exactly.
- Remove aspirational claims, undocumented guarantees, and examples that were
  never verified.
- If the code changed a durable workflow or standing rule, update the owning
  doc in the same diff.

5. Check robustness and failure handling.

- Exercise empty, null, error, timeout, retry, cleanup, and partial-failure
  paths that the diff could have changed.
- Look for missing teardown, missing idempotency, stale cache/state handling,
  and assumptions that only hold on the happy path.
- Prefer explicit invariants and deterministic handling over silent fallback.

6. Check security and trust boundaries.

- Look for secrets in code, docs, tests, fixtures, and logs.
- Audit shell/file/path/URL handling for injection, traversal, unsafe quoting,
  or over-broad permissions.
- Check whether the change widened trust boundaries, auth assumptions, or
  default access without clearly documenting and validating that choice.

7. Check tests for signal, not theater.

- Prefer behavior-level assertions over source-string matching or duplicated
  production logic.
- Start from the failure mode and choose the smallest seam that could actually
  catch it instead of defaulting to the biggest screen, integration, or
  end-to-end harness.
- Keep mocks limited to unavoidable boundaries such as network, time,
  randomness, or external SDKs.
- Cover the changed invariant plus at least one unhappy path when the diff
  introduces new failure modes.
- If the diff makes a non-trivial debugging, performance, live-validation, or
  correctness claim, check whether it used `prove-it` or an equally explicit
  ground-truth loop proportionate to the risk.
- Remove brittle or low-signal assertions that only prove the test ran.

8. Check architecture and ownership.

- Ensure the change extends the canonical owner instead of creating a parallel
  source of truth.
- Keep responsibilities in the right module and avoid leaking workflow,
  persistence, or policy concerns across boundaries.
- If the change is trying to prevent a recurring but judgment-heavy mistake,
  prefer AGENTS guidance, a skill, or a review prompt over a brittle new
  threshold, scorecard, or wrapper script.
- If a second path is temporarily necessary, name the migration trigger and
  deletion condition.

9. Check performance and resource handling.

- Look for repeated expensive work, unbounded loops or concurrency, unnecessary
  synchronous IO, large allocations, and missing cleanup of temp files or
  handles.
- Prefer bounded, observable behavior over "probably fine" background work.

10. Prove the riskiest assumptions.

- Pick the top 1-3 assumptions that could still make the diff slop even if it
  looks clean.
- Re-derive those assumptions from the requested behavior rather than from the
  implementation shape that already exists.
- Verify them with tests, targeted commands, a `prove-it` matrix, or an
  explicit manual check.
- When UI evidence, backend state, and runtime timing could disagree, prefer
  the most direct evidence source and call out any residual disagreement.
- If you cannot verify one, call out the gap plainly before handoff.
