---
id: prove-it
summary: Build evidence-backed proof matrices for hypotheses, validation, optimization, debugging, ground truth, and loop-until-proven work.
---

# Prove It

Use this skill when the task needs proof rather than confidence theater.

## Use Cases

- Debugging when the cause is uncertain and several hypotheses could explain the symptom.
- Validating non-trivial behavior across roles, states, platforms, runtimes, or side effects.
- Comparing candidates where performance, reliability, cost, or quality is the claim.
- Defining the right ground truth before changing the system.
- Proving deployed, live, or production-like behavior when local evidence may be misleading.
- Use when the user says or implies:
- "Prove it."
- "Define ground truth."
- "Make a matrix."
- "Loop until the matrix matches."
- "Don't speculate."
- "Compare these options."
- "Validate this live."
- "How do we know this is actually fixed?"

## Core Rule

- If ground truth can be defined, define it before changing the system.
- If variables can be isolated, vary the smallest useful one.
- If the result matters, show the matrix.

## Goal Contract And Goal Lint

Separate what must be true of the product or workflow from how that truth will
be checked. Do not let proof machinery become part of the claimed behavior or
acquire authority to expand its own scope.

For non-trivial proof work, write five distinct sections before implementation:

1. Product outcomes: independently falsifiable user-visible or
   authoritative-state results.
2. Safety boundaries: prohibited mutations, deliveries, data exposure, or
   release effects.
3. Scope and non-goals: what this delivery intentionally excludes.
4. Proof plan: the simplest direct behavior, authoritative readback, or
   existing focused check that can prove or falsify each outcome.
5. Stop condition: the exact state that ends product work and the condition
   that freezes further verifier growth.

Model identity, reviewer independence, hashes, seals, evidence schemas, retry
mechanics, and runner implementation belong in the proof plan or reviewer
policy. If the user explicitly requires one, preserve it there and describe how
failure narrows or blocks the verification label; do not restate it as product
behavior.

Reject or rewrite a goal when any of these are true:

- Reviewer or verifier governance can cite itself as the harmed property.
- The full aggregate is the only practical way to exercise properties that can
  be tested independently.
- The plan permits an expensive aggregate rerun after fixing only the latest
  failure without first inventorying and greening the remaining independent
  frontier.
- A property is labeled aggregate-only because of convenience, current test
  location, or packaging instead of naming the real boundary that cannot be
  crossed by a cheaper observation.
- Multiple unrelated user stories are forced into one chain when separate
  stories over shared data would prove them more directly.

Use this compact shape:

```text
GOAL
Deliver <product outcome> within <scope>.

PRODUCT OUTCOMES
P1 ...

SAFETY BOUNDARIES
S1 ...

NON-GOALS
N1 ...

PROOF PLAN
For each P/S property, name the simplest observation that can prove or falsify it.

STOP CONDITION
All product and safety properties are proven, with no unresolved in-contract blocker.
```

Before any aggregate or expensive end-to-end rerun, keep a lightweight frontier
table or checklist:

```text
PROPERTY | CHEAPEST REAL BOUNDARY | CURRENT-CANDIDATE EVIDENCE | STATUS
<id>     | <direct behavior/readback> | <artifact or observation> | INNER-GREEN
<id>     | <why no cheaper seam exists> | NONE                    | AGGREGATE-ONLY
```

Its purpose is to make the remaining independent frontier visible, not to
formalize every minor observation.

## Proof Target Lock

Before collecting evidence or changing code, lock the exact proof target. This
prevents proving an adjacent symptom while missing the user's actual claim.

Write the target contract in concrete terms:

- Exact subject: the literal control, copy, row, field, document, state, or
  side effect being proven. Do not rely on broad labels such as "the button"
  or "the status" when multiple nearby candidates could fit.
- Equivalent state: role, route or screen, viewport or device class, auth or
  data fixture, feature flags, and the action sequence needed to reach the same
  before/after state.
- Failure predicate: the exact mismatch that counts as failure.
- Pass predicate: the primary measurable condition that proves success.
- Artifacts: the screenshot, log, probe, URL, trace, or readback that will be
  shown in the handoff.

If the user supplies a screenshot or correction, treat the named object in that
evidence as the target source of truth. Re-state the target contract before
proceeding when the target could be confused with an adjacent control, row, or
output. Do not broaden from the named object to a whole class of similar
surfaces unless the user explicitly asks for that.

Before/after proof must compare equivalent states. If the old build, fixture,
or failing environment cannot be reproduced, say that explicitly and use the
supplied failing artifact only as the before image while still collecting
target-scoped measurements on the after state.

## Proportionality Gate

Use `prove-it` when at least one is true:

- The user explicitly asks for proof, a matrix, hypotheses, ground truth, live validation, comparison work, or loop-until-matching work.
- The cause is uncertain or multiple plausible explanations exist.
- The claim is about performance, reliability, loading, workflow cost, or optimization.
- UI proof and backend proof could disagree.
- The change crosses roles, platforms, runtimes, or live versus local environments.
- A wrong answer would create false confidence, repeated rework, or a difficult rollback.

Skip `prove-it` for tiny copy edits, obvious docs fixes, isolated mechanical
changes, or a focused unit-test repair where the failing assertion already is
the ground truth.

## Experiment Permission

When static inspection cannot prove the claim, build a measuring stick.

Allowed proof scaffolding includes:

