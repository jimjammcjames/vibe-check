---
id: find-regressions
summary: Audit recent git history for code or config that changed more than once, then classify the churn and its history coverage.
---

# Find Regressions

Use this when the user wants to know what changed and then changed again, what likely regressed, or which later fixes lacked clear intent coverage.

## Use Cases

- Auditing a recent window for repeated-touch code or config.
- Checking whether later commits were corrective, restorative, or effectively removals.
- Finding weak or missing harness history coverage for changed-again work.
- Running an unresolved-churn audit across branches, worktrees, stashes, or automation notes.

## Workflow

1. Set the window explicitly.

- Resolve relative phrases like "this week" into exact dates before auditing.
- For recurring audits, default to a rolling seven-day window and state the
  exact start/end dates in the report.

```bash
git log --since='YYYY-MM-DD 00:00' --until='YYYY-MM-DD 23:59' --no-merges --name-only --date=short --pretty=format:'COMMIT%x09%H%x09%ad%x09%s'
```

1.5. Restore the runtime before trusting the audit.

- If the repo has a bootstrap or harness preflight, run it first and fix
  runtime or dependency drift before interpreting later failures as churn
  signal.
- In harness-backed repos, treat provider availability and diagnostics as
  live-check concerns instead of assuming earlier runs still reflect reality.

2. Gather matching durable context and hidden-state evidence.

```bash
npm run harness:prep
rg -n "keyword|feature-name|error text" .harness/context/history
rg -n "keyword|feature-name|error text" .harness/context/sessions
git log --all --since='YYYY-MM-DD 00:00' --until='YYYY-MM-DD 23:59' --no-merges --name-only --date=short --pretty=format:'COMMIT%x09%H%x09%ad%x09%s'
git worktree list --porcelain
git branch --no-merged HEAD
git stash list --date=local
cat .harness/diagnostics/latest/review-coverage.json
cat .harness/diagnostics/latest/agent-failures.log
```

- If the question is whether a provider-backed issue is still open, rerun the
  live boundary instead of trusting `which <tool>` or an older failure note.
- Use `review-coverage.json` plus `agent-failures.log` to understand configured
  versus actually runnable providers after a guardian or agent-review failure.

  2.5. Compare artifact freshness against code freshness early.

- Check whether the newest relevant code commit materially outruns the newest
  matching history, session, automation, or audit artifact.
- If the visible tree looks quiet but off-main refs or automation memory carry
  newer evidence, say so before concluding the repo is actually quiet.
- Treat stale durable context as its own finding: the audit can only be as
  trustworthy as the freshness of the artifacts it is leaning on.

3. Reduce to the real audit surface.

- Focus on code and config paths touched more than once.
- Exclude pure doc/history churn from the repeated-path count.
- Regroup repeated files into real feature or subsystem clusters.
- Separate current `HEAD`, off-main refs, detached worktrees, and stash entries
  before rating churn. Off-main work can still be unresolved even when `main`
  looks quiet.

4. Classify each cluster.

- Initial change
- Later change that materially altered it
- End-of-window state
- Coverage quality: `strong`, `weak`, or `missing`
- Current status: `resolved`, `unresolved`, or `needs-decision`

5. Rerun against extra categories.

- After the first pass, invent at least three more candidate categories based
  on the repo shape and rerun targeted searches against them.
- Useful generic categories: test/runtime portability, stale branch anchoring,
  generated artifact drift, review-loop metadata, clone-shape assumptions,
  hidden scheduler or automation state, and validation truthfulness.

6. Report compactly.

- Summarize the real churn clusters, not a file dump.
- Call out later changes that lacked matching intent coverage.
- Separate "changed twice for a good reason" from likely regressions.
- If the exact window has no commits, say so plainly and separate "no new
  churn in this window" from older unresolved carryover.
- For unresolved items, include user-pain and recurrence-risk ratings plus a
  concrete durable fix candidate.
