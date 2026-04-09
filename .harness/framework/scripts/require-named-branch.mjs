#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { requireNamedBranch } from "../lib/git-state.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(HARNESS_ROOT, "..");

function logError(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
}

function main() {
  const args = process.argv.slice(2);
  const purposeIndex = args.indexOf("--purpose");
  const recoveryIndex = args.indexOf("--recovery-command");

  const purpose =
    purposeIndex !== -1 && args[purposeIndex + 1]
      ? args[purposeIndex + 1]
      : "durable git work";
  const recoveryCommand =
    recoveryIndex !== -1 && args[recoveryIndex + 1]
      ? args[recoveryIndex + 1]
      : "git checkout -b <branch-name>";

  try {
    const branch = requireNamedBranch({
      repoRoot: REPO_ROOT,
      purpose,
      recoveryCommand,
    });
    console.log(branch);
  } catch (error) {
    logError(error?.message || String(error));
    process.exit(1);
  }
}

main();
