# Canonical Harness Trace Research

## Scope

This pass looked at the actual history/session traces, not just the READMEs:

- `moves`: 210 session files and 150 history entries under
  `/Users/jamesdugle/Repos/moves/.harness/context/`
- `moves-algorithm`: 3 session files and the initial harness-port meta entry
  under `/Users/jamesdugle/Repos/moves-algorithm/.harness/context/`
- `life.exe`: 52 session files and 52 structured entries under
  `/Users/jamesdugle/Repos/life.exe/history/`
- `mooo`: runtime memory plus docs under `/Users/jamesdugle/Repos/mooo/`

The goal was to separate:

- portable harness patterns we should keep in canonical
- patterns we should keep but simplify
- repo-specific governance that should stay out of core canonical behavior

## Ordered Recommendations

### 1. Keep staged commit intent plus exact history/session coupling

Bring over:

- staged `harness:post -- --staged`
- exact `affected_files`
- exact `session_refs`
- the rule that staged real code must carry staged context in the same commit

Why:

- This is the strongest shared evolution across `moves` and `life.exe`.
- Both repos repeatedly treated commit-time provenance as the real leverage
  point, not branch-level or working-tree-level documentation.

How to use it:

- Stage substantive code first.
- Create or update the matching history entry.
- Keep `affected_files` limited to the substantive repo paths the entry
  explains.
- Do not list the history/session artifacts themselves in `affected_files`.

Evidence:

- `/Users/jamesdugle/Repos/moves/.harness/context/sessions/2026-03-08-0156-staged-commit-intent-v3.md`
- `/Users/jamesdugle/Repos/life.exe/history/entries/2026-03-10-005343-roll-out-structured-history-sessions-and-staged-policy-audit.md`
- `/Users/jamesdugle/Repos/life.exe/history/sessions/2026-03-19-140637-land-root-feature-catalog-and-monitor-policy.md`

Status in canonical:

- Kept

### 2. Keep sessions, but simplify them into append-only task notes

Bring over:

- `new:session`
- task-level notebook sections: user intent, timeline, corrections, workflow
  repetition, codify candidates, outcome

Do not bring over:

- `close:session`
- `status: active|closed`
- `ended_at`

Why:

- The useful part across repos is the task notebook itself.
- The active/closed lifecycle repeatedly created linking friction without adding
  much decision value.
- `moves` alone has 26 session traces mentioning multi-session ambiguity or
  related linking pain.

How to use it:

- Create one session per substantial task.
- Keep updating it during the task.
- Never "close" it; the timestamped file is the record.
- If more than one same-day task exists, use `--session-slug` for
  `new:entry` / `new:meta`.

Evidence:

- `/Users/jamesdugle/Repos/moves/.harness/context/history/2026-03-10-session-linking-and-meta-clarity.md`
- `/Users/jamesdugle/Repos/moves/.harness/context/sessions/2026-03-10-0816-session-linking-and-meta-clarity.md`
- `/Users/jamesdugle/Repos/moves/.harness/context/sessions/2026-03-25-2002-test-suite-audit-automation.md`
- `/Users/jamesdugle/Repos/life.exe/history/sessions/2026-03-17-120510-default-bedroom-tv-dashboard-host-tool.md`

Status in canonical:

- Kept, simplified in this pass

### 3. Keep the structured correction taxonomy

Bring over:

- `user_correction`
- `agent_correction`
- `process_issue`
- `thrash`

Why:

- This is more useful than a single generic `correction:` bucket.
- It makes real user redirects distinguishable from tooling pain and self-fix
  loops.

How to use it:

- Put actual user steering in `user_correction`.
- Put assistant-initiated rethinks in `agent_correction`.
- Put environment or tooling failures in `process_issue`.
- Put discarded implementation churn in `thrash`.

Evidence:

- `/Users/jamesdugle/Repos/moves/.harness/context/history/2026-03-19-enforce-session-correction-types.md`
- `/Users/jamesdugle/Repos/moves/.harness/context/sessions/2026-03-19-1906-enforce-session-correction-types.md`

Status in canonical:

- Kept

### 4. Keep workflow repetition plus codify candidates

Bring over:

- `## Workflow Repetition`
- `## Codify Candidates`

Why:

- This is the actual compounding mechanism.
- In `moves`, every sampled session used codify-candidate capture, and most
  targets were `history`, `agents`, or `skill` rather than new scripts.
