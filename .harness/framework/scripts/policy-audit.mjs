#!/usr/bin/env node

/**
 * Policy Audit - Deterministic Compounding Enforcement
 *
 * Rules:
 *   A: Real code change → Must include learned OR decision entry
 *   B: Learned entry → Must include test delta
 *   C: Memory entry → Must have required fields (Search terms, Related, Tags)
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

// ============================================================================
// Utilities
// ============================================================================

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

function logWarning(msg) {
  console.log(`\x1b[33m⚠ ${msg}\x1b[0m`);
}

function printRecoveryPointers() {
  log(`
\x1b[33m───────────────────────────────────────────────────────────────────────\x1b[0m
\x1b[33mRecovery:\x1b[0m
  1. Rerun the right stage:
     - \x1b[36mnpm run harness:iterate\x1b[0m (format + lint fix on changed files)
     - \x1b[36mnpm run harness:post\x1b[0m (medium verification: tests + policy)
     - \x1b[36mnpm run harness:ci\x1b[0m (full verification: lint + typecheck + tripwire + review)
  2. If you didn't run prep (or you're stuck):
     - \x1b[36mnpm run harness:prep\x1b[0m (prints MUST summary + grep recipe)
  3. For details:
     - open \x1b[36m.harness/Harness.md\x1b[0m
\x1b[33m───────────────────────────────────────────────────────────────────────\x1b[0m
`);
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

function getDiffFiles() {
  try {
    // Get files changed compared to the merge base (for PRs)
    // Fall back to HEAD~1 if no merge base exists
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
        // Try HEAD~1
        try {
          execSync("git rev-parse HEAD~1", {
            cwd: REPO_ROOT,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          });
          base = "HEAD~1";
        } catch {
          // Single commit repo - compare against empty tree
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

    // Also include staged files
    const staged = execSync("git diff --cached --name-only", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    // Also include untracked files (new files not yet staged)
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

function matchesAnyGlob(file, patterns) {
  if (!patterns) return false;
  if (typeof patterns === "string") {
    patterns = [patterns];
  }
  return patterns.some((pattern) => minimatch(file, pattern));
}

function getAddedEntryContent(file) {
  try {
    // Check if file exists and read it
    const fullPath = join(REPO_ROOT, file);
    if (existsSync(fullPath)) {
      return readFileSync(fullPath, "utf-8");
    }
    return null;
  } catch {
    return null;
  }
}

function validateEntryContent({ content, isLearnedEntry, diffFiles }) {
  const issues = [];

  // Check for Search terms
  const searchTermsMatch = content.match(
    /## Search terms\s*\n([\s\S]*?)(?=\n##|$)/,
  );
  if (!searchTermsMatch) {
    issues.push({
      code: "SEARCH_MISSING",
      message: 'Missing "## Search terms" section',
      fix: "Add the section with at least one keyword to help future devs find this.",
    });
  } else {
    const searchContent = searchTermsMatch[1].trim();
    const hasContent = searchContent.split("\n").some((line) => {
      const cleaned = line.replace(/^[-*]\s*/, "").trim();
      return cleaned.length > 0;
    });
    if (!hasContent) {
      issues.push({
        code: "SEARCH_EMPTY",
        message: '"Search terms" section is empty',
        fix: "Add at least one keyword in the Search terms section.",
      });
    }
  }

  // Check for Related
  const relatedMatch = content.match(/## Related\s*\n([\s\S]*?)(?=\n##|$)/);
  if (!relatedMatch) {
    issues.push({
      code: "RELATED_MISSING",
      message: 'Missing "## Related" section',
      fix: 'Add the section with links to related entries or "NONE".',
    });
  } else {
    const relatedContent = relatedMatch[1].trim();
    if (
      !relatedContent ||
      relatedContent === "" ||
      (!relatedContent.includes("NONE") &&
        !relatedContent.includes("http") &&
        !relatedContent.includes(".md"))
    ) {
      issues.push({
        code: "RELATED_INVALID",
        message: '"Related" must contain links OR "NONE"',
        fix: 'Use "NONE" or provide a link to a related entry/issue.',
      });
    }
  }

  // Check for Tags
  const tagsMatch = content.match(/## Tags\s*\n([\s\S]*?)(?=\n##|$)/);
  if (!tagsMatch) {
    issues.push({
      code: "TAGS_MISSING",
      message: 'Missing "## Tags" section',
      fix: "Add the section with at least one #tag.",
    });
  } else {
    const tagsContent = tagsMatch[1].trim();
    if (!tagsContent.includes("#")) {
      issues.push({
        code: "TAGS_INVALID",
        message: '"Tags" must contain at least one #tag',
        fix: "Add a hashtag tag like #bug or #infrastructure.",
      });
    }
  }

  // SYSTEMIC GAP ENFORCEMENT (learned entries only)
  // Enforces 3-step chain: Bandaid → Meta-Analysis → Close Gap
  if (isLearnedEntry) {
    // FIX: Robust regex that only stops at H2 (## ) or EOF, allowing H3 (###) inside the section
    const gapMatch = content.match(
      /## Systemic Gap\s*\n([\s\S]*?)(?=\n---|\n## |$)/,
    );

    if (!gapMatch) {
      issues.push({
        code: "GAP_MISSING",
        message: 'Missing "## Systemic Gap" section',
        fix: 'Add the section. It is required for all Learned entries to prevent "bandaid" fixes.',
      });
    } else {
      const gapContent = gapMatch[1].trim();

      // Must have substantive content (not just template text)
      if (
        gapContent.length < 50 ||
        gapContent.includes("[What infrastructure gap")
      ) {
        issues.push({
          code: "GAP_SHALLOW",
          message:
            '"Systemic Gap" section is too brief or contains template text',
          fix: "Analyze the ROOT CAUSE only. Why did the system allow this bug? (min 50 chars)",
        });
      }

      // Must contain Gap Closure evidence with file path
      if (
        !gapContent.includes("Gap Closure") &&
        !gapContent.includes("Added test") &&
        !gapContent.includes("Added validation") &&
        !gapContent.includes("Added pre-flight")
      ) {
        issues.push({
          code: "GAP_EVIDENCE_MISSING",
          message: 'Systemic Gap requires explicit "Gap Closure" evidence',
          fix: 'Add the phrase "Gap Closure: Added validation: <filename>" or "Added test: <filename>" to the section.',
        });
      } else {
        // Extract file paths from Gap Closure section
        const filePathMatches = gapContent.match(
          /(?:Added (?:test|validation|pre-flight)[:\s]+)[`"']?([^`"'\n]+(?:\.mjs|\.ts|\.js|\.md))/gi,
        );

        if (filePathMatches) {
          // Check if at least one referenced file appears in diff
          const referencedPaths = filePathMatches
            .map((m) => {
              const pathMatch = m.match(
                /[`"']?([^`"'\n]+(?:\.mjs|\.ts|\.js|\.md))/,
              );
              return pathMatch
                ? pathMatch[1].replace(/^[`"']|[`"']$/g, "")
                : null;
            })
            .filter(Boolean);

          const foundInDiff = referencedPaths.some((refPath) => {
            // Check if this path appears in any diff file
            return diffFiles.some(
              (diffFile) =>
                diffFile.includes(refPath) ||
                refPath.includes(diffFile.split("/").pop()),
            );
          });

          if (!foundInDiff && referencedPaths.length > 0) {
            issues.push({
              code: "GAP_FILE_NOT_IN_DIFF",
              message:
                "Gap Closure references file(s) not found in the current commit/diff",
              context: referencedPaths.join(", "),
              fix: "Ensure the validation file you mention is actually being committed (git add it).",
            });
          }
        }
      }
    }
  }

  return issues;
}

// ============================================================================
// Rule Checks
// ============================================================================

function checkRuleA(diffFiles, config) {
  // Real code change → learned OR decision
  const realCodeFiles = diffFiles.filter((f) =>
    matchesAnyGlob(f, config.globs.realCode),
  );
  // Check if we have real code changes (not just exempt files)
  const nonExemptRealCode = realCodeFiles.filter(
    (f) => !matchesAnyGlob(f, config.globs.exempt),
  );

  if (nonExemptRealCode.length === 0) {
    return { passed: true, message: "No real code changes detected" };
  }

  // Check for memory entries
  const learnedFiles = diffFiles.filter(
    (f) =>
      matchesAnyGlob(f, config.globs.learned) && !f.endsWith("TIMELINE.md"),
  );
  const decisionFiles = diffFiles.filter(
    (f) =>
      matchesAnyGlob(f, config.globs.decisions) && !f.endsWith("TIMELINE.md"),
  );

  if (learnedFiles.length === 0 && decisionFiles.length === 0) {
    return {
      passed: false,
      message: `Rule A violated: Real code changed but no memory entry found.
      
Changed code files:
${nonExemptRealCode.map((f) => `  - ${f}`).join("\n")}

Fix: Create a learned OR decision entry:
  npm run harness:new:learned -- --slug "your-slug"
  npm run harness:new:decision -- --slug "your-slug"`,
    };
  }

  return {
    passed: true,
    message: `Real code changes accompanied by memory entries`,
    learnedFiles,
    decisionFiles,
  };
}

function checkRuleB(diffFiles, config, learnedFiles) {
  // Learned entry → test delta
  if (!learnedFiles || learnedFiles.length === 0) {
    return { passed: true, message: "No learned entries to check" };
  }

  const testFiles = diffFiles.filter((f) =>
    matchesAnyGlob(f, config.globs.tests),
  );

  if (testFiles.length === 0) {
    return {
      passed: false,
      message: `Rule B violated: Learned entry added but no test delta found.
      
Learned entries:
${learnedFiles.map((f) => `  - ${f}`).join("\n")}

Fix: Add a test that covers this learning.
If truly untestable, document why in the learned entry.`,
    };
  }

  return { passed: true, message: "Learned entries have accompanying tests" };
}

function checkRuleC(diffFiles, config) {
  // Memory entry → required fields
  const learnedFiles = diffFiles.filter((f) =>
    matchesAnyGlob(f, config.globs.learned),
  );
  const decisionFiles = diffFiles.filter((f) =>
    matchesAnyGlob(f, config.globs.decisions),
  );
  const memoryFiles = [...learnedFiles, ...decisionFiles];

  if (memoryFiles.length === 0) {
    return { passed: true, message: "No memory entries to validate" };
  }

  const violations = [];

  for (const file of memoryFiles) {
    const content = getAddedEntryContent(file);
    if (!content) continue;

    // Skip TIMELINE.md - it is a manifest, not a memory entry
    if (file.endsWith("TIMELINE.md")) continue;

    const issues = validateEntryContent({
      content,
      isLearnedEntry: learnedFiles.includes(file),
      diffFiles,
    });

    if (issues.length > 0) {
      violations.push({ file, issues });
    }
  }

  if (violations.length > 0) {
    const details = violations
      .map(
        (v) =>
          `  \x1b[1m${v.file}\x1b[0m:\n${v.issues.map((i) => `    - \x1b[31m[${i.code || "ERROR"}]\x1b[0m ${i.message}\n      \x1b[36mFix:\x1b[0m ${i.fix || "Correct the issue."}`).join("\n")}`,
      )
      .join("\n\n");

    return {
      passed: false,
      message: `Rule C violated: Memory entries missing required fields.

${details}

Required fields in every memory entry:
  - ## Search terms (with at least one keyword)
  - ## Related (with links OR "NONE")
  - ## Tags (with at least one #tag)
  
Learned entries also require:
  - ## Systemic Gap (with infrastructure gap analysis)
  - Gap Closure with file path to test/validation added in this commit`,
    };
  }

  return { passed: true, message: "Memory entries have all required fields" };
}

// ============================================================================
// Main
// ============================================================================

function main() {
  log("\n\x1b[36m=== Policy Audit ===\x1b[0m\n");

  const config = loadConfig();
  const diffFiles = getDiffFiles();

  if (diffFiles.length === 0) {
    logWarning("No changes detected in diff");
    logSuccess("Policy audit passed (no changes to check)");
    return;
  }

  log(`Checking ${diffFiles.length} changed files...\n`);

  let failed = false;

  // Rule A: Real code → memory entry
  const ruleA = checkRuleA(diffFiles, config);
  if (ruleA.passed) {
    logSuccess(`Rule A: ${ruleA.message}`);
  } else {
    logError(`Rule A: FAILED`);
    log(ruleA.message);
    failed = true;
  }

  // Rule B: Learned → test delta
  const ruleB = checkRuleB(diffFiles, config, ruleA.learnedFiles);
  if (ruleB.passed) {
    logSuccess(`Rule B: ${ruleB.message}`);
  } else {
    logError(`Rule B: FAILED`);
    log(ruleB.message);
    failed = true;
  }

  // Rule C: Memory entry → required fields
  const ruleC = checkRuleC(diffFiles, config);
  if (ruleC.passed) {
    logSuccess(`Rule C: ${ruleC.message}`);
  } else {
    logError(`Rule C: FAILED`);
    log(ruleC.message);
    failed = true;
  }

  log("");

  if (failed) {
    logError("Policy audit FAILED");
    printRecoveryPointers();
    process.exit(1);
  }

  logSuccess("Policy audit passed");
}

if (process.argv[1] === __filename) {
  main();
}

export {
  loadConfig,
  parseSimpleYaml,
  getDiffFiles,
  matchesAnyGlob,
  getAddedEntryContent,
  validateEntryContent,
  checkRuleA,
  checkRuleB,
  checkRuleC,
};
