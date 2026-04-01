# Agent Setup Guide

> This doc is for agents installing the harness into a new repo. Follow the checks in order and adapt the examples to the target project.

## 1. Verify prerequisites

- `.harness/` and `workflows/` are already copied in.
- `package.json` exists and has a repo-appropriate `test` script.
- Node.js and npm are available.
- Git is initialized.

## 2. Install only missing dependencies

Check `package.json` first, then add the missing pieces:

- Runtime: `yaml`, `eslint`, `typescript`, `typescript-eslint`, `@eslint/js`
- Dev: `tsx`, `prettier`

## 3. Merge harness scripts

Preserve existing scripts and ensure these exist:

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

## 4. Adapt config to the repo

Update `.harness/config.yml` based on the actual source and test layout:

- `globs.realCode`: source, scripts, harness framework files
- `globs.tests`: repo test patterns
- `globs.exempt`: docs and generated files that should not require history

If you need machine-local agent overrides, use `.harness/config.local.yml` instead of editing the committed config.

## 5. Set up docs and CI

- Ensure `AGENTS.md` points agents to `.harness/Harness.md` and `npm run harness:prep`.
- Copy `.harness/setup/harness-ci.yml` into `.github/workflows/` if the repo needs a dedicated workflow.

## 6. Create the initial harness meta entry

Document adoption with:

```bash
npm run harness:new:meta -- --slug "adopt-harness"
```

## 7. Verify the install

Run:

```bash
npm run harness:prep
npm run harness:iterate
```

The repo is ready once `prep` prints the MUST block and `iterate` completes without missing-command errors.
