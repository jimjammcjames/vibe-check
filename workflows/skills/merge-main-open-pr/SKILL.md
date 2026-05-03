---
id: merge-main-open-pr
summary: Refresh a branch against the latest base, prefer rebase for stale unpublished work, require an explicit reason before merge-based sync, run `harness:post` plus `review-skill`, then create or update a ready-for-review GitHub pull request.
---

# Sync Main and Open PR

Use this when the user wants a branch prepared for GitHub review, not when they want an already-open PR merged.

## Use Cases

- Opening a PR for the current branch.
- Updating an existing PR after more work.
- Syncing a stale branch with current base before PR work.

## Workflow

1. Confirm bootstrap, GitHub, and branch state.

```bash
npm run harness:prep
gh auth status
node .harness/framework/scripts/require-named-branch.mjs --purpose "opening or updating a PR" --recovery-command "git checkout -b <branch-name>"
git status --short --branch
```

- Treat `harness:prep` bootstrap preflight as part of the workflow. Fix runtime
  or dependency drift there before you start branch sync.
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

- Recompute divergence from a freshly fetched base every time you resume this
  workflow. Do not trust earlier notes once the base may have moved.
- Keep `fetch -> inspect divergence -> choose sync strategy -> rebase/merge`
  serialized. Never run fetch and sync in parallel.

3. Choose sync strategy deliberately.

- Stage and commit intentional local changes first. Do not use `--no-verify`.
- Prefer rebase when rewriting the branch is acceptable.
- Use merge only when preserving published review history is intentional, and
  state that reason explicitly before choosing merge.
- Do not push immediately before a rebase-based sync.
- If the branch is already up to date with the freshly fetched base, skip sync
  and continue to verification.

4. If rebasing, inspect the replayed patch surface.

```bash
PRE_SYNC_HEAD="$(git rev-parse HEAD)"
GIT_EDITOR=true git rebase "$BASE_REF"
git range-diff "$BASE_REF"..."$PRE_SYNC_HEAD" "$BASE_REF"...HEAD
git diff --name-only "$BASE_REF"...HEAD
```

- If conflicts are large or stale, load `history-first-branch-merge`.
- During conflicts, read the linked history/session artifacts for the affected
  work before resolving so the original request survives the cleanup.

5. Run repo verification before push.

```bash
npm run harness:post
```

- After `harness:post`, run `review-skill`.
- Treat [`workflows/skills/review-skill/SKILL.md`](../review-skill/SKILL.md)
  as the source of truth for that checkpoint instead of relying on a stale
  shorthand.
- If review follow-up changes files, rerun verification until clean again.
- Run this checkpoint before the first push that would create or refresh a PR,
  not after the branch is already visible on GitHub.

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
- Open a normal ready-for-review PR by default. Use a draft PR only when the
  user explicitly asked for one or you have stated a concrete reason first.
- Finish only when the branch is pushed, `harness:ci` is green, and a PR URL exists.
