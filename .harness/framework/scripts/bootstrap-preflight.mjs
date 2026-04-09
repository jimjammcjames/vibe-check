#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  analyzeBootstrapPreflight,
  formatBootstrapPreflight,
} from "../lib/bootstrap-preflight.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(HARNESS_ROOT, "..");

function logSuccess(msg) {
  console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
}

function logError(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
}

function main() {
  const args = process.argv.slice(2);
  const beforeIndex = args.indexOf("--before");
  const before =
    beforeIndex !== -1 && args[beforeIndex + 1]
      ? `harness:${args[beforeIndex + 1]}`
      : "the harness";

  const preflight = analyzeBootstrapPreflight({ repoRoot: REPO_ROOT });
  if (preflight.ok) {
    logSuccess(`Bootstrap preflight passed before ${before}`);
    return;
  }

  logError(formatBootstrapPreflight(preflight, { before }));
  process.exit(1);
}

main();
