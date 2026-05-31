#!/usr/bin/env node

import process from "node:process";

const args = new Set(process.argv.slice(2));
const readFromStdin = args.has("--stdin");
const acknowledgedMixedScope = args.has("--ack-mixed");

const TOOLING_FILES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.json",
  "tsconfig.base.json",
  "tsconfig.build.json",
  "tsconfig.eslint.json",
  "jest.config.js",
  "jest.config.cjs",
  "jest.setup.js",
  "jest.setup.ts",
  "vitest.config.js",
  "vitest.config.ts",
  ".eslintrc",
  ".eslintrc.cjs",
  ".eslintrc.js",
  ".eslintignore",
  ".prettierignore",
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.js",
  ".nvmrc",
  ".tool-versions",
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
  "pytest.ini",
  "ruff.toml",
  "Makefile",
]);

function classifyFile(file) {
  if (!file) return "other";

  if (file.startsWith(".harness/")) return "harness";
  if (file.startsWith("workflows/")) return "workflow";

  if (
    TOOLING_FILES.has(file) ||
    /^tsconfig(\..+)?\.json$/u.test(file) ||
    /^requirements([-.].+)?\.txt$/u.test(file)
  ) {
    return "tooling";
  }

  if (file.startsWith("docs/") || /\.(md|txt|rst)$/u.test(file)) {
    return "docs";
  }

  return "runtime";
}

function bucketLabel(bucket) {
  switch (bucket) {
    case "harness":
      return "Harness";
    case "workflow":
      return "Workflow";
    case "tooling":
      return "Tooling";
    case "runtime":
      return "Runtime";
    case "docs":
      return "Docs";
    default:
      return "Other";
  }
}

async function readFiles() {
  if (readFromStdin) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return chunks
      .join("")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
}

function printBuckets(buckets) {
  const ordered = [
    "harness",
    "workflow",
    "tooling",
    "runtime",
    "docs",
    "other",
  ];

  console.log("Merge payload categories:");
  for (const key of ordered) {
    const files = buckets.get(key);
    if (!files?.length) continue;
    console.log(`- ${bucketLabel(key)} (${files.length})`);
    for (const file of files) {
      console.log(`  - ${file}`);
    }
  }
}

const files = await readFiles();
const buckets = new Map();

for (const file of files) {
  const bucket = classifyFile(file);
  const bucketFiles = buckets.get(bucket) ?? [];
  bucketFiles.push(file);
  buckets.set(bucket, bucketFiles);
}

printBuckets(buckets);

const hasGovernanceSurface =
  (buckets.get("harness")?.length ?? 0) > 0 ||
  (buckets.get("workflow")?.length ?? 0) > 0 ||
  (buckets.get("tooling")?.length ?? 0) > 0;
const hasRuntimeSurface = (buckets.get("runtime")?.length ?? 0) > 0;

if (files.length === 0) {
  console.log("No staged files were provided.");
  process.exit(0);
}

if (hasGovernanceSurface && hasRuntimeSurface && !acknowledgedMixedScope) {
  console.error(
    "\nMixed-scope merge payload detected across harness/workflow/tooling and runtime paths.",
  );
  console.error(
    "Inspect the payload before committing. If the mixed scope is intentional, document it and rerun with --ack-mixed.",
  );
  process.exit(2);
}

if (hasGovernanceSurface && hasRuntimeSurface && acknowledgedMixedScope) {
  console.log("\nMixed-scope payload acknowledged.");
}
