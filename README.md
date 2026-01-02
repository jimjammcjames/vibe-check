# vibe-check

A harness for working with AI coding agents. Think of it like a safety net that helps you avoid the usual pitfalls when AI makes changes to your codebase.

## What's the point?

When AI agents make changes, they can break things or forget context between sessions. This harness forces them to document what they learn, write tests for bugs they fix, and follow consistent rules. Over time, you build up a knowledge base so future AI work gets better instead of repeating mistakes.

## Setup

```bash
npm install
npm run harness:prep    # Shows you the workflow commands
```

Then just work normally. The harness runs checks when you're ready to commit.

## Glossary

**`.harness/`** - All the harness machinery lives here. You mostly interact with it through npm scripts.

**`harness:prep`** - Prints the quick-start guide. Run this when you're confused.

**`harness:iterate`** - Lint and format your code as you go. Only checks files you changed.

**`harness:post`** - Full verification before you push. Checks that you documented your changes properly.

**`harness:ci`** - Runs the same checks as CI. Test locally before pushing.

**`.harness/context/learned/`** - Bug fixes and learnings get documented here. Each one requires a test.

**`.harness/context/decisions/`** - Architecture and design choices go here.

**Memory entries** - The learned and decision files. They need search terms, tags, and links to related entries. This builds up searchable context for future work.

**Rule A** - Change real code? Add a memory entry.

**Rule B** - Add a learned entry? Include a test.

**Rule C** - Add any memory entry? Include search terms, tags, and related links.

---

For the full details, see [.harness/Harness.md](.harness/Harness.md)
