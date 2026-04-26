---
id: detached-worktree-safety
summary: Move detached checkout work onto an intentional branch before durable edits, commits, rebases, pushes, or merges.
---

# Detached Worktree Safety

Use this when a checkout is detached and the task is moving from read-only
exploration into durable tracked edits, commits, rebases, pushes, or merge
preparation.

## Use Cases

- `git status --short --branch` shows `## HEAD (no branch)`.
- Durable code, config, docs, or harness artifacts are about to be edited.
- The next step would commit, rebase, push, merge, or preserve work from the current checkout.
- Use when the user says or implies:
- "This worktree is detached."
- "Land this from the automation worktree."
- "Push this to main from here."

## Workflow

1. Check the current state before choosing a path.

```bash
git status --short --branch
git fetch origin main
git log --oneline --left-right HEAD...origin/main
```

- If the task is still read-only, staying detached is fine.
- If durable tracked work is about to start, move onto a real branch first.
- If the detached base is behind `origin/main`, do not start durable work from
  the stale snapshot unless the user explicitly wants that exact base.

2. Choose the safe branching path.

- Detached, clean, and current enough: `git switch -c <task-branch>`
- Detached, clean, and behind `origin/main`:
  `git switch -c <task-branch> origin/main`
- Detached, dirty, and behind `origin/main`:

```bash
git stash push -u -m "detached-worktree-replay-<task-branch>-$(date +%Y%m%dT%H%M%S)"
git stash list --format='%gd %gs' | head -n 1
git stash show --stat stash@{0}
git switch -c <task-branch> origin/main
git stash apply stash@{0}
```

- Detached, dirty, and current enough: `git switch -c <task-branch>`

3. Preserve shared-repo safety while replaying work.

- Use a unique task-branch name that matches the repo or user convention.
- If `git stash apply` conflicts, resolve the conflicts on the new branch while
  leaving the stash entry intact for recovery.
- After a successful replay, drop the stash explicitly with
  `git stash drop stash@{0}`.

4. Keep landing work intentional.

- Do not modify local `main` unless the user explicitly authorized that in the
  current conversation.
- Use non-interactive Git commands only.
- Preserve unrelated user changes; do not reset or discard them.
- If another worktree already holds the branch name you wanted, choose a new
  unique branch name instead of forcing it.
- Because stashes are repository-scoped across linked worktrees, always use a
  unique stash message and inspect the stash contents before you apply or drop
  it.

## Outcome

By the time durable work starts, the checkout should be on a named branch with
an intentional base. Detached snapshots remain disposable; tracked work moves
onto an attachable branch before it is easy to lose or accidentally land from
stale history.
