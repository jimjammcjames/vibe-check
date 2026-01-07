# vibe-check

# vibe-check

vibe-check is a repo-agnostic agent harness: a portable folder + scripts that enforce compound engineering in any codebase.

The goal is simple:

**Let agents be imperfect. Make the repo enforce the outcomes.**

So you can “vibe code” while the harness hard-gates the stuff that makes the codebase safer and more self-improving over time.

## What “compound engineering” means here

This harness is built around a compounding loop that forces **reflective engineering**, not just bug-fixing:

1. **Look up prior context** (start with grep/search; retrieval can evolve later).
2. **If something similar exists** → reuse the established approach.
3. **If it’s a bug** → STOP. Don't just fix it. The harness forces you to ask:

   > _"Why did we run into this in the first place? Why wasn't it caught sooner?"_

   You capture a **Learned Entry** that identifies the _gap in visibility_, and you provide the test that closes that gap forever.

4. **If it’s a new feature / approach** → capture a small “decision” entry explaining the rationale.
5. **CI enforces** that the right proof exists before merge.

The point is: **we don’t trust the agent’s intentions; we verify the artifacts.** The memory system isn't just a history log—it is a **constantly evolving set of guardrails** that prevents regression classes, not just individual bugs.

## Repo layout

- **`.harness/`** – the harness “drop-in” payload (config + scripts live here). [GitHub]
- **`harness-tests/`** – tests that validate the harness itself (so you can iterate on the harness with confidence). [GitHub]
- **`.github/workflows/`** – CI wiring (runs the harness gates in automation). [GitHub]
- **`AGENTS.md`** – “pointer doc” for coding agents (what to read, what commands to run, what the workflow is). [GitHub]
- **`package.json`, `tsconfig.json`, `eslint.config.js`** – harness tooling. [GitHub]

## How it’s intended to be used

### 1) In this repo (developing the harness)

- Run the harness’s own test suite (`harness-tests/`) to ensure changes don’t break portability. [GitHub]
- Keep everything repo-agnostic: no assumptions about frameworks, no hard-coded paths outside the harness root.

### 2) In another repo (consuming the harness)

- Copy/paste `.harness/` into the target repo.
- Add minimal wiring:
  - **pre-commit hook** → points to harness pre-commit entry
  - **CI workflow** → runs harness CI entry
  - (optional) a tiny root **`AGENTS.md`** pointer so agents reliably find the entry point

That’s it. Everything else should flow from deterministic “pointers”:

- pre-commit failures
- CI failures
- explicit “prep” command output

## The “pointers” philosophy (why this works without tool wrappers)

You can’t reliably wrap Cursor/Claude/Codex/etc. across stacks.

So instead:

- you rely on **deterministic friction points** (pre-commit + CI) to force agents to see the harness entrypoint,
- and you keep the harness interface **terminal-first**: agents run commands, read the output, and iterate.

## Expected commands (fill in once you lock names)

This README intentionally stays neutral on exact script names until you finalize them in `package.json`. [GitHub]

Typical shape is:

- `npm run harness:prep` – prints the MUST workflow block + points to deeper docs
- `npm run harness:iterate` – “mid-iteration” gate (lint/format + fast checks)
- `npm run harness:ci` – full CI gate (includes compounding audit)
- `npm run harness:new:learned` – create a new learned entry (prompts for root cause + gap analysis)
- `npm run harness:new:decision` – create a new decision entry
- `npm test` (or similar) – runs `harness-tests/` to validate the harness itself [GitHub]

## What gets enforced (eventually / by design)

The enforcement stack is meant to live in `.harness` and be driven by config:

- **Local mid-iteration**: fast lint/format + sanity checks
- **Pre-commit**: prevent obviously broken changes from landing
- **CI**: hard gate everything, including “compound engineering” rules

Examples of compounding rules you can gate:

- “Meaningful code change must include either a Learned entry or a Decision entry”
- “Learned entry implies a test delta” (Did you actually close the gap you found?)
- “All context files must be coherent and tagged”

(Exact policy is up to your harness config and how strict you want v1 to be.)

## Non-goals (by design)

- Not a wrapper around a specific agent tool.
- Not a replacement for code review.
- Not trying to deterministically force agent reasoning _during_ work — only to enforce the artifacts by merge time.

## Roadmap ideas

- Better context lookup than grep (vector index / structured tagging)
- Optional “anti-gaming” reviewer pass (cheap model locally, stronger model in CI)
- Adapter packs per ecosystem (RN/Expo, Next.js, Go, Python, etc.)
- First-class dashboards for harness gates + failures
