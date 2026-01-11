#!/usr/bin/env node

/**
 * Policy Audit - Deterministic Compounding Enforcement
 *
 * Rules:
 *   A: Real code change → Must include history entry
 *   B: Fix/incident entry → Must include test delta
 *   C: History entry → Must have required frontmatter + sections
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { minimatch } from "./minimatch.mjs";
import {
  HISTORY_TYPES,
  STRICT_TYPES,
  countWords,
  extractMarkdownSection,
  normalizeList,
  parseFrontmatter,
} from "../lib/history-entry.mjs";

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
     - \x1b[36mnpm run harness:ci\x1b[0m (full verification: lint + typecheck + tripwire + agents)
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

function getAddedFiles() {
  const addedFiles = new Set();
  try {
    let base;
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
      const added = execSync(`git diff --name-status --diff-filter=A ${base}`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
      })
        .trim()
        .split("\n")
        .filter(Boolean);
      for (const line of added) {
        const [, file] = line.split(/\s+/);
        if (file) addedFiles.add(file);
      }
    }

    const staged = execSync("git diff --cached --name-status --diff-filter=A", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    for (const line of staged) {
      const [, file] = line.split(/\s+/);
      if (file) addedFiles.add(file);
    }

    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    for (const file of untracked) {
      addedFiles.add(file);
    }
  } catch {
    return [];
  }

  return Array.from(addedFiles);
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

function getHistoryEntries(diffFiles, config) {
  const historyFiles = diffFiles.filter(
    (f) =>
      matchesAnyGlob(f, config.globs.history) && !f.endsWith("TIMELINE.md"),
  );

  return historyFiles
    .map((file) => {
      const fullPath = join(REPO_ROOT, file);
      if (!existsSync(fullPath)) return null;
      const content = readFileSync(fullPath, "utf-8");
      const { data } = parseFrontmatter(content);
      return { file, content, type: data?.type || null };
    })
    .filter(Boolean);
}

const MIN_SUMMARY_WORDS = 15;
const MIN_CONTEXT_WORDS = 25;
const MIN_SUMMARY_WORDS_STRICT = 20;
const MIN_CONTEXT_WORDS_STRICT = 40;
const MIN_CLASS_PREVENTION_WORDS_STRICT = 30;
const ALLOWED_SCHEMAS = new Set(["v1", "v2"]);
const ALLOWED_STATUSES = new Set(["active", "superseded", "deprecated"]);
const CLASS_PREVENTION_EXEMPT_TAG = "#class-prevention-exempt";

function validateEntryContent({
  file,
  content,
  diffFiles,
  isNewEntry = false,
}) {
  const issues = [];
  const { data, body } = parseFrontmatter(content);

  if (!data) {
    issues.push({
      code: "FRONTMATTER_MISSING",
      message: "Missing YAML frontmatter",
      fix: "Add YAML frontmatter with date, type, status, search_terms, related, tags.",
    });
    return issues;
  }

  const schema = data.schema;
  if (!schema) {
    issues.push({
      code: "SCHEMA_MISSING",
      message: "Missing schema in frontmatter",
      fix: "Add schema: v1 or schema: v2.",
    });
  } else if (!ALLOWED_SCHEMAS.has(schema)) {
    issues.push({
      code: "SCHEMA_INVALID",
      message: `Invalid schema: ${schema}`,
      fix: "Use schema: v1 or schema: v2.",
    });
  }

  const type = data.type;
  if (!type || !HISTORY_TYPES.has(type)) {
    issues.push({
      code: "TYPE_INVALID",
      message: `Invalid type: ${type || "missing"}`,
      fix: `Use one of: ${Array.from(HISTORY_TYPES).join(", ")}`,
    });
  }

  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    issues.push({
      code: "DATE_INVALID",
      message: "Invalid or missing date (YYYY-MM-DD)",
      fix: "Set date: YYYY-MM-DD in frontmatter.",
    });
  }

  if (!data.status || !ALLOWED_STATUSES.has(data.status)) {
    issues.push({
      code: "STATUS_INVALID",
      message: `Invalid status: ${data.status || "missing"}`,
      fix: `Use status: ${Array.from(ALLOWED_STATUSES).join(", ")}`,
    });
  }

  const searchTerms = normalizeList(data.search_terms);
  if (searchTerms.length === 0) {
    issues.push({
      code: "SEARCH_EMPTY",
      message: "search_terms must include at least one value",
      fix: "Add at least one search term to the frontmatter.",
    });
  }

  const related = normalizeList(data.related);
  if (related.length === 0) {
    issues.push({
      code: "RELATED_EMPTY",
      message: "related must include at least one value or NONE",
      fix: 'Use related: ["NONE"] or link to another entry.',
    });
  }

  const tags = normalizeList(data.tags);
  if (tags.length === 0) {
    issues.push({
      code: "TAGS_EMPTY",
      message: "tags must include at least one #tag",
      fix: "Add tags like #bug or #harness.",
    });
  } else if (!tags.some((tag) => tag.includes("#"))) {
    issues.push({
      code: "TAGS_INVALID",
      message: "tags must include at least one #tag",
      fix: "Add tags like #bug or #harness.",
    });
  }

  const isStrict = STRICT_TYPES.has(type);
  const hasClassPreventionExempt = tags.includes(CLASS_PREVENTION_EXEMPT_TAG);

  if (schema === "v2") {
    const summary = extractMarkdownSection(body, "Summary");
    const context = extractMarkdownSection(body, "Context");
    const minSummaryWords = isStrict
      ? MIN_SUMMARY_WORDS_STRICT
      : MIN_SUMMARY_WORDS;
    const minContextWords = isStrict
      ? MIN_CONTEXT_WORDS_STRICT
      : MIN_CONTEXT_WORDS;

    if (!summary) {
      issues.push({
        code: "SUMMARY_MISSING",
        message: 'Missing "## Summary" section',
        fix: `Add Summary with at least ${minSummaryWords} words.`,
      });
    } else if (countWords(summary) < minSummaryWords) {
      issues.push({
        code: "SUMMARY_SHORT",
        message: `"Summary" is too short (${countWords(summary)} words)`,
        fix: `Expand Summary to at least ${minSummaryWords} words.`,
      });
    }

    if (!context) {
      issues.push({
        code: "CONTEXT_MISSING",
        message: 'Missing "## Context" section',
        fix: `Add Context with at least ${minContextWords} words.`,
      });
    } else if (countWords(context) < minContextWords) {
      issues.push({
        code: "CONTEXT_SHORT",
        message: `"Context" is too short (${countWords(context)} words)`,
        fix: `Expand Context to at least ${minContextWords} words.`,
      });
    }

    if (isStrict) {
      if (!data.error_signature || !data.error_signature.trim()) {
        issues.push({
          code: "ERROR_SIGNATURE_MISSING",
          message: "Missing error_signature for fix/incident entry",
          fix: "Add the exact error text in frontmatter.",
        });
      }

      const validation = extractMarkdownSection(body, "Validation");
      if (!validation) {
        issues.push({
          code: "VALIDATION_MISSING",
          message: 'Missing "## Validation" section for fix/incident',
          fix: "Describe how the fix was validated (tests, steps).",
        });
      }
    }
  }

  // SYSTEMIC GAP ENFORCEMENT (fix/incident entries only)
  if (isStrict) {
    const gapContentRaw = extractMarkdownSection(body, "Systemic Gap");
    const gapContent = gapContentRaw.replace(/^\s*---\s*$/gm, "").trim();

    if (!gapContent) {
      issues.push({
        code: "GAP_MISSING",
        message: 'Missing "## Systemic Gap" section',
        fix: "Add the Systemic Gap analysis and Gap Closure evidence.",
      });
    } else {
      if (
        gapContent.length < 50 ||
        gapContent.includes("[What infrastructure gap")
      ) {
        issues.push({
          code: "GAP_SHALLOW",
          message: '"Systemic Gap" section is too brief or template text',
          fix: "Explain the root infrastructure gap (min 50 chars).",
        });
      }

      if (
        !gapContent.includes("Gap Closure") &&
        !gapContent.includes("Added test") &&
        !gapContent.includes("Added validation") &&
        !gapContent.includes("Added pre-flight")
      ) {
        issues.push({
          code: "GAP_EVIDENCE_MISSING",
          message: 'Systemic Gap requires explicit "Gap Closure" evidence',
          fix: 'Add "Gap Closure: Added test/validation: <filename>" to the section.',
        });
      } else {
        const filePathMatches = gapContent.match(
          /(?:Added (?:test|validation|pre-flight)[:\s]+)[`"']?([^`"'\n]+(?:\.mjs|\.ts|\.js|\.md))/gi,
        );

        if (filePathMatches) {
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
            return diffFiles.some(
              (diffFile) =>
                diffFile.includes(refPath) ||
                refPath.includes(diffFile.split("/").pop()),
            );
          });

          if (
            schema === "v2" &&
            isNewEntry &&
            !foundInDiff &&
            referencedPaths.length > 0
          ) {
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

  // CLASS PREVENTION ENFORCEMENT (fix/incident entries only, v2 schema)
  if (isStrict && schema === "v2" && !hasClassPreventionExempt) {
    const classContent = extractMarkdownSection(body, "Class Prevention");

    if (!classContent) {
      issues.push({
        code: "CLASS_PREVENTION_MISSING",
        message: 'Missing "## Class Prevention" section',
        fix: `Explain the generalized guardrail/invariant (min ${MIN_CLASS_PREVENTION_WORDS_STRICT} words) or add ${CLASS_PREVENTION_EXEMPT_TAG} with justification.`,
      });
    } else if (countWords(classContent) < MIN_CLASS_PREVENTION_WORDS_STRICT) {
      issues.push({
        code: "CLASS_PREVENTION_SHORT",
        message: `"Class Prevention" is too short (${countWords(classContent)} words)`,
        fix: `Expand Class Prevention to at least ${MIN_CLASS_PREVENTION_WORDS_STRICT} words.`,
      });
    } else if (/\b(?:todo|tbd|fill this|placeholder)\b/i.test(classContent)) {
      issues.push({
        code: "CLASS_PREVENTION_PLACEHOLDER",
        message: '"Class Prevention" contains placeholder text',
        fix: "Replace placeholders with the actual class-level guardrail.",
      });
    }
  }

  return issues;
}

// ============================================================================
// Rule Checks
// ============================================================================

function checkRuleA(diffFiles, config) {
  // Real code change → history entry
  const realCodeFiles = diffFiles.filter((f) =>
    matchesAnyGlob(f, config.globs.realCode),
  );
  const nonExemptRealCode = realCodeFiles.filter(
    (f) => !matchesAnyGlob(f, config.globs.exempt),
  );

  if (nonExemptRealCode.length === 0) {
    return { passed: true, message: "No real code changes detected" };
  }

  const historyFiles = diffFiles.filter(
    (f) =>
      matchesAnyGlob(f, config.globs.history) && !f.endsWith("TIMELINE.md"),
  );

  if (historyFiles.length === 0) {
    return {
      passed: false,
      message: `Rule A violated: Real code changed but no history entry found.
      
Changed code files:
${nonExemptRealCode.map((f) => `  - ${f}`).join("\n")}

Fix: Create a history entry:
  npm run harness:new:entry -- --slug "your-slug" --type fix
  # or: --type decision`,
    };
  }

  return {
    passed: true,
    message: "Real code changes accompanied by history entries",
    historyFiles,
  };
}

function checkRuleB(diffFiles, config, strictEntries) {
  // Fix/incident entry → test delta
  if (!strictEntries || strictEntries.length === 0) {
    return { passed: true, message: "No fix/incident entries to check" };
  }

  const testFiles = diffFiles.filter((f) =>
    matchesAnyGlob(f, config.globs.tests),
  );

  if (testFiles.length === 0) {
    return {
      passed: false,
      message: `Rule B violated: Fix/incident entry added but no test delta found.
      
Entries:
${strictEntries.map((f) => `  - ${f}`).join("\n")}

Fix: Add a test that covers this fix.
If truly untestable, document why in the entry.`,
    };
  }

  return { passed: true, message: "Fix/incident entries have tests" };
}

function checkRuleC(historyEntries, diffFiles, addedFiles) {
  if (!historyEntries || historyEntries.length === 0) {
    return { passed: true, message: "No history entries to validate" };
  }

  const violations = [];

  for (const entry of historyEntries) {
    const issues = validateEntryContent({
      file: entry.file,
      content: entry.content,
      diffFiles,
      isNewEntry: addedFiles?.has(entry.file) ?? false,
    });

    if (issues.length > 0) {
      violations.push({ file: entry.file, issues });
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
      message: `Rule C violated: History entries missing required fields.

${details}

Required frontmatter fields:
  - date, type, status, schema
  - search_terms (non-empty list)
  - related (links or NONE)
  - tags (at least one #tag)

Fix/incident entries also require:
  - error_signature in frontmatter
  - ## Validation section
  - ## Systemic Gap with Gap Closure evidence
  - ## Class Prevention (min 30 words) unless tagged #class-prevention-exempt
  - tests in the diff (Rule B)`,
    };
  }

  return { passed: true, message: "History entries have required fields" };
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

  // Rule A: Real code → history entry
  const ruleA = checkRuleA(diffFiles, config);
  if (ruleA.passed) {
    logSuccess(`Rule A: ${ruleA.message}`);
  } else {
    logError(`Rule A: FAILED`);
    log(ruleA.message);
    failed = true;
  }

  // Rule B: Fix/incident → test delta
  const historyEntries = getHistoryEntries(diffFiles, config);
  const addedFiles = new Set(getAddedFiles());
  const strictEntries = historyEntries
    .filter((entry) => STRICT_TYPES.has(entry.type))
    .map((entry) => entry.file);
  const strictAddedEntries = strictEntries.filter((file) =>
    addedFiles.has(file),
  );

  const ruleB = checkRuleB(diffFiles, config, strictAddedEntries);
  if (ruleB.passed) {
    logSuccess(`Rule B: ${ruleB.message}`);
  } else {
    logError(`Rule B: FAILED`);
    log(ruleB.message);
    failed = true;
  }

  // Rule C: History entry → required fields
  const ruleC = checkRuleC(historyEntries, diffFiles, addedFiles);
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
