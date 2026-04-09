---
id: merge-main-open-pr
summary: Refresh a branch against the latest base, run harness verification, then create or update a GitHub pull request without skipping review state or merge-safety checks.
---

# Sync Main and Open PR

Use this when the user wants a branch prepared for GitHub review, not when they want an already-open PR merged.

## Use Cases

- Opening a PR for the current branch.
- Updating an existing PR after more work.
- Syncing a stale branch with current base before PR work.

## Workflow

1. Confirm GitHub and local branch state.

```bash
gh auth status
node .harness/framework/scripts/require-named-branch.mjs --purpose "opening or updating a PR" --recovery-command "git checkout -b <branch-name>"
git status --short --branch
```

- Stop if GitHub CLI is unauthenticated.
- Finish any in-progress merge/rebase/cherry-pick before starting a fresh pass.

2. Re-fetch the base right before divergence checks.

```bash
BASE_REF="$(node .harness/framework/scripts/print-base-ref.mjs)"
BASE_REMOTE="${BASE_REF%%/*}"
BASE_BRANCH="${BASE_REF#*/}"
git fetch "$BASE_REMOTE" "$BASE_BRANCH"
git rev-list --left-right --count HEAD..."$BASE_REF"
gh pr view --json number,url,state,baseRefName,headRefName
```

3. Choose sync strategy deliberately.

- Prefer rebase when rewriting the branch is acceptable.
- Use merge only when preserving published review history is intentional.
- Do not push immediately before a rebase-based sync.

4. If rebasing, inspect the replayed patch surface.

```bash
PRE_SYNC_HEAD="$(git rev-parse HEAD)"
GIT_EDITOR=true git rebase "$BASE_REF"
git range-diff "$BASE_REF"..."$PRE_SYNC_HEAD" "$BASE_REF"...HEAD
git diff --name-only "$BASE_REF"...HEAD
```

- If conflicts are large or stale, load `history-first-branch-merge`.

5. Run repo verification before push.

```bash
npm run harness:post
```

- After `harness:post`, run `review-skill`.
- If review follow-up changes files, rerun verification until clean again.

6. Push the branch.

- First push: `git push -u origin "$(git branch --show-current)"`
- Rebased branch: `git push --force-with-lease`
- Otherwise: `git push`

7. Run the outer loop.

```bash
npm run harness:ci
```

8. Reuse or create the PR.

```bash
gh pr view --json number,url,state,baseRefName,headRefName
gh pr create --fill
```

- Reuse the existing PR when one already exists for the branch.
- Finish only when the branch is pushed, `harness:ci` is green, and a PR URL exists.