- temporary scripts or benchmark runners
- structured logs with a unique prefix
- debug flags, HUDs, or page self-reports
- local-only probes, throwaway fixtures, or isolated routes
- failure injection, throttles, delayed listeners, or fake slow resources
- browser probes, DOM samplers, screenshots, traces, and HARs
- one scoped preview or demo URL when the repo already has an approved preview path

Prefer the most direct evidence, not the most convenient evidence. Screenshots
can show a symptom, but direct state, persisted writes, timing, or ownership
usually prove more.

Remove or isolate temporary proof scaffolding before handoff unless it is
intentionally promoted into a durable test, helper, or validation surface.

## Matrix Types

Choose the smallest matrix that can settle the question.

### Hypothesis Matrix

Use when the cause is unknown.

| Hypothesis                   | Minimal experiment | Ground truth                        | Expected if true | Expected if false | Actual | Decision |
| ---------------------------- | ------------------ | ----------------------------------- | ---------------- | ----------------- | ------ | -------- |
| Listener blocks first render | Delay listener     | readiness timestamp + visible state | render waits     | render proceeds   |        |          |

### Acceptance Matrix

Use when the desired behavior is already known.

| Row                            | Starting state | Action        | Expected visible result   | Expected side effect    | Ground truth | Actual | Decision |
| ------------------------------ | -------------- | ------------- | ------------------------- | ----------------------- | ------------ | ------ | -------- |
| Signed-out user resumes action | signed out     | complete auth | original action continues | persisted state changes |              |        |          |

### Comparison Matrix

Use when choosing between baseline and candidates.

| Scenario         | Variant                 | Runs | Primary metric | Guardrail                | Expected             | Actual | Decision |
| ---------------- | ----------------------- | ---: | -------------- | ------------------------ | -------------------- | ------ | -------- |
| Large repo audit | baseline vs cached flow |   10 | duration       | output quality unchanged | faster without drift |        |          |

### Regression Matrix

Use when existing behavior must survive the change.

| Existing contract                 | Proof row          | Ground truth       | Expected                       | Actual | Decision |
| --------------------------------- | ------------------ | ------------------ | ------------------------------ | ------ | -------- |
| Legacy command still fails closed | run old entrypoint | stderr + exit code | explicit failure with recovery |        |          |

### Ground-Truth Matrix

Use when the first problem is deciding what measurement actually proves the claim.

| Candidate ground truth    | What it proves      | What it misses                 | How to collect | Decision                |
| ------------------------- | ------------------- | ------------------------------ | -------------- | ----------------------- |
| Screenshot                | visible symptom     | ownership, persistence, timing | screenshot     | secondary only          |
| persisted record readback | storage side effect | UI ownership                   | targeted read  | primary for persistence |

## Workflow

1. State the claim.

- Write the exact claim or question in one sentence.
- If there are multiple claims, split them into separate rows or separate matrices.

2. Choose the matrix.

- Use a hypothesis matrix for uncertain cause.
- Use an acceptance matrix for a known contract.
- Use a comparison matrix for alternatives.
- Add regression rows when existing behavior must remain true.

3. Fill expected outcomes before running.

- Define the variable or action.
- Define what would confirm the claim.
- Define what would falsify it.
- Pick the primary ground truth and any secondary evidence.
- Lock the exact target and equivalent state so the proof does not drift to an
  adjacent symptom.
- When the claim is about one visible control, row, message, field, or output,
  prefer target-scoped measurements over screenshot-only proof.

4. Run the smallest useful experiment.

- Vary one thing at a time when possible.
- Prefer fresh disposable fixtures over polluted shared state.
- When deployed or operator-facing behavior matters, test the real entrypoint or nearest truthful hosted path instead of a local-only shortcut.
- Prove independently testable rows first. Treat aggregate-only rows as real
  boundary claims that should name the cross-property, environment,
  continuity, cleanup, or sequencing boundary they alone can prove.

5. Fill actual evidence.

- Record the observed result beside the expected result.
- Keep raw artifacts: logs, screenshots, traces, URLs, readbacks, timings, and command labels.
- Do not mark a row green until the evidence actually settles the row.

6. Loop to the real stop condition.

- For debugging, stop when the important hypotheses are accepted, rejected, or explicitly inconclusive.
- For validation, stop when expected and actual match or the residual risk is explicit.
- For comparison, stop when a winner clears the primary metric and guardrails or the result is honestly inconclusive.
- If an aggregate or expensive end-to-end row fails, reopen the failed row and
  any rows that share its invalidated fixture, collector, state, or setup
  assumption. Before another aggregate rerun, inventory and green the whole
  remaining independent frontier instead of replaying the full aggregate just
  to discover the next failure.

7. Clean up or promote the proof surface.

- Remove temporary logs, flags, probes, and throwaway scaffolding once they have served the proof.
- If the proof tool is broadly useful, promote it intentionally into a test, helper, or durable validation path.

## Adjacent Skills

- Use `feature-discovery` when the uncertainty is about what to build, not what is true.
- Use `find-regressions` when the question is mainly historical churn or unresolved carryover.
- Use `durable-surface-contracts` when the proof exposes a long-lived operator or runtime surface that needs a declared validation story.
- Use `codify-learnings` when the proof uncovers a durable rule future agents should follow.

## Anti-Patterns

- Proving an adjacent symptom while never locking the user's actual target.
- Treating a screenshot as proof when direct state, ownership, or timing is available.
- Treating one happy-path local run as proof of hosted or production-like behavior.
- Measuring several variables at once and then claiming causality.
- Leaving temporary experiments behind after they have served the proof.
