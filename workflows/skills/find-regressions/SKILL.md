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

## Workflow

1. Set the window explicitly.

- Resolve relative phrases like "this week" into exact dates before auditing.

```bash
git log --since='YYYY-MM-DD 00:00' --until='YYYY-MM-DD 23:59' --no-merges --name-only --date=short --pretty=format:'COMMIT%x09%H%x09%ad%x09%s'
```

2. Gather matching durable context.

```bash
rg -n "keyword|feature-name|error text" .harness/context/history
```

3. Reduce to the real audit surface.

- Focus on code and config paths touched more than once.
- Exclude pure doc/history churn from the repeated-path count.
- Regroup repeated files into real feature or subsystem clusters.

4. Classify each cluster.

- Initial change
- Later change that materially altered it
- End-of-window state
- Coverage quality: `strong`, `weak`, or `missing`

5. Report compactly.

- Summarize the real churn clusters, not a file dump.
- Call out later changes that lacked matching intent coverage.
- Separate "changed twice for a good reason" from likely regressions.
