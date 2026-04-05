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
git status --short --branch
gh pr view --json number,url,state,headRefName,baseRefName,reviewDecision,mergeable,mergeStateStatus,statusCheckRollup
```

- If the user provided a PR number or URL, use that exact PR.
- If there is no PR for the current branch and no explicit PR number, stop and report the blocker.

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

5. Merge only the reviewed head commit.

```bash
PR_HEAD_SHA="$(gh pr view <pr> --json headRefOid --jq '.headRefOid')"
gh pr merge <pr> --merge --match-head-commit "$PR_HEAD_SHA"
```

- Use `--squash` or `--rebase` only when the repo or user explicitly wants that strategy.
- Do not merge pending or failing checks.
