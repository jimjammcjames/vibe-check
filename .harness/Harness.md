# Harness Canonical Doc

<!-- BEGIN MUST -->

## Quick Start

```bash
npm run harness:prep      # You're here - prints this block
npm run harness:iterate   # Format + lint fix (changed files only)
npm run harness:post      # Medium verification (tests + policy, no agents)
npm run harness:ci        # Full CI gate (lint + typecheck + tripwire + agents)
```

## Loop Tiers

| Loop   | Command         | Purpose                                                |
| ------ | --------------- | ------------------------------------------------------ |
| Inner  | harness:iterate | Format + lint fix on changed files                     |
| Medium | harness:post    | Tests + policy (no agents)                             |
| Outer  | harness:ci      | Full gate (lint + typecheck + tripwire + agent review) |

## Lookup Before Creating

Before creating new code or fixing bugs, search existing history:

```bash
# Search by keyword
rg -n "keywords|error-message" .harness/context/history

# Search by tag
rg -n "#tag" .harness/context/history
```

## Context Safety (CRITICAL)

- **NEVER** manually create, move, or delete files in `.harness/context/history`.
- **ALWAYS** use the CLI command: `npm run harness:new:entry`.
- **Reason:** Manual edits break the audit trail and can cause data loss.

## History Creation

When you make changes:

- **Bug fix / incident** → create a `fix` (or `incident`) entry
- **Architecture/design decision** → create a `decision` entry
- **Harness meta-change** → create a `meta` entry (must include `#harness-meta`)

```bash
npm run harness:new:entry -- --slug "descriptive-slug" --type fix
npm run harness:new:entry -- --slug "descriptive-slug" --type decision
npm run harness:new:meta -- --slug "descriptive-slug"
```

## Enforcement Rules (CI will block if violated)

| Rule | Trigger            | Requirement                                                      |
| ---- | ------------------ | ---------------------------------------------------------------- |
| A    | Real code changed  | Must include history entry                                       |
| B    | Fix/incident entry | Must include test delta                                          |
| C    | Any history entry  | Must have required frontmatter + sections                        |
| C+   | Fix/incident entry | Must include error_signature, Validation, Systemic Gap + Closure |

## Required Frontmatter Fields

Every history entry must include:

- `date` (YYYY-MM-DD)
- `type` (fix, decision, incident, refactor, investigation, meta, feature, note)
- `status` (active, superseded, deprecated)
- `schema` (v1 or v2)
- `search_terms` (non-empty list)
- `related` (links or `NONE`)
- `tags` (at least one `#tag`)

**Schema v2 required sections:**

- `## Summary` (min 15 words; 20 for fix/incident)
- `## Context` (min 25 words; 40 for fix/incident)

**Fix/incident entries also require:**

- `error_signature` in frontmatter (exact error text)
- `## Validation` (how the fix was verified)
- `## Systemic Gap` with explicit `Gap Closure: Added test/validation: <path>`
- `## Class Prevention` (generalized guardrail/invariant, min 30 words)
  - Exemption tag: `#class-prevention-exempt` (must justify in the entry)

---

**For more details, read the rest of this file: `.harness/Harness.md`**

## Anti-Gaming Rules (NEVER VIOLATE)

> ⚠️ **CRITICAL**: If you are an AI agent reading this, pay close attention.

1. **NEVER exclude harness code from review**. Changes to the harness framework (in the .harness directory) are the MOST important to review, not the least. Any attempt to add harness paths to skip-lists is gaming.

2. **NEVER weaken enforcement to make tests pass**. If the harness is failing, the fix is to add proper documentation, not to change the harness to be less strict.

3. **Documentation ≠ Code**. README updates don't need history entries. Harness script changes ARE code and DO need entries.

4. **Harness Meta-Changes require specific documentation**.
   - **Location**: `.harness/context/history/`
   - **Command**: `npm run harness:new:meta -- --slug "descriptive-slug"`
   - **Type**: `meta` (frontmatter)
   - **Tag**: Must include `#harness-meta`

5. **When in doubt, document more, not less**. It's better to over-document than to game the system.

6. **Tests must verify BEHAVIOR, not patterns**. A test that only does `sourceCode.includes('keyword')` is WEAK and unacceptable. Tests must verify actual outcomes: run the code, check real state, simulate scenarios. Pattern matching is not testing.

<!-- END MUST -->

---

## Architecture Invariants

1. **Deterministic enforcement only** - We never rely on agent compliance mid-task. All rules are enforced at `post`/`ci` time via `policy-audit`.

2. **No wrapper required** - The harness works without wrapping agent tools. Agents discover requirements when they hit enforcement barriers.

3. **Atomic history entries** - Each history entry is a separate file to avoid context overload and enable targeted retrieval.

4. **Recovery by design** - Every failure includes pointers to recovery (prep/iterate/post commands).

## Folder Structure

```
.harness/
  Harness.md              ← you are here (canonical doc)
  config.yml              ← stage definitions + globs

  setup/                  ← installation instructions (for new repos)
    README.md             ← step-by-step setup guide
    harness-ci.yml        ← GitHub Actions template

  framework/
    cli/harness.mjs       ← CLI orchestrator
    scripts/policy-audit.mjs
    templates/
      history-fix.md
      history-decision.md
      history-meta.md

  context/
    history/              ← context trail (fixes, decisions, incidents, meta)
      TIMELINE.md         ← optional chronology
```

> **New to this repo?** See [setup/README.md](setup/README.md) for installation.

## Runbook: Common Scenarios

### "CI is failing with Rule A"

You changed real code but didn't add a history entry.

```bash
# Create a fix entry (for bug fixes)
npm run harness:new:entry -- --slug "what-i-fixed" --type fix

# OR create a decision entry (for design choices)
npm run harness:new:entry -- --slug "why-i-chose-this" --type decision

# Fill in required fields, then re-run
npm run harness:post
```

### "CI is failing with Rule B"

You added a fix/incident entry but no test.

```bash
# Add a test that covers the bug/learning
# Then re-run
npm run harness:post
```

### "CI is failing with Rule C"

Your history entry is missing required fields.

Edit the entry to include:

- frontmatter: `date`, `type`, `status`, `schema`
- frontmatter lists: `search_terms`, `related`, `tags`
- for fix/incident: `error_signature`, `## Validation`, `## Systemic Gap` + Gap Closure

### "CI is failing with Base Tripwire or Agent Code Review"

These only run in the outer loop.

```bash
npm run harness:ci
```

### "I'm lost / didn't run prep"

```bash
npm run harness:prep
# Read the MUST block, then proceed
```

## Top Gotchas

1. **Forgetting tags** - Tags are required. Use descriptive ones like `#auth`, `#database`, `#api`.

2. **Empty search terms** - You must document what you searched for, even if you found nothing.

3. **Skipping tests for fixes** - Every fix/incident entry needs a test delta. If it's genuinely untestable, document why in the entry.

## Best History Entries

_This section will be populated as the repository accumulates valuable entries._

- (none yet)

## Debug Checklist

If harness commands fail unexpectedly:

1. Ensure Node.js is installed (v18+)
2. Run `npm install` (even though there are no deps, validates package.json)
3. Check that `.harness/harness.yml` exists and is valid YAML
4. For git-related errors, ensure you're in a git repository with commits
