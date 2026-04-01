# Harness Canonical Doc

<!-- BEGIN MUST -->

## Quick Start

```bash
npm run harness:prep              # You're here - prints this block
npm run harness:iterate           # Format + lint fix (changed files only)
npm run harness:post              # Medium verification (tests + policy, no agents)
npm run harness:post -- --staged  # Staged commit-intent gate
npm run harness:ci                # Outer loop only: PR update / merge gate
```

## Loop Tiers

| Loop   | Command                  | Purpose                                         |
| ------ | ------------------------ | ----------------------------------------------- |
| Inner  | harness:iterate          | Format + lint fix on changed files              |
| Medium | harness:post             | Tests + policy (no agents)                      |
| Commit | harness:post -- --staged | Staged history + staged session coverage        |
| Outer  | harness:ci               | Full gate for PR creation/update or final merge |

- `harness:ci` is not your every-save loop. Use it right before pushing a PR
  update or before merging.
- When a bug repeats or review feedback repeats, prefer adding deterministic
  tests, review skills, or prompt improvements before inventing a new gate.
- Add new blockers only when they are deterministic, cheap, and clearly
  leverage future diffs.

## Agent Runtime Requirements

- Gemini remains the default provider in this repo.
- Fallback provider support is available through `agents.fallback_provider`.
- Use Codex for agent steps with `npm run harness:ci -- --codex`.
- Use GitHub Copilot CLI for agent steps with `npm run harness:ci -- --copilot`.
- Override provider directly with `npm run harness:ci -- --provider <name>`.
- Local-only agent overrides belong in `.harness/config.local.yml` (gitignored).
- Agent runtime failures are logged to
  `.harness/diagnostics/latest/agent-failures.log`.

Useful env/config overrides:

- `HARNESS_PROVIDER` / `agents.provider`
- `HARNESS_GEMINI_MODEL` / `agents.gemini_model`
- `HARNESS_CODEX_MODEL` / `agents.codex_model`
- `HARNESS_CODEX_REASONING` / `agents.codex_reasoning`
- `HARNESS_COPILOT_MODEL` / `agents.copilot_model`
- `HARNESS_COPILOT_REASONING` / `agents.copilot_reasoning`
- `HARNESS_COPILOT_CONFIG_DIR` / `agents.copilot_config_dir`
- `HARNESS_PARALLEL_AGENT_REVIEWS=1` / `agents.parallel_agent_reviews: true`

## Lookup Before Creating

Before creating new code or fixing bugs, search existing history:

```bash
rg -n "keywords|error-message" .harness/context/history
rg -n "#tag" .harness/context/history
```

## Context Safety (CRITICAL)

- **NEVER** manually create, move, or delete files in
  `.harness/context/history` or `.harness/context/sessions`.
- **ALWAYS** use the CLI commands:
  `npm run harness:new:entry`, `npm run harness:new:meta`, and
  `npm run harness:new:session`.
- **Reason:** manual artifact edits are easy to get wrong and break the audit
  trail.

## Context Creation

When you make changes:

- **Bug fix / incident** -> create a `fix` or `incident` entry
- **Architecture / design decision** -> create a `decision` entry
- **Harness-core change** -> create a `meta` entry with `#harness-meta`
- **Active task context** -> create a `session` entry before staged real-code
  commits

```bash
npm run harness:new:session -- --slug "task-name"
npm run harness:new:entry -- --slug "change-slug" --type fix
npm run harness:new:entry -- --slug "change-slug" --type decision
npm run harness:new:meta -- --slug "harness-change"
```

Session files are append-only task notes. There is no close command.
If more than one same-day session exists, rerun `new:entry` or `new:meta` with
`--session-slug <task-name>` so the new history entry links to the right task.

## Enforcement Rules

| Rule | Trigger            | Requirement                                                      |
| ---- | ------------------ | ---------------------------------------------------------------- |
| A    | Real code changed  | Must include history entry                                       |
| B    | Fix/incident entry | Must include test delta                                          |
| C    | Any history entry  | Must have required frontmatter + required sections               |
| C+   | Fix/incident entry | Must include error_signature, Validation, Systemic Gap + Closure |
| S    | Any session entry  | Must have required frontmatter + required sections               |
| D    | Staged real code   | Must include staged history + staged session coverage            |

## Required Frontmatter Fields

Every history entry must include:

- `date` (YYYY-MM-DD)
- `type` (fix, decision, incident, refactor, investigation, meta, feature, note)
- `status` (active, superseded, deprecated)
- `schema` (`v3` for new or edited entries)
- `search_terms` (non-empty list)
- `related_entries` (links or `NONE`)
- `affected_files` (exact repo-relative code paths or `NONE`)
- `session_refs` (linked session files or `NONE`)
- `tags` (at least one `#tag`)

**Schema v3 required sections for non-meta history entries:**

