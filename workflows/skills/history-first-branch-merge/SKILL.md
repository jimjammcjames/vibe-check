---
id: history-first-branch-merge
summary: Resolve large stale-branch rebases or merges by reconstructing base intent and branch intent from harness history before editing conflicts.
---

# History-First Branch Merge

Use this when the raw conflict text is no longer a trustworthy source of truth.

## Use Cases

- Rebasing or merging a stale branch with a large conflict set.
- Sorting true branch intent from snapshots, carryover changes, or obsolete intermediate work.
- Deciding what should survive from current base versus the branch.

## Workflow

1. Capture the sync surface first.

```bash
BASE_REF="$(node .harness/framework/scripts/print-base-ref.mjs)"
BASE_REMOTE="${BASE_REF%%/*}"
BASE_BRANCH="${BASE_REF#*/}"
node .harness/framework/scripts/require-named-branch.mjs --purpose "rebasing or merging a tracked branch" --recovery-command "git checkout -b <branch-name>"
git fetch "$BASE_REMOTE" "$BASE_BRANCH"
PRE_SYNC_HEAD="$(git rev-parse HEAD)"
git status --short --branch
git rev-list --left-right --count HEAD..."$BASE_REF"
git diff --name-only "$BASE_REF"...HEAD
git diff --name-only --diff-filter=U
```

2. Reconstruct both intent maps before editing.

```bash
git log --oneline "$BASE_REF" -- <path>
git log --oneline "$BASE_REF"..${PRE_SYNC_HEAD:-HEAD} -- <path>
rg -n "<feature>|<path>|<error text>" .harness/context/history
```

- Use base-side commits and history to learn what `main` means now.
- Use branch-only commits and history to learn what the branch still intends to ship.
- Let later branch commits outrank earlier branch commits when they disagree.

3. Classify conflict material into three buckets.

- `main intent`
- `branch intent`
- `clue-only noise`

Treat clue-only noise as investigation input, not required output.

4. Resolve toward the intended end state.

- Keep base structure by default.
- Reapply only the minimal branch behavior that still matters.
- Prefer "take base structure, then patch branch behavior" over blending giant conflict blocks line by line.

5. Audit the final replay.

```bash
git range-diff "$BASE_REF"..."$PRE_SYNC_HEAD" "$BASE_REF"...HEAD
git diff --name-only "$BASE_REF"...HEAD
```

- Make sure the final diff reflects the branch's true remaining intent, not stale conflict residue.

6. Record reusable lessons.

- If the merge revealed a repeatable conflict pattern or guardrail, codify it in history, AGENTS, or a skill.
