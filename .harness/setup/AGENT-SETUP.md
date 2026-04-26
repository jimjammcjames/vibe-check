# Agent Setup Guide

> This doc is for agents installing the harness into a new repo. Follow the checks in order and adapt the examples to the target project.

## 1. Verify prerequisites

- `.harness/` and `workflows/` are already copied in.
- `package.json` exists and has a repo-appropriate `test` script.
- `.nvmrc` and `package.json#engines` describe the repo runtime contract.
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
  "harness:bootstrap": "node .harness/framework/scripts/bootstrap-preflight.mjs",
  "harness:prep": "node .harness/framework/cli/harness.mjs prep",
  "harness:iterate": "node .harness/framework/cli/harness.mjs iterate",
  "harness:post": "node .harness/framework/cli/harness.mjs post",
  "harness:ci": "node .harness/framework/cli/harness.mjs ci",
  "harness:require-branch": "node .harness/framework/scripts/require-named-branch.mjs",
  "harness:new:entry": "node .harness/framework/cli/harness.mjs new:entry",
  "harness:new:meta": "node .harness/framework/cli/harness.mjs new:meta",
  "mcp-gen": "node workflows/bin/mcp-gen"
}
```

`harness:prep`, `harness:post`, and `harness:ci` already run bootstrap
preflight inside the CLI. Keep `harness:bootstrap` as the standalone diagnostic
surface; do not wrap the canonical scripts around it again.

## 4. Adapt config to the repo

Update `.harness/config.yml` based on the actual source and test layout:

- `globs.realCode`: source, scripts, harness framework files
- `globs.tests`: repo test patterns
- `globs.exempt`: docs and generated files that should not require history

If you need machine-local agent overrides, use an untracked local config
instead of editing the committed config. Shared repo-local overrides can live
under `<git common dir>/.harness/config.local.yml`, and a per-worktree
`.harness/config.local.yml` can override that shared layer when one checkout
needs to diverge intentionally.

## 5. Set up docs and CI

- Ensure `AGENTS.md` points agents to `.harness/Harness.md` and `npm run harness:prep`.
- Keep one canonical operator surface: `AGENTS.md` for entrypoint guidance,
  `.harness/Harness.md` for the durable workflow contract, `.harness/setup/*`
  for installation, `workflows/skills/*` for conditional playbooks, and
  `.harness/context/*` or a dedicated docs subtree for background research
  instead of repo-root memos.
- Copy `.harness/setup/harness-ci.yml` into `.github/workflows/` if the repo needs a dedicated workflow.
- If hosted CI will not have a runnable agent provider CLI/API configured, keep `HARNESS_ALLOW_MISSING_AGENT_PROVIDER=1` on the workflow step so deterministic checks still run while local `harness:ci` remains the full provider-backed outer loop.
- Upload `.harness/diagnostics/latest` as a workflow artifact so machine-readable review coverage and agent failure diagnostics survive each CI run.

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
