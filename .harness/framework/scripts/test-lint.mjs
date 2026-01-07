#!/usr/bin/env node

/**
 * Test Lint - Deterministic guardrails for test quality.
 *
 * Flags high-confidence anti-patterns:
 *  - no-op assertions (assert.ok(true), expect(true).toBe(true))
 *  - un-gated network calls in tests
 *  - source inspection of production code via readFileSync
 *  - key file usage (key.txt) in tests
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { minimatch } from "./minimatch.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(HARNESS_ROOT, "..");

const QUIET = process.env.HARNESS_QUIET === "1";

function log(msg) {
  if (!QUIET) console.log(msg);
}

function logError(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
}

function logSuccess(msg) {
  console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
}

function loadConfig() {
  const configPath = join(HARNESS_ROOT, "config.yml");
  if (!existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }
  const content = readFileSync(configPath, "utf-8");
  return parseSimpleYaml(content);
}

function parseSimpleYaml(content) {
  const config = { stages: {}, globs: {} };
  let currentSection = null;
  let currentGlob = null;

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed === "stages:") {
      currentSection = "stages";
      continue;
    }
    if (trimmed === "globs:") {
      currentSection = "globs";
      continue;
    }

    if (currentSection === "globs") {
      const globKeyMatch = trimmed.match(/^(\w+):(.*)$/);
      if (globKeyMatch) {
        const key = globKeyMatch[1];
        const value = globKeyMatch[2].trim();
        if (value && value !== "") {
          config.globs[key] = value.replace(/^["']|["']$/g, "");
        } else {
          currentGlob = key;
          config.globs[key] = [];
        }
        continue;
      }

      if (currentGlob && trimmed.startsWith("-")) {
        const pattern = trimmed
          .slice(1)
          .trim()
          .replace(/^["']|["']$/g, "");
        config.globs[currentGlob].push(pattern);
      }
    }
  }

  return config;
}

function matchesAnyGlob(file, patterns) {
  if (!patterns) return false;
  if (typeof patterns === "string") {
    patterns = [patterns];
  }
  return patterns.some((pattern) => minimatch(file, pattern));
}

function getDiffFiles() {
  try {
    let base;
    let diffFiles = [];

    try {
      base = execSync("git merge-base HEAD origin/main", {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch {
      try {
        base = execSync("git merge-base HEAD main", {
          cwd: REPO_ROOT,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
      } catch {
        try {
          execSync("git rev-parse HEAD~1", {
            cwd: REPO_ROOT,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          });
          base = "HEAD~1";
        } catch {
          base = null;
        }
      }
    }

    if (base) {
      diffFiles = execSync(`git diff --name-only ${base}`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
      })
        .trim()
        .split("\n")
        .filter(Boolean);
    }

    const staged = execSync("git diff --cached --name-only", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    return [...new Set([...diffFiles, ...staged, ...untracked])];
  } catch {
    return [];
  }
}

function collectTestFiles(diffFiles, config) {
  return diffFiles.filter((f) => matchesAnyGlob(f, config.globs.tests));
}

function analyzeTestContent(content) {
  const issues = [];

  const noOpAssertions = [
    /assert\.ok\s*\(\s*true\s*\)/,
    /assert\.strictEqual\s*\(\s*true\s*,\s*true\s*\)/,
    /assert\.deepStrictEqual\s*\(\s*true\s*,\s*true\s*\)/,
    /expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)/,
    /expect\s*\(\s*true\s*\)\s*\.toEqual\s*\(\s*true\s*\)/,
  ];

  if (noOpAssertions.some((rx) => rx.test(content))) {
    issues.push({
      code: "NO_OP_ASSERT",
      message: "No-op assertion detected (e.g., assert.ok(true))",
    });
  }

  const networkPatterns = [
    /\bfetch\s*\(/,
    /\bhttps\.request\s*\(/,
    /\bhttp\.request\s*\(/,
    /\baxios\./,
    /\bnode-fetch\b/,
    /\bundici\b/,
  ];

  const hasNetworkUsage = networkPatterns.some((rx) => rx.test(content));
  const hasNetworkGate = /HARNESS_ALLOW_NETWORK_TESTS/.test(content);
  if (hasNetworkUsage && !hasNetworkGate) {
    issues.push({
      code: "NETWORK_UNGATED",
      message:
        "Network usage in tests must be gated by HARNESS_ALLOW_NETWORK_TESTS",
    });
  }

  const keyFileUsage =
    content.includes("key.txt") &&
    /(readFileSync|existsSync|writeFileSync)\s*\(/.test(content);
  if (keyFileUsage) {
    issues.push({
      code: "KEY_FILE_USAGE",
      message: "Tests must not rely on key.txt",
    });
  }

  const readsSource =
    content.includes("readFileSync(") &&
    (content.includes(".harness/framework/") || content.includes("src/"));
  if (readsSource) {
    issues.push({
      code: "SOURCE_INSPECTION",
      message:
        "Tests should not inspect source files via readFileSync; assert behavior instead",
    });
  }

  return issues;
}

function checkTestFiles(testFiles) {
  const violations = [];

  for (const file of testFiles) {
    const fullPath = join(REPO_ROOT, file);
    if (!existsSync(fullPath)) continue;
    const content = readFileSync(fullPath, "utf-8");
    const issues = analyzeTestContent(content);
    if (issues.length > 0) {
      violations.push({ file, issues });
    }
  }

  return violations;
}

function main() {
  log("\n\x1b[36m=== Test Lint ===\x1b[0m\n");

  const config = loadConfig();
  const diffFiles = getDiffFiles();
  const testFiles = collectTestFiles(diffFiles, config);

  if (testFiles.length === 0) {
    logSuccess("No changed test files to lint");
    return;
  }

  const violations = checkTestFiles(testFiles);
  if (violations.length === 0) {
    logSuccess("Test lint passed");
    return;
  }

  for (const violation of violations) {
    logError(`Test lint failed: ${violation.file}`);
    for (const issue of violation.issues) {
      log(`  - [${issue.code}] ${issue.message}`);
    }
  }

  process.exit(1);
}

if (process.argv[1] === __filename) {
  main();
}

export {
  loadConfig,
  parseSimpleYaml,
  matchesAnyGlob,
  getDiffFiles,
  collectTestFiles,
  analyzeTestContent,
  checkTestFiles,
};