- `## Summary`
- `## Request / Intent`
- `## Context`
- `## Validation`

**Decision-style entries also require:**

- `## Decision`
- `## Rationale`
- `## Consequences`

**Fix / incident entries also require:**

- `error_signature` in frontmatter
- `## Error`
- `## What Changed`
- `## Systemic Gap` with explicit `Gap Closure: Added test/validation: <path>`
- `## Class Prevention`

Every session entry must include:

- `date`
- `started_at`
- `tags`
- `related_history`
- `skills_used`

Session links in `related_history` and history `session_refs` should stay exact
and repo-relative.

**Required session sections:**

- `## Summary`
- `## User Intent`
- `## Timeline`
- `## Corrections & Thrash`
- `## Workflow Repetition`
- `## Codify Candidates`
- `## Outcome`

**Structured session bullet formats:**

- Timeline: `- [HH:MM] user:` / `- [HH:MM] assistant:` or `- [seq-01]`
- Corrections: `- user_correction:` / `- agent_correction:` /
  `- process_issue:` / `- thrash:`
- Workflow: `- repeated_workflow:` / `- custom_script:`
- Codify: `- candidate: target=skill|agents|history; ...`

## Commit-Time Intent

`npm run harness:post -- --staged` reads only the git index.

If staged non-exempt real code exists, the same staged set must also include:

- at least one history entry update
- at least one session file update
- `affected_files` coverage for every staged real-code path
- at least one `session_refs` link from a staged history entry to a staged
  session file

If you wire a pre-commit hook in a consuming repo, this is the command to run.

---

**For more details, read the rest of this file: `.harness/Harness.md`**

## Anti-Gaming Rules

1. **NEVER exclude harness code from review**. Harness-core changes matter more,
   not less.
2. **NEVER weaken enforcement to make tests pass**. Fix the missing artifact or
   deterministic validation instead.
3. **Documentation != code**. Plain docs do not need history entries; harness
   scripts and enforcement changes do.
4. **Harness meta-changes require history only for harness-core enforcement
   changes**. Context artifact edits alone do not require extra meta entries.
5. **When in doubt, document more, not less**.
6. **Tests must verify behavior, not pattern matches**.

## Skills Sync

- `npm run harness:prep` refreshes the generated Skills Overview block in
  `AGENTS.md`.
- Keep long-lived agent guidance short in `AGENTS.md`; put scenario-specific
  playbooks in `workflows/skills/*`.

<!-- END MUST -->

---

## Architecture Invariants

1. **Deterministic enforcement only**. The harness should not depend on agents
   voluntarily behaving well mid-task.
2. **No wrapper required**. The terminal workflow and the gates are enough.
3. **Atomic context artifacts**. History and sessions are separate because they
   answer different questions.
4. **Recovery by design**. Every failure should point back to prep, post, or CI.
5. **Commit provenance is staged-only**. Commit-time intent should describe the
   actual index, not the working tree.

## Folder Structure

```text
.harness/
  Harness.md
  config.yml

  setup/
    README.md
    harness-ci.yml

  framework/
    cli/harness.mjs
    lib/
    providers/
    scripts/
    templates/
      history-fix.md
      history-decision.md
      history-meta.md
      session.md

  context/
    history/
    sessions/
```

## Runbook

### "Rule A failed"

You changed real code without a history entry.

```bash
npm run harness:new:entry -- --slug "what-changed" --type fix
# or
npm run harness:new:entry -- --slug "why-we-chose-this" --type decision
```

### "Rule B failed"

You added a fix/incident entry without a test delta.

```bash
# Add the regression test, then rerun:
npm run harness:post
```

### "Rule C failed"

Your history entry is missing required v3 fields or sections.

Check:

- `related_entries`
- `affected_files`
- `session_refs`
- `## Request / Intent`
- `## Validation`
- fix-only sections when applicable

### "Rule S failed"

Your session entry is missing required fields or structured bullets.

Check:

- `started_at`
- `related_history`
- `skills_used`
- the seven required session sections
- the structured correction/workflow/codify bullet formats

### "Rule D failed"

You staged real code without staging the matching context artifacts.

```bash
npm run harness:new:session -- --slug "task-name"
npm run harness:new:entry -- --slug "change-slug" --type decision
```

Then fill in `affected_files`, link `session_refs`, stage the artifacts, and rerun:

```bash
npm run harness:post -- --staged
```

### "I just need the outer loop"

```bash
npm run harness:ci
```

### "I am lost"

```bash
npm run harness:prep
```

## Debug Checklist

1. Ensure Node.js is installed.
2. Run `npm install`.
3. Check that `.harness/config.yml` exists and is valid YAML.
4. If agent providers fail, verify the selected CLI is installed and logged in.
5. If git-related commands fail, make sure you are inside a git repository with
   at least one commit.
