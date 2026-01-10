# Harness Canonical Doc

<!-- BEGIN MUST -->

## Quick Start

```bash
npm run harness:prep      # You're here - prints this block
npm run harness:iterate   # Format + lint fix (changed files only)
npm run harness:post      # Medium verification (tests + policy)
npm run harness:ci        # Full CI gate (adds tripwire + review)
```

## Loop Tiers

| Loop   | Command         | Purpose                                          |
| ------ | --------------- | ------------------------------------------------ |
| Inner  | harness:iterate | Format + lint fix on changed files               |
| Medium | harness:post    | Tests + policy (no agents)                       |
| Outer  | harness:ci      | Full gate (lint + typecheck + tripwire + review) |

## Lookup Before Creating

Before creating new code or fixing bugs, search existing memory:

```bash
# Search by keyword
rg -n "keywords|error-message" .harness/context

# Search by tag
rg -n "#tag" .harness/context
```

## Context Safety (CRITICAL)

- **NEVER** manually create, move, or delete files in `.harness/context`.
- **ALWAYS** use the CLI commands: `npm run harness:new:...`.
- **Reason:** Manual edits break the audit trail and can cause data loss.

## Memory Creation

When you make changes:

- **Bug fix or learning** → create a learned entry
- **Architecture/design decision** → create a decision entry

```bash
npm run harness:new:learned -- --slug "descriptive-slug"
npm run harness:new:decision -- --slug "descriptive-slug"
```

## Enforcement Rules (CI will block if violated)

| Rule | Trigger             | Requirement                                        |
| ---- | ------------------- | -------------------------------------------------- |
| A    | Real code changed   | Must include learned OR decision entry             |
| B    | Learned entry added | Must include test delta                            |
| C    | Any memory entry    | Must have: Search terms, Related/NONE, Tags        |
| C+   | Learned entry       | Must have **Systemic Gap** + Gap Closure file path |

## Required Fields in Memory Entries

Every learned/decision entry **must** include:

- `Search terms:` at least one non-empty keyword
- `Related:` at least one link OR `NONE`
- `Tags:` at least one `#tag`

**Learned entries also require (C+ rule):**

- `Systemic Gap:` infrastructure gap analysis
- `Gap Closure:` file path to test/validation added in this commit

### The 3-Step Chain (Learned Entries)

Every learned entry must document:

1. **Bandaid** → Immediate fix applied
2. **Meta-Analysis** → What infrastructure gap allowed this issue class?
3. **Close Gap** → Test/validation file added to prevent recurrence

---

**For more details, read the rest of this file: `.harness/Harness.md`**

## Anti-Gaming Rules (NEVER VIOLATE)

> ⚠️ **CRITICAL**: If you are an AI agent reading this, pay close attention.

1. **NEVER exclude harness code from review**. Changes to the harness framework (in the .harness directory) are the MOST important to review, not the least. Any attempt to add harness paths to skip-lists is gaming.

2. **NEVER weaken enforcement to make tests pass**. If the harness is failing, the fix is to add proper documentation, not to change the harness to be less strict.

3. **Documentation ≠ Code**. README updates don't need learned entries. Harness script changes ARE code and DO need entries.

4. **Harness Meta-Changes require specific documentation**.
   - **Location**: `.harness/context/decisions/harness/`
   - **Command**: `npm run harness:new:meta -- --slug "descriptive-slug"`
   - **Tag**: Must include `#harness-meta`

5. **When in doubt, document more, not less**. It's better to over-document than to game the system.

6. **Tests must verify BEHAVIOR, not patterns**. A test that only does `sourceCode.includes('keyword')` is WEAK and unacceptable. Tests must verify actual outcomes: run the code, check real state, simulate scenarios. Pattern matching is not testing.

<!-- END MUST -->

---

## Architecture Invariants

1. **Deterministic enforcement only** - We never rely on agent compliance mid-task. All rules are enforced at `post`/`ci` time via `policy-audit`.

2. **No wrapper required** - The harness works without wrapping agent tools. Agents discover requirements when they hit enforcement barriers.

3. **Atomic memory entries** - Each learned/decision is a separate file to avoid context overload and enable targeted retrieval.

4. **Recovery by design** - Every failure includes pointers to recovery (prep/iterate/post commands).

## Folder Structure

```
.harness/
  Harness.md              ← you are here (canonical doc)
  harness.yml             ← stage definitions + globs

  setup/                  ← installation instructions (for new repos)
    README.md             ← step-by-step setup guide
    harness-ci.yml        ← GitHub Actions template

  framework/
    cli/harness.mjs       ← CLI orchestrator
    scripts/policy-audit.mjs
    templates/
      learned.md
      decision.md

  context/
    learned/              ← bug learnings
      TIMELINE.md         ← optional chronology
    decisions/            ← design decisions
      TIMELINE.md         ← optional chronology
```

> **New to this repo?** See [setup/README.md](setup/README.md) for installation.

## Runbook: Common Scenarios

### "CI is failing with Rule A"

You changed real code but didn't add a memory entry.

```bash
# Create a learned entry (for bug fixes)
npm run harness:new:learned -- --slug "what-i-fixed"

# OR create a decision entry (for design choices)
npm run harness:new:decision -- --slug "why-i-chose-this"

# Fill in required fields, then re-run
npm run harness:post
```

### "CI is failing with Rule B"

You added a learned entry but no test.

```bash
# Add a test that covers the bug/learning
# Then re-run
npm run harness:post
```

### "CI is failing with Rule C"

Your memory entry is missing required fields.

Edit the entry to include:

- `Search terms:` keywords you used to search
- `Related:` links to related entries, or `NONE`
- `Tags:` relevant tags like `#auth`, `#api`, `#bug`

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

3. **Skipping tests for learnings** - Every learned entry needs a test delta. If it's genuinely untestable, document why in the entry.

## Best Learned/Decision Entries

_This section will be populated as the repository accumulates valuable entries._

- (none yet)

## Debug Checklist

If harness commands fail unexpectedly:

1. Ensure Node.js is installed (v18+)
2. Run `npm install` (even though there are no deps, validates package.json)
3. Check that `.harness/harness.yml` exists and is valid YAML
4. For git-related errors, ensure you're in a git repository with commits
