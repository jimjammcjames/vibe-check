# Agent Setup Guide

> This doc is FOR agents. Follow each step in order. Each section uses CHECK/THEN logic — inspect existing state before making changes.

## Prerequisites

- `.harness/` and `workflows/` folders already copied to this repo
- Node.js 18+ installed
- npm available
- Git repo initialized
- `package.json` defines a `test` script (required by harness CI)

---

## 1. Dependencies (Check-Then-Install)

**CHECK** existing `package.json` for these packages in `dependencies` or `devDependencies`:

| Package             | Type          | Required For                |
| ------------------- | ------------- | --------------------------- |
| `yaml`              | dependency    | mcp-gen YAML parsing        |
| `eslint`            | dependency    | harness:iterate, harness:ci |
| `typescript`        | dependency    | harness:ci typecheck        |
| `typescript-eslint` | dependency    | TypeScript linting          |
| `@eslint/js`        | dependency    | ESLint flat config          |
| `tsx`               | devDependency | Test runner                 |
| `prettier`          | devDependency | harness:iterate formatting  |

**THEN** install only missing packages:

```bash
# Dependencies (only if missing)
npm install yaml eslint typescript typescript-eslint @eslint/js --save

# Dev dependencies (only if missing)
npm install tsx prettier --save-dev
```

---

## 2. package.json Scripts (Merge, Don't Replace)

**CHECK** existing `scripts` in `package.json`.

**THEN** ensure these scripts exist (preserve all existing scripts):

```json
{
  "harness:prep": "node .harness/framework/cli/harness.mjs prep",
  "harness:iterate": "node .harness/framework/cli/harness.mjs iterate",
  "harness:post": "node .harness/framework/cli/harness.mjs post",
  "harness:ci": "node .harness/framework/cli/harness.mjs ci",
  "harness:new:entry": "node .harness/framework/cli/harness.mjs new:entry",
  "harness:new:meta": "node .harness/framework/cli/harness.mjs new:meta",
  "mcp-gen": "node workflows/bin/mcp-gen"
}
```

**ALSO CHECK** `test` script exists:

```
IF "test" is missing:
  ADD a repo-appropriate test command
```

**ALSO CHECK** `"type"` field in package.json:

```
IF "type" is missing or not "module":
  SET "type": "module"
```

---

## 3. CI Setup

**CHECK** `.github/workflows/` directory.

**IF** no `harness.yml` exists:

```bash
mkdir -p .github/workflows
cp .harness/setup/harness-ci.yml .github/workflows/harness.yml
```

**IF** existing CI workflows exist (e.g., `ci.yml`, `test.yml`):

Consider one of:

1. Add `npm run harness:ci` as a step in existing workflow
2. Create separate `harness.yml` that runs alongside existing CI

The harness workflow should run on PRs to enforce gates before merge.

---

## 4. Config Customization (Infer from Repo)

**CHECK** repo structure to understand existing patterns:

```
SCAN for source directories:
- src/
- lib/
- app/
- packages/

SCAN for test patterns:
- *.test.ts, *.test.js, *.test.mjs
- *.spec.ts, *.spec.js
- __tests__/
- test/, tests/

SCAN for languages:
- *.ts, *.tsx → TypeScript
- *.js, *.jsx, *.mjs → JavaScript
- *.py → Python
- *.go → Go
```

**THEN** edit `.harness/config.yml` globs to match:

### globs.realCode

Add patterns for YOUR source files. Default is JS/TS:

```yaml
globs:
  realCode:
    - "src/**/*.ts"
    - "src/**/*.tsx"
    - "src/**/*.js"
    - "src/**/*.jsx"
```

Adapt for your structure (e.g., `app/**/*.ts`, `lib/**/*.py`).

### globs.tests

Add patterns for YOUR test files:

```yaml
tests:
  - "**/*.test.ts"
  - "**/*.test.js"
  - "**/*.spec.ts"
  - "**/__tests__/**"
```

### globs.exempt

Keep defaults, add repo-specific patterns if needed:

```yaml
exempt:
  - "*.json"
  - "*.md"
  - ".github/**"
  - ".gitignore"
```

---

## 5. Clear Source History

Remove history entries from the source repo (start fresh):

```bash
rm -rf .harness/context/history/*.md
```

---

## 6. Initial History Entry

Create the first meta entry documenting harness adoption:

```bash
npm run harness:new:meta -- --slug "adopt-harness"
```

**THEN** fill in the generated file with:

- Why the harness was adopted
- Any customizations made during setup
- Tag: `#harness-meta`

---

## 7. MCP Setup (If Applicable)

**CHECK** `workflows/mcp/servers.yml`:

```
IF servers array is empty ([]):
  Skip this section — no MCP servers to configure

IF servers are defined:
  Run: npm run mcp-gen
```

This generates:

- `.mcp.json` (Claude config, safe to commit)
- `.cursor/mcp.json` (Cursor config, auto-gitignored)

Gitignore patterns for secrets are auto-added on first run.

---

## 8. Verification

Run these commands to verify setup:

```bash
# Should print the MUST block from Harness.md
npm run harness:prep

# Should complete without error (if scripts were added correctly)
npm run harness:iterate
```

**Success criteria:**

- `harness:prep` prints the quick-start guide
- No "command not found" errors
- `.github/workflows/harness.yml` exists

---

## Summary Checklist

- [ ] Dependencies installed (only missing ones)
- [ ] Scripts merged into package.json
- [ ] `"type": "module"` set
- [ ] CI workflow copied to `.github/workflows/`
- [ ] Config globs adapted to repo structure
- [ ] Source history cleared
- [ ] Initial meta entry created
- [ ] MCP setup run (if applicable)
- [ ] Verification passed
