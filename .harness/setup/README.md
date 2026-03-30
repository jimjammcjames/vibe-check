# Harness Setup

> ⚠️ **For initial installation only.** Agents: this file is for human setup — skip it and run `npm run harness:prep` instead.

After copying `.harness/` to your repo, run these steps to complete setup.

## 1. Create `AGENTS.md` at repo root

Copy this content to `AGENTS.md` in your repo root:

```markdown
# Agent Entry Point

**→ See [.harness/Harness.md](.harness/Harness.md) for the canonical workflow doc.**

**→ Run `npm run harness:prep` to get started.**
```

## 2. Add scripts to `package.json`

Merge these scripts into your existing `package.json`:

```json
{
  "scripts": {
    "harness:prep": "node .harness/framework/cli/harness.mjs prep",
    "harness:iterate": "node .harness/framework/cli/harness.mjs iterate",
    "harness:post": "node .harness/framework/cli/harness.mjs post",
    "harness:ci": "node .harness/framework/cli/harness.mjs ci",
    "harness:ci:copilot": "node .harness/framework/cli/harness.mjs ci --copilot",
    "harness:new:entry": "node .harness/framework/cli/harness.mjs new:entry",
    "harness:new:meta": "node .harness/framework/cli/harness.mjs new:meta",
    "harness:new:session": "node .harness/framework/cli/harness.mjs new:session"
  }
}
```

## 3. Add CI workflow (optional)

Copy `.harness/setup/harness-ci.yml` to `.github/workflows/harness.yml`:

```bash
mkdir -p .github/workflows
cp .harness/setup/harness-ci.yml .github/workflows/harness.yml
```

## 4. Customize globs (if needed)

Edit `.harness/config.yml` to match your project structure:

- `realCode` - patterns for your source files (default: `src/**/*.ts`)
- `exempt` - patterns to exclude from enforcement
- `tests` - patterns for test files
- `sessions` - session artifact locations

Optional local-only overrides belong in `.harness/config.local.yml` (gitignored).

## 5. Verify setup

```bash
npm run harness:prep
```

You should see the MUST block printed to your terminal.

---

## What's in this folder

| File             | Purpose                          |
| ---------------- | -------------------------------- |
| `README.md`      | This file - setup instructions   |
| `harness-ci.yml` | GitHub Actions workflow template |
