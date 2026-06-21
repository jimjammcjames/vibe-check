# Agent Entry Point

**→ See [.harness/Harness.md](.harness/Harness.md) for the canonical workflow doc.**

**→ Run `npm run harness:prep` to get started.**

## General Rules

- Before starting a new task, run `npm run harness:prep` and continue with the
  request.
- Treat `harness:prep` bootstrap preflight as actionable. Fix repo runtime or
  dependency drift there before debugging later harness stages.
- If the runtime looks wrong, verify the repo-declared runtime from a fresh
  login shell before patching repo scripts or harness commands. Do not paper
  over a bad shell/runtime contract with temporary downloads, wrapper glue, or
  other bridge-only fixes.
- Before changing code, check `workflows/skills/` and
  `.harness/context/history/` plus `.harness/context/sessions/` for relevant
  guidance.
- When the request is ambiguous enough that product, workflow, or architecture
  shape is still unclear, run `feature-discovery` before implementing.
- If a harness command fails because repo-declared tooling is missing, restore
  the relevant local dependencies for the runtimes this repo uses and retry
  before concluding the harness itself is broken.
- Never use `--no-verify`; fix verification failures instead of bypassing them.
- Keep durable rules in tracked repo docs rather than leaving them only in chat
  history.
- When importing external skills, workflows, or docs, adapt them to this repo
  instead of copying them wholesale; prefer a keep/link/merge/cut pass against
  the nearest existing owner.
- Prefer skills, review prompts, and targeted tests over new deterministic
  blockers when the concern is judgment-heavy code health rather than a binary
  invariant.
- Prefer the simplest structural fix that moves an invariant earlier or
  centralizes it behind one shared helper. Avoid reactive late-stage patches
  when a cleaner boundary exists.
- If a change alters durable workflow, policy, or standing guidance, update the
  relevant repo docs in the same change and record the guidance impact in the
  matching history/session artifacts.
- If repeated user steering makes a workflow or collaboration preference
  explicit, codify that preference in repo artifacts during the same task.
- If the user has to redirect, clarify, or strengthen the same thread more than
  once, treat that as evidence of a missing default, explanation, validation,
  or durable workflow rule, and run `followup-prevention` before closing when
  recurrence is plausible.
- Keep the active session artifact updated as the task evolves; do not wait
  until the very end to capture corrections, repeated workflow, or codify
  candidates.
- When immediate session linkage matters, create `new:session` before the
  linked `new:entry` or `new:meta`. `new:session` selects that session for the
  current worktree automatically, `session:use` switches the selection, and
  `--session-slug` is the one-off override when you intentionally need a
  different link target. Do not create linked history and session artifacts in
  parallel.
- Before adding a new doc, command, script, abstraction, or root-level
  surface, use `anti-slop-preflight`.
- When writing reusable skills, workflow docs, or cross-repo guidance, avoid
  hardcoded personal absolute paths unless the task explicitly requires a
  machine-local operator path.
- Before committing or pushing, verify the staged content does not include
  secrets, credentials, or tokens.
- Prefer live end-to-end validation when feasible; if it is not feasible, say
  explicitly what was validated instead.
- Do not treat a one-off manual smoke test as durable monitoring coverage; if a
  long-lived workflow needs monitoring, record the real health signal or note
  the gap explicitly.

## Proactive Coding Guardrails

- Surface assumptions, ambiguity, tradeoffs, and success criteria before
  coding. If a simpler interpretation or cheaper path exists, say so early.
- For non-trivial work, establish a lightweight task contract covering the
  goal, non-goals, likely touched surfaces, acceptance criteria,
  close-but-wrong risks, and validation plan.
- Do not silently choose among materially different interpretations when a
  wrong assumption would create rework, product mismatch, or broad diff churn.
- Prefer the smallest design that solves the current request. Avoid
  speculative features, configurability, abstractions, or fallback paths unless
  the task explicitly asks for them.
- Keep edits surgical: touch only what the task requires, match local style,
  and mention unrelated cleanup instead of folding it into the current change.
- For bug fixes, refactors, and multi-step tasks, translate "works" into
  behavior-based checks and choose the smallest seam that can genuinely fail
  for the regression. If the full path cannot be proven locally, state the
  residual risk and strongest evidence gathered.
- Transitional compatibility is opt-in. Do not add fallback readers, fallback
  writers, or parallel contract paths unless the task explicitly asks for a
  migration path.