- In `life.exe`, the most valuable repeated notes were about exact validation
  paths, runtime boundaries, and landing discipline.

How to use it:

- Record the repeated loop, not just the final code result.
- Promote only the smallest durable learning into history, AGENTS, a skill, or
  a review surface.

Evidence:

- `/Users/jamesdugle/Repos/moves/.harness/context/sessions/2026-03-25-2002-test-suite-audit-automation.md`
- `/Users/jamesdugle/Repos/life.exe/history/sessions/2026-03-23-021405-centralize-things-write-boundary-and-add-prod-ready-check.md`
- `/Users/jamesdugle/Repos/life.exe/history/sessions/2026-03-19-232315-refine-one-shot-mac-mini-bundle-handoff.md`

Status in canonical:

- Kept

### 5. Keep provider flexibility and local-only operator overrides

Bring over:

- primary plus fallback provider
- Copilot support
- local-only config overrides

Why:

- `moves` evolved toward multi-provider operation because a single provider is a
  real bottleneck.
- `mooo` shows that Copilot is a real production path, not a novelty adapter.

How to use it:

- Shared repo config chooses the normal provider and fallback.
- `.harness/config.local.yml` carries personal local overrides.
- Copilot stays an explicit operator choice, not a hidden default.

Evidence:

- `/Users/jamesdugle/Repos/moves/README.md`
- `/Users/jamesdugle/Repos/moves-algorithm/README.md`
- `/Users/jamesdugle/Repos/mooo/product-factory/README.md`

Status in canonical:

- Kept

### 6. Keep optional parallel local agent reviews, but only as ergonomics

Bring over:

- optional parallel agent reviews for the outer loop

Do not bring over:

- mandatory parallelism as a shared default

Why:

- It helps local speed, but it is not the conceptual core of the harness.
- The durable pattern is "make the outer loop less painful," not "always fan
  out."

Evidence:

- `/Users/jamesdugle/Repos/moves/.harness/context/sessions/2026-03-19-1734-parallel-agent-reviews.md`

Status in canonical:

- Kept as optional

### 7. Bring over the control-surface rule, not more scripts

Bring over:

- the principle that judgment-heavy problems should first be solved in
  AGENTS/skills/review prompts, not with a new deterministic script

Do not bring over:

- automatic script proliferation whenever a pattern appears twice

Why:

- One of the clearest `moves` traces shows an explicit correction away from a
  fresh script and toward the control surfaces the user actually trusted.

Evidence:

- `/Users/jamesdugle/Repos/moves/.harness/context/sessions/2026-03-25-2002-test-suite-audit-automation.md`

Status in canonical:

- Principle kept

## What Should Not Come Into Core Canonical

### 1. Session close-state machinery

Reason:

- The data matters; the lifecycle bit mostly created friction.

### 2. `life.exe` runtime governance

Do not bring into core:

- NanoClaw live-validation policy
- canary / prod-ready boundary checks
- brokered git or host-box coordination
- remote-first local `main` governance
- feature catalog plus monitor policy

Reason:

- These are strong ideas, but they are tightly coupled to a host-integrated
  runtime and a specific operational model.

### 3. `mooo` upmerge and remote runtime sync

Do not bring into core:

- VM runtime workspace sync
- upmerge timers
- bot-authored auto-merge PR loops

Reason:

- This is infrastructure for a remote self-editing agent environment, not a
  portable local harness default.

### 4. Project-specific agent event pipelines

Do not bring into core:

- per-run JSONL event logs and multi-judge task pipelines from
  `mooo/product-factory`

Reason:

- Useful for agentic products, but a different layer than the repo harness
  itself.

## Adapter Candidates For Later

These look promising as optional layers, not core defaults:

- runtime-validation adapter
- remote-runtime sync adapter
- governance adapter for feature/monitor catalogs
- stack adapters that keep the shared framework but adapt only repo-owned
  execution surfaces, as shown by `moves-algorithm`

## Bottom Line

The canonical harness should keep the parts that improved provenance and
learning across multiple repos:

- staged commit intent
- session notebooks
- structured corrections
- workflow repetition
- codify candidates
- provider flexibility

It should explicitly avoid importing the parts that only make sense inside
`life.exe` or `mooo`'s runtime models.
