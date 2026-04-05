#!/usr/bin/env node

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveBaseRef } from "../lib/base-ref.mjs";
import { loadHarnessConfig } from "../lib/harness-config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(HARNESS_ROOT, "..");

function parseReviewerArg(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if ((value === "--reviewer" || value === "-r") && argv[index + 1]) {
      return argv[index + 1];
    }
  }

  const positional = argv.find((value) => !value.startsWith("-"));
  return positional || null;
}

const reviewerName = parseReviewerArg(process.argv.slice(2));
const config = loadHarnessConfig({ harnessRoot: HARNESS_ROOT });
const baseRef = resolveBaseRef({
  config,
  reviewerName,
  repoRoot: REPO_ROOT,
});

console.log(baseRef);