## User Preferences

Cross-repo, user-specific defaults that have shown up repeatedly in sibling
repos or in `.codex/MEMORY.md`. Keep this section short, durable, and
cumulative; add only preferences that should follow the user across repos.

### Workflow Preferences

- Prefer rebasing stale unpublished branches onto a freshly fetched base branch
  before PR or branch-sync work. Use merge-based sync only when preserving
  published review history is intentional, and inspect the resulting payload
  before push.
- Detached `HEAD` or detached worktrees are fine for exploration and disposable
  validation, but not for durable tracked edits or landing work. Before
  committing, rebasing, pushing, merging, or opening/updating a PR, move the
  work onto a real branch.
- Do not casually modify local `main`. Only touch it when the user explicitly
  authorizes it, and prefer remote-first sync plus fast-forward over doing
  conflict resolution directly on local `main`.
- When finishing pull, merge, or branch-sync workflows, leave the checkout with
  no unintended tracked dirty state. If generated or runtime artifacts drift,
  either land them intentionally or restore them before concluding.
- Keep durable workflow rules in tracked docs, skills, or history entries
  instead of chat-only guidance. If a change alters the operator workflow or
  standing policy, update the relevant docs in the same diff.
- Prefer one canonical operator entrypoint and source of truth rather than
  parallel fallback paths. Add bridges or alternate paths only when there is an
  active migration, a narrow scope, and an explicit removal trigger.
- When a workflow changes, explain the operator contract plainly: what problem
  it solves, the intended entrypoint, and why this path was chosen.
- During rebase or replay conflicts, consult the linked history/session
  artifacts for the conflicted work before resolving so the original user
  intent survives the conflict cleanup.
- Prefer live end-to-end validation of the real user-facing or operator-facing
  path when feasible; if that is not feasible, say so explicitly and record
  what was validated instead.

### Communication Preferences

- Prefer visual structure when explaining systems, boundaries, or folder
  layouts: use ASCII diagrams and explicit tree views when helpful.
- Lead with the top-level mental model or direct answer first, then drill into
  mechanism and plumbing second.
- If the user asked at a higher abstraction level, answer cleanly there before
  diving into implementation details.

## Canonical Loop

- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci`
- `npm run harness:new:session -- --slug "task-name"`
- `npm run harness:session:use -- --slug "task-name"`
- `npm run harness:session:clear`
- `npm run harness:new:entry -- --slug "change-slug" --type fix|decision|meta`

## Portable Skills

Reusable workflow bundles live in [`workflows/skills/`](workflows/skills/).

Each skill is a folder containing `SKILL.md` with YAML frontmatter:

```yaml
---
id: my-skill # kebab-case identifier (required)
summary: One-line description of what this skill does. (required)
---
```

See also: [`workflows/mcp/`](workflows/mcp/) for MCP server manifests and
`npm run mcp-gen` to generate configs.

<!-- BEGIN Skills Overview (generated by harness:prep) -->

## Skills Overview

- Skills are reusable workflow playbooks stored in `workflows/skills/`.
- The canonical writer for this block is `npm run harness:prep`; do not edit it manually.
- The canonical content source for this block is repo-local skills under `workflows/skills/`.
- This index describes available skills only; it does not widen permissions or override repo or skill-local guardrails.
- If your task overlaps any `USE WHEN` case below, open that skill's `SKILL.md` before you act.
- See `workflows/skills/` for full skill instructions.

- `add-new-skill`: Create a new portable repo skill with the right frontmatter, folder layout, and only the supporting resources it genuinely needs. USE WHEN: Defining a reusable workflow for a repeated engineering task. | Converting an ad hoc process into a repo-local skill. | Localizing an external skill or upstream workflow into repo-owned guidance. | Use when the user says or implies: | "Create a new skill for this." | "Turn this into a reusable workflow." | "We keep doing this; standardize it."
- `anti-slop-preflight`: Pressure-test a proposed change before editing so we extend canonical surfaces and avoid unnecessary files, abstractions, and workflow clutter. USE WHEN: Adding a new root doc, command, script, helper, or review surface. | Touching operator-facing docs and wanting one clear source of truth. | Feeling tempted to add a wrapper, fallback path, or abstraction "just in case." | Planning a substantial AI-authored diff and choosing the review path up front. | Use when the user says or implies: | "Avoid AI slop." | "This feels sloppy." | "Keep the repo tight."
- `anti-slop-review`: Audit a recent diff for broader AI-slop patterns such as weak task contracts, dead code, docs drift, weak tests, architectural drift, and performance or resource regressions. USE WHEN: Reviewing a substantial AI-authored or AI-assisted diff before handoff. | Checking whether a change is semantically tight, not just cosmetically tidy. | Auditing docs, tests, config, and runtime behavior for low-signal churn. | Running a proactive code-health pass after implementation, not just when the user explicitly asks for a review. | Use when the user says or implies: | "Make sure this is not AI slop." | "Do a broader slop review." | "Pressure-test this diff."
- `behavior-preserving-refactor`: Preserve the current shipped contract during a refactor so structural cleanup does not silently revive retired behavior or drop the live path. USE WHEN: Moving a live workflow into new files, modules, or ownership seams without intending a product change. | Refactoring a surface that still has legacy, experiment, or rollback-era files nearby. | Cleaning up architecture after the product already converged on one chosen path. | Use when the user says or implies: | "Refactor this, but don't change behavior." | "Keep the current UX." | "Make the structure better without losing what shipped."
- `codify-learnings`: Turn non-obvious session learnings into durable repo artifacts such as AGENTS rules, skills, and harness history entries. USE WHEN: Capturing durable guidance after debugging, incident work, or process thrash. | Converting chat-only learnings into repo artifacts. | Localizing external skills, workflows, or upstream docs into repo-owned guidance. | Capturing repeated user steering once a workflow preference becomes explicit. | Use when the user says or implies: | "Codify our learnings." | "Save this as a skill." | "Make sure we do not repeat this mistake."
- `detached-worktree-safety`: Move detached checkout work onto an intentional branch before durable edits, commits, rebases, pushes, or merges. USE WHEN: `git status --short --branch` shows `## HEAD (no branch)`. | Durable code, config, docs, or harness artifacts are about to be edited. | The next step would commit, rebase, push, merge, or preserve work from the current checkout. | Use when the user says or implies: | "This worktree is detached." | "Land this from the automation worktree." | "Push this to main from here."
- `durable-surface-contracts`: Record the boundary, validation path, and monitoring contract for long-lived runtime or automation surfaces so durable capabilities never ship as implicit behavior. USE WHEN: Adding a scheduled job, daemon, watcher, bridge, runtime, or durable CLI entrypoint. | Promoting a previously ad hoc/manual workflow into a standing system capability. | Capturing the abstract equivalent of a feature-catalog row without depending on a repo-specific schema. | Use when the user says or implies: | "Make this a durable feature." | "Add a background service or automation." | "Document how this surface is validated and monitored."
- `feature-discovery`: Clarify ambiguous, exploratory, or multi-approach feature requests before implementation by checking repo context, resolving the real open questions, and choosing an implementation direction. USE WHEN: Ambiguous requests with several plausible product, UX, architecture, or workflow shapes. | Exploratory work where acceptance criteria are still fuzzy enough that coding immediately would likely create rework. | New flows with real tradeoffs around ownership, rollout shape, validation, or success criteria. | Use when the user says or implies: | "Figure out the best way to add this." | "What should this flow look like?" | "Let's think through this before building it." | "There are a few ways we could do this."
- `find-regressions`: Audit recent git history for code or config that changed more than once, then classify the churn and its history coverage. USE WHEN: Auditing a recent window for repeated-touch code or config. | Checking whether later commits were corrective, restorative, or effectively removals. | Finding weak or missing harness history coverage for changed-again work. | Running an unresolved-churn audit across branches, worktrees, stashes, or automation notes.
- `followup-prevention`: Convert repeated user redirects, stronger follow-up asks, or large non-feature lessons into durable repo behavior instead of answering them as one-off polish. USE WHEN: The user has already had to correct or redirect the thread twice or more. | The user keeps asking for stronger validation, clearer explanation, safer lifecycle handling, or a tighter control surface. | A "what did you learn?" or "why was this not caught?" follow-up is really pointing at a missing default, rule, test, or explanation. | A large non-feature pass such as hardening, validation overhaul, migration cleanup, or policy correction likely exists because the repo learned something. | Use when the user says or implies: | "We keep missing this." | "How do we stop making this mistake again?" | "Why wasn't this caught beforehand?" | "Codify the lesson."
- `history-first-branch-merge`: Resolve large stale-branch rebases or merges by reconstructing base intent and branch intent from harness history before editing conflicts. USE WHEN: Rebasing or merging a stale branch with a large conflict set. | Sorting true branch intent from snapshots, carryover changes, or obsolete intermediate work. | Deciding what should survive from current base versus the branch.
- `logging-best-practices`: Apply structured logging, correlation IDs, level discipline, and secret-safe log design before adding or revising production logging. USE WHEN: Designing or cleaning up production logging. | Adding observability around failures, retries, or external service calls. | Deciding what should and should not be logged.
- `merge-main-open-pr`: Refresh a branch against the latest base, prefer rebase for stale unpublished work, require an explicit reason before merge-based sync, run `harness:post` plus `review-skill`, then create or update a ready-for-review GitHub pull request. USE WHEN: Opening a PR for the current branch. | Updating an existing PR after more work. | Syncing a stale branch with current base before PR work.
- `merge-pr`: Merge an existing GitHub pull request by checking unresolved review feedback, rerunning harness CI on the final candidate, and merging only the reviewed head commit. USE WHEN: Merging a PR after review. | Resolving GitHub review feedback and then landing the PR. | Avoiding merges that silently skip unresolved inline comments or stale CI state.
- `prove-it`: Build evidence-backed proof matrices for hypotheses, validation, optimization, debugging, ground truth, and loop-until-proven work. USE WHEN: Debugging when the cause is uncertain and several hypotheses could explain the symptom. | Validating non-trivial behavior across roles, states, platforms, runtimes, or side effects. | Comparing candidates where performance, reliability, cost, or quality is the claim. | Defining the right ground truth before changing the system. | Proving deployed, live, or production-like behavior when local evidence may be misleading. | Use when the user says or implies: | "Prove it." | "Define ground truth." | "Make a matrix." | "Loop until the matrix matches." | "Don't speculate." | "Compare these options." | "Validate this live." | "How do we know this is actually fixed?"
- `refine-code`: Clean up recent code changes for clarity and consistency while preserving exact behavior and staying inside the intended diff. USE WHEN: Removing AI slop without changing behavior. | Tightening a fresh diff before review or handoff. | Aligning new code with local conventions.
- `review-code`: Meta-level code reviewer enforcing the 3-step chain (bandaid, meta-analysis, close gap). USE WHEN: Reviewing code diffs for policy compliance, evidence quality, and regression-prevention completeness. | Auditing fix and incident changes for systemic gap closure and class-prevention follow-through. | Use when the user says or implies: | "Run harness review on this diff." | "Check this fix for systemic gap closure." | "Verify this change meets harness policy."
- `review-harness-guardian`: Reviews harness framework changes for gaming attempts (bypass, weaken, hide). USE WHEN: Reviewing harness-core enforcement changes in `.harness/framework/**`, `.harness/config.yml`, `.harness/Harness.md`, hooks, or `harness-tests/` for anti-gaming integrity. | Validating harness refactors to ensure safeguards are preserved or strengthened. | Use when the user says or implies: | "Review these .harness changes." | "Check for gaming or weakened enforcement." | "Validate this harness refactor is safe."
- `review-memory-coherence`: Validates history and session coherence (type correctness, topic unity, linking, and stale topic reuse). USE WHEN: Validating history-entry coherence for type correctness and topic scope before merge. | Checking documentation updates for consistent linking, single-change discipline, and whether fresh work was wrongly appended to an old umbrella entry. | Use when the user says or implies: | "Check history coherence for this change." | "Is this the right entry type?" | "Does this entry bundle unrelated topics?"
- `review-skill`: Run a lightweight final-quality pass by codifying learnings, running anti-slop review, refining recent code, checking memory coherence, and recording durable surface contracts when needed. USE WHEN: Final cleanup after implementation. | Capturing durable learnings before the session ends. | Reviewing history coherence when context artifacts changed. | Making sure new long-lived workflows are documented as durable contracts
- `review-undocumented`: Detects undocumented code changes by comparing diff against history entries. USE WHEN: Verifying documentation coverage for every meaningful code or configuration change cluster. | Running pre-merge checks to catch undocumented implementation deltas. | Use when the user says or implies: | "Find undocumented changes in this diff." | "Confirm every code change has history coverage." | "Run undocumented detector before merge."

<!-- END Skills Overview (generated by harness:prep) -->
