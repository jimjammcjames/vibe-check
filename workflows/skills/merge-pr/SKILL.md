---
id: merge-pr
summary: Merge an existing GitHub pull request by checking unresolved review feedback, rerunning harness CI on the final candidate, and merging only the reviewed head commit.
---

# Merge PR

Use this when the user wants an already-open pull request landed.

## Use Cases

- Merging a PR after review.
- Resolving GitHub review feedback and then landing the PR.
- Avoiding merges that silently skip unresolved inline comments or stale CI state.

## Workflow

1. Identify the exact PR and confirm readiness.

```bash
gh auth status
node .harness/framework/scripts/require-named-branch.mjs --purpose "replaying merge fixes on a PR branch" --recovery-command "git checkout -b <branch-name>"
git status --short --branch
gh pr view --json number,url,state,headRefName,baseRefName,reviewDecision,mergeable,mergeStateStatus,statusCheckRollup
```

- If the user provided a PR number or URL, use that exact PR.
- If the current checkout is detached and the user did not provide a PR number
  or URL, stop and report that blocker instead of guessing from local git
  state.
- If there is no PR for the current branch and no explicit PR number, stop and report the blocker.
- If a merge, rebase, or cherry-pick is already in progress, finish that work
  before starting a fresh merge pass.

2. Pull both summary state and inline review threads.

```bash
gh pr view <pr> --json number,url,title,reviewDecision,mergeable,mergeStateStatus,statusCheckRollup,latestReviews,reviews,comments
gh api graphql -f query='query($owner:String!, $repo:String!, $number:Int!) { repository(owner:$owner, name:$repo) { pullRequest(number:$number) { reviewThreads(first:100) { nodes { id isResolved isOutdated path comments(first:20) { nodes { author { login } body url createdAt } } } } } } }' -F owner='<owner>' -F repo='<repo>' -F number=<pr-number>
```

- Treat unresolved, non-outdated review threads as actionable.

3. Resolve review feedback before merge.

- Make the required code, test, or documentation changes.
- If the replay becomes conflict-heavy, use `history-first-branch-merge`.
- If merge-time work uncovers an unrelated harness/tooling blocker, either split
  it into a dedicated follow-up fix/meta thread or record why it is inseparable
  from the merge candidate. Do not silently fold unrelated fixes into the
  feature PR.
- Push the fixes and recheck the PR state.

4. Run the final outer loop on the merge candidate.

```bash
npm run harness:ci
```

5. Finalize the linked history and session artifacts before merge.

- Confirm the linked `.harness/context/history/*` and
  `.harness/context/sessions/*` files still describe the final reviewed
  outcome after all review fixes, rebases, and CI follow-up commits.
- If the final merge candidate changed the shipped behavior, validation story,
  or task outcome relative to those artifacts, update them before merging and
  rerun `harness:ci`.
- If merge-readiness work surfaced a follow-up that is distinct from the
  original PR topic, split that follow-up into its own linked history entry and
  session notes before continuing instead of widening the older task record.

6. Merge only the reviewed head commit.

```bash
PR_HEAD_SHA="$(gh pr view <pr> --json headRefOid --jq '.headRefOid')"
gh pr merge <pr> --merge --match-head-commit "$PR_HEAD_SHA"
```

- Use `--squash` or `--rebase` only when the repo or user explicitly wants that strategy.
- Do not merge pending or failing checks.
- Read the SHA from GitHub's `headRefOid` for that PR instead of local `HEAD`;
  local checkout state is not authoritative for the requested PR.

7. Clear the current-session pointer after a successful merge.

```bash
npm run harness:session:clear
```

- This workflow is a strict endpoint: when the PR is merged successfully, the
  requested task is complete and the worktree should not keep routing new
  history entries to the old task by default.
- If `harness:session:clear` fails because no current session is selected,
  report that fact instead of silently skipping it.
