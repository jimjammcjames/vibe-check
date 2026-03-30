#!/usr/bin/env node

/**
 * Policy Audit - Deterministic Compounding Enforcement
 *
 * Rules:
 *   A: Real code change -> Must include history entry
 *   B: Fix/incident entry -> Must include test delta
 *   C: History entry -> Must have required frontmatter + sections
 *   S: Session entry -> Must have required frontmatter + sections
 *   D: Staged real code -> Must include staged history + staged session coverage
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadHarnessConfig,
  parseHarnessConfigYaml,
} from "../lib/harness-config.mjs";
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

const QUIET = process.env.HARNESS_QUIET === "1";
const STAGED_ONLY = process.argv.includes("--staged");

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
     - \x1b[36mnpm run harness:post -- --staged\x1b[0m (staged commit intent gate)
     - \x1b[36mnpm run harness:post\x1b[0m (medium verification: tests + policy)
     - \x1b[36mnpm run harness:ci\x1b[0m (full verification: lint + typecheck + tripwire + agents)
  2. If you didn't run prep (or you're stuck):
     - \x1b[36mnpm run harness:prep\x1b[0m (prints MUST summary + grep recipe)
  3. For details:
     - open \x1b[36m.harness/Harness.md\x1b[0m
\x1b[33m───────────────────────────────────────────────────────────────────────\x1b[0m
`);
}

function runGit(args) {
  return execSync(`git ${args.join(" ")}`, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function loadConfig() {
  return loadHarnessConfig({ harnessRoot: HARNESS_ROOT });
}

function parseSimpleYaml(content) {
  return parseHarnessConfigYaml(content);
}

function getDiffFiles({ stagedOnly = false } = {}) {
  if (stagedOnly) {
    try {
      return runGit(["diff", "--cached", "--name-only"])
        .trim()
        .split("\n")
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  try {
    let base;
    try {
      base = runGit(["merge-base", "HEAD", "origin/main"]).trim();
    } catch {
      try {
        base = runGit(["merge-base", "HEAD", "main"]).trim();
      } catch {
        try {
          runGit(["rev-parse", "HEAD~1"]);
          base = "HEAD~1";
        } catch {
          base = null;
        }
      }
    }

    let diffFiles = [];
    if (base) {
      diffFiles = runGit(["diff", "--name-only", base])
        .trim()
        .split("\n")
        .filter(Boolean);
    }

    const staged = runGit(["diff", "--cached", "--name-only"])
      .trim()
      .split("\n")
      .filter(Boolean);
    const untracked = runGit(["ls-files", "--others", "--exclude-standard"])
      .trim()
      .split("\n")
      .filter(Boolean);

    return [...new Set([...diffFiles, ...staged, ...untracked])];
  } catch {
    return [];
  }
}

function getAddedFiles({ stagedOnly = false } = {}) {
  const addedFiles = new Set();

  if (stagedOnly) {
    try {
      const staged = runGit([
        "diff",
        "--cached",
        "--name-status",
        "--diff-filter=A",
      ])
        .trim()
        .split("\n")
        .filter(Boolean);

      for (const line of staged) {
        const [, file] = line.split(/\s+/);
        if (file) addedFiles.add(file);
      }
      return Array.from(addedFiles);
    } catch {
      return [];
    }
  }

  try {
    let base;
    try {
      base = runGit(["merge-base", "HEAD", "origin/main"]).trim();
    } catch {
      try {
        base = runGit(["merge-base", "HEAD", "main"]).trim();
      } catch {
        try {
          runGit(["rev-parse", "HEAD~1"]);
          base = "HEAD~1";
        } catch {
          base = null;
        }
      }
    }

    if (base) {
      const added = runGit(["diff", "--name-status", "--diff-filter=A", base])
        .trim()
        .split("\n")
        .filter(Boolean);
      for (const line of added) {
        const [, file] = line.split(/\s+/);
        if (file) addedFiles.add(file);
      }
    }

    const staged = runGit(["diff", "--cached", "--name-status", "--diff-filter=A"])
      .trim()
      .split("\n")
      .filter(Boolean);
    for (const line of staged) {
      const [, file] = line.split(/\s+/);
      if (file) addedFiles.add(file);
    }

    const untracked = runGit(["ls-files", "--others", "--exclude-standard"])
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
  const values = Array.isArray(patterns) ? patterns : [patterns];
  return values.some((pattern) => minimatch(file, pattern));
}

function readFileAtScope(file, { stagedOnly = false } = {}) {
  if (stagedOnly) {
    try {
      return execSync(`git show :${file}`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      return null;
    }
  }

  const fullPath = join(REPO_ROOT, file);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath, "utf-8");
}

function getAddedEntryContent(file) {
  try {
    const fullPath = join(REPO_ROOT, file);
    if (!existsSync(fullPath)) return null;
    return readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}

function getHistoryEntries(diffFiles, config, scope = {}) {
  return diffFiles
    .filter(
      (file) =>
        matchesAnyGlob(file, config.globs.history) && !file.endsWith("TIMELINE.md"),
    )
    .map((file) => {
      const content = readFileAtScope(file, scope);
      if (!content) return null;
      const { data } = parseFrontmatter(content);
      return { file, content, type: data?.type || null };
    })
    .filter(Boolean);
}

function getSessionEntries(diffFiles, config, scope = {}) {
  return diffFiles
    .filter((file) => matchesAnyGlob(file, config.globs.sessions))
    .map((file) => {
      const content = readFileAtScope(file, scope);
      if (!content) return null;
      return { file, content };
    })
    .filter(Boolean);
}

const MIN_SUMMARY_WORDS = 15;
const MIN_CONTEXT_WORDS = 25;
const MIN_SUMMARY_WORDS_STRICT = 20;
const MIN_CONTEXT_WORDS_STRICT = 40;
const MIN_CLASS_PREVENTION_WORDS_STRICT = 30;
const ALLOWED_SCHEMAS = new Set(["v1", "v2", "v3"]);
const ALLOWED_STATUSES = new Set(["active", "superseded", "deprecated"]);
const CLASS_PREVENTION_EXEMPT_TAG = "#class-prevention-exempt";
const SESSION_TIMELINE_LINE_RE =
  /^- \[(?<marker>\d{2}:\d{2}|seq-\d{2})\] (?<speaker>user|assistant): .+/;
const SESSION_CORRECTION_LINE_RE =
  /^- (?<type>user_correction|agent_correction|process_issue|thrash): (?<value>.+)$/;
const SESSION_CORRECTION_TYPES = [
  "user_correction",
  "agent_correction",
  "process_issue",
  "thrash",
];
const SESSION_NONE_RE = /^none\.?$/i;
const SESSION_USER_CORRECTION_EVIDENCE_RE =
  /^\[(?<marker>\d{2}:\d{2}|seq-\d{2})\] .+/;

function validateEntryContent({
  file,
  content,
  diffFiles,
  isNewEntry = false,
  requireV3 = false,
  requireGapFileInDiff = false,
}) {
  const issues = [];
  const { data, body } = parseFrontmatter(content);

  if (!data) {
    issues.push({
      code: "FRONTMATTER_MISSING",
      message: "Missing YAML frontmatter",
      fix: "Add YAML frontmatter with the required fields.",
    });
    return issues;
  }

  const schema = data.schema;
  if (!schema) {
    issues.push({
      code: "SCHEMA_MISSING",
      message: "Missing schema in frontmatter",
      fix: "Add schema: v3.",
    });
  } else if (!ALLOWED_SCHEMAS.has(schema)) {
    issues.push({
      code: "SCHEMA_INVALID",
      message: `Invalid schema: ${schema}`,
      fix: "Use schema: v1, v2, or v3.",
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

  if (requireV3 && schema !== "v3") {
    issues.push({
      code: "SCHEMA_OUTDATED",
      message: "Changed history entries must use schema v3",
      fix: "Upgrade this entry to schema: v3 and add the new fields.",
    });
  }

  const related = normalizeList(data.related_entries ?? data.related);
  if (related.length === 0) {
    issues.push({
      code: "RELATED_EMPTY",
      message: "related_entries must include at least one value or NONE",
      fix: 'Use related_entries: ["NONE"] or link to another entry.',
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
  const isMeta = type === "meta";
  const isV2OrV3 = schema === "v2" || schema === "v3";
  const isV3 = schema === "v3";
  const hasClassPreventionExempt = tags.includes(CLASS_PREVENTION_EXEMPT_TAG);

  if (isV2OrV3) {
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
  }

  if (isV3) {
    const affectedFiles = normalizeList(data.affected_files);
    if (affectedFiles.length === 0) {
      issues.push({
        code: "AFFECTED_FILES_EMPTY",
        message: "affected_files must include at least one path or NONE",
        fix: 'Add affected_files entries or use ["NONE"] when no code path applies.',
      });
    }

    const sessionRefs = normalizeList(data.session_refs);
    if (sessionRefs.length === 0) {
      issues.push({
        code: "SESSION_REFS_EMPTY",
        message: "session_refs must include at least one value or NONE",
        fix: 'Link the entry to a session file via session_refs or use ["NONE"].',
      });
    }

    if (!isMeta) {
      const requestIntent = extractMarkdownSection(body, "Request / Intent");
      if (!requestIntent) {
        issues.push({
          code: "REQUEST_INTENT_MISSING",
          message: 'Missing "## Request / Intent" section',
          fix: "Describe what was requested and why this change exists.",
        });
      }

      const validation = extractMarkdownSection(body, "Validation");
      if (!validation) {
        issues.push({
          code: "VALIDATION_MISSING",
          message: 'Missing "## Validation" section',
          fix: "Describe how the change was validated.",
        });
      }
    }

    if (
      ["feature", "decision", "refactor", "investigation", "note"].includes(type)
    ) {
      const decision = extractMarkdownSection(body, "Decision");
      const rationale = extractMarkdownSection(body, "Rationale");
      const consequences = extractMarkdownSection(body, "Consequences");

      if (!decision) {
        issues.push({
          code: "DECISION_MISSING",
          message: 'Missing "## Decision" section',
          fix: "Document the chosen approach.",
        });
      }
      if (!rationale) {
        issues.push({
          code: "RATIONALE_MISSING",
          message: 'Missing "## Rationale" section',
          fix: "Explain why this approach was chosen.",
        });
      }
      if (!consequences) {
        issues.push({
          code: "CONSEQUENCES_MISSING",
          message: 'Missing "## Consequences" section',
          fix: "Document the practical impact of the change.",
        });
      }
    }
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

    if (isV3) {
      const errorSection = extractMarkdownSection(body, "Error");
      if (!errorSection) {
        issues.push({
          code: "ERROR_SECTION_MISSING",
          message: 'Missing "## Error" section for fix/incident',
          fix: "Describe the concrete failure mode this change fixes.",
        });
      }

      const whatChanged = extractMarkdownSection(body, "What Changed");
      if (!whatChanged) {
        issues.push({
          code: "WHAT_CHANGED_MISSING",
          message: 'Missing "## What Changed" section for fix/incident',
          fix: "Describe the concrete code and behavior changes in the fix.",
        });
      }
    }
  }

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
            .map((match) => {
              const pathMatch = match.match(
                /[`"']?([^`"'\n]+(?:\.mjs|\.ts|\.js|\.md))/,
              );
              return pathMatch
                ? pathMatch[1].replace(/^[`"']|[`"']$/g, "")
                : null;
            })
            .filter(Boolean);

          const foundInDiff = referencedPaths.some((refPath) =>
            diffFiles.some(
              (diffFile) =>
                diffFile.includes(refPath) ||
                refPath.includes(diffFile.split("/").pop()),
            ),
          );

          if (
            (((schema === "v2" || schema === "v3") && isNewEntry) ||
              requireGapFileInDiff) &&
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

  if (isStrict && isV2OrV3 && !hasClassPreventionExempt) {
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

function parseSessionCorrectionLines(lines) {
  return lines.map((line) => {
    const match = line.match(SESSION_CORRECTION_LINE_RE);
    if (!match?.groups) {
      return { line, type: null, value: null };
    }
    return {
      line,
      type: match.groups.type,
      value: match.groups.value.trim(),
    };
  });
}

function validateStructuredSessionCorrections({
  correctionLines,
  timelineLines,
  issues,
}) {
  const correctionEntries = parseSessionCorrectionLines(correctionLines);
  if (correctionEntries.some((entry) => !entry.type || !entry.value)) {
    issues.push({
      code: "SESSION_CORRECTION_FORMAT",
      message:
        "Corrections & Thrash bullets must use user_correction:/agent_correction:/process_issue:/thrash:",
      fix: "Use bullets like `- user_correction: [seq-03] user changed scope` or `- process_issue: none`.",
    });
    return;
  }

  const missingTypes = SESSION_CORRECTION_TYPES.filter(
    (type) => !correctionEntries.some((entry) => entry.type === type),
  );
  if (missingTypes.length > 0) {
    issues.push({
      code: "SESSION_CORRECTION_CATEGORIES_MISSING",
      message: `Corrections & Thrash must include ${SESSION_CORRECTION_TYPES.join(", ")}`,
      fix: "Add one bullet for each category. Use `none` when the category did not occur.",
    });
  }

  const mixedNoneTypes = SESSION_CORRECTION_TYPES.filter((type) => {
    const typeEntries = correctionEntries.filter((entry) => entry.type === type);
    if (typeEntries.length === 0) return false;
    const noneCount = typeEntries.filter((entry) =>
      SESSION_NONE_RE.test(entry.value),
    ).length;
    return noneCount > 0 && noneCount < typeEntries.length;
  });
  if (mixedNoneTypes.length > 0) {
    issues.push({
      code: "SESSION_CORRECTION_NONE_MIXED",
      message: `Corrections & Thrash cannot mix \`none\` with detailed bullets for ${mixedNoneTypes.join(", ")}`,
      fix: "Use a single `none` bullet when the category did not occur, or replace `none` with real details.",
    });
  }

  const timelineMarkers = new Set(
    timelineLines
      .map((line) => line.match(SESSION_TIMELINE_LINE_RE)?.groups?.marker)
      .filter(Boolean),
  );
  const userCorrections = correctionEntries.filter(
    (entry) =>
      entry.type === "user_correction" && !SESSION_NONE_RE.test(entry.value),
  );

  const missingEvidence = userCorrections.filter(
    (entry) => !SESSION_USER_CORRECTION_EVIDENCE_RE.test(entry.value),
  );
  if (missingEvidence.length > 0) {
    issues.push({
      code: "SESSION_USER_CORRECTION_EVIDENCE_MISSING",
      message:
        "Detailed user_correction bullets must start with a timeline reference like [seq-03] or [10:32]",
      fix: "Prefix each user_correction with the matching timeline marker.",
    });
  }

  const unknownEvidence = userCorrections.filter((entry) => {
    const marker =
      entry.value.match(SESSION_USER_CORRECTION_EVIDENCE_RE)?.groups?.marker;
    return marker && !timelineMarkers.has(marker);
  });
  if (unknownEvidence.length > 0) {
    issues.push({
      code: "SESSION_USER_CORRECTION_EVIDENCE_UNKNOWN",
      message:
        "user_correction references must point to a marker that exists in the Timeline section",
      fix: "Use the exact [seq-##] or [HH:MM] marker from the matching timeline bullet.",
    });
  }
}

function validateSessionContent({ file = "", content, requireFilledBullets = false }) {
  const issues = [];
  const { data, body } = parseFrontmatter(content);

  if (!data) {
    issues.push({
      code: "SESSION_FRONTMATTER_MISSING",
      message: "Missing YAML frontmatter",
      fix: "Add session frontmatter with date, status, started_at, tags, related_history, and skills_used.",
    });
    return issues;
  }

  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    issues.push({
      code: "SESSION_DATE_INVALID",
      message: "Invalid or missing session date (YYYY-MM-DD)",
      fix: "Set date: YYYY-MM-DD in the session frontmatter.",
    });
  }

  if (!data.started_at || !String(data.started_at).trim()) {
    issues.push({
      code: "SESSION_STARTED_AT_MISSING",
      message: "Session files must include started_at",
      fix: "Set started_at to the session start timestamp.",
    });
  }

  const tags = normalizeList(data.tags);
  if (tags.length === 0) {
    issues.push({
      code: "SESSION_TAGS_EMPTY",
      message: "Session tags must include at least one #tag",
      fix: "Add tags like #harness or #workflow.",
    });
  }

  const relatedHistory = normalizeList(data.related_history);
  if (relatedHistory.length === 0) {
    issues.push({
      code: "SESSION_RELATED_HISTORY_EMPTY",
      message: "related_history must include at least one value or NONE",
      fix: 'Add related_history entries or use ["NONE"].',
    });
  }

  const skillsUsed = normalizeList(data.skills_used);
  if (skillsUsed.length === 0) {
    issues.push({
      code: "SESSION_SKILLS_USED_EMPTY",
      message: "skills_used must include at least one value or NONE",
      fix: 'List the applied skills or use ["NONE"].',
    });
  }

  const requiredSections = [
    "Summary",
    "User Intent",
    "Timeline",
    "Corrections & Thrash",
    "Workflow Repetition",
    "Codify Candidates",
    "Outcome",
  ];

  for (const section of requiredSections) {
    if (!extractMarkdownSection(body, section)) {
      issues.push({
        code: `SESSION_${section.replace(/[^\w]+/g, "_").toUpperCase()}_MISSING`,
        message: `Missing "## ${section}" section`,
        fix: `Fill in the session's "${section}" section.`,
      });
    }
  }

  if (requireFilledBullets) {
    const timelineLines = extractMarkdownSection(body, "Timeline")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const invalidTimelineLine = timelineLines.find(
      (line) => !SESSION_TIMELINE_LINE_RE.test(line),
    );
    if (invalidTimelineLine) {
      issues.push({
        code: "SESSION_TIMELINE_FORMAT",
        message: "Timeline bullets must use the required timestamp + speaker format",
        fix: "Use bullets like `- [10:32] user: asked for ...` or `- [seq-01] assistant: ...`.",
      });
    }

    const correctionLines = extractMarkdownSection(body, "Corrections & Thrash")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (correctionLines.length > 0) {
      validateStructuredSessionCorrections({
        correctionLines,
        timelineLines,
        issues,
      });
    }

    const workflowLines = extractMarkdownSection(body, "Workflow Repetition")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (
      workflowLines.some(
        (line) => !/^- (?:repeated_workflow|custom_script): .+/.test(line),
      )
    ) {
      issues.push({
        code: "SESSION_WORKFLOW_FORMAT",
        message: "Workflow Repetition bullets must use repeated_workflow:/custom_script:",
        fix: "Use bullets like `- repeated_workflow: reran X three times`.",
      });
    }

    const candidateLines = extractMarkdownSection(body, "Codify Candidates")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (
      candidateLines.some(
        (line) =>
          !/^- candidate: target=(?:skill|agents|history); .+/.test(line),
      )
    ) {
      issues.push({
        code: "SESSION_CANDIDATE_FORMAT",
        message: "Codify Candidates bullets must use the required target format",
        fix: "Use bullets like `- candidate: target=skill; stabilize the repeated workflow`.",
      });
    }
  }

  return issues;
}

function getNonExemptRealCodeFiles(diffFiles, config) {
  const realCodeFiles = diffFiles.filter((file) =>
    matchesAnyGlob(file, config.globs.realCode),
  );
  return realCodeFiles.filter(
    (file) => !matchesAnyGlob(file, config.globs.exempt),
  );
}

function checkRuleA(diffFiles, config) {
  const nonExemptRealCode = getNonExemptRealCodeFiles(diffFiles, config);
  if (nonExemptRealCode.length === 0) {
    return { passed: true, message: "No real code changes detected" };
  }

  const historyFiles = diffFiles.filter(
    (file) =>
      matchesAnyGlob(file, config.globs.history) && !file.endsWith("TIMELINE.md"),
  );
  if (historyFiles.length === 0) {
    return {
      passed: false,
      message: `Rule A violated: real code changed but no history entry found.

Changed code files:
${nonExemptRealCode.map((file) => `  - ${file}`).join("\n")}

Fix: create a history entry:
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
  if (!strictEntries || strictEntries.length === 0) {
    return { passed: true, message: "No fix/incident entries to check" };
  }

  const testFiles = diffFiles.filter((file) =>
    matchesAnyGlob(file, config.globs.tests),
  );
  if (testFiles.length === 0) {
    return {
      passed: false,
      message: `Rule B violated: fix/incident entry added but no test delta found.

Entries:
${strictEntries.map((file) => `  - ${file}`).join("\n")}

Fix: add a test that covers this fix.`,
    };
  }

  return { passed: true, message: "Fix/incident entries have tests" };
}

function checkRuleC(historyEntries, diffFiles, addedFiles, options = {}) {
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
      requireV3: options.requireV3 ?? false,
      requireGapFileInDiff: options.requireGapFileInDiff ?? false,
    });
    if (issues.length > 0) {
      violations.push({ file: entry.file, issues });
    }
  }

  if (violations.length > 0) {
    const details = violations
      .map(
        (violation) =>
          `  \x1b[1m${violation.file}\x1b[0m:\n${violation.issues
            .map(
              (issue) =>
                `    - \x1b[31m[${issue.code || "ERROR"}]\x1b[0m ${issue.message}\n      \x1b[36mFix:\x1b[0m ${issue.fix || "Correct the issue."}`,
            )
            .join("\n")}`,
      )
      .join("\n\n");

    return {
      passed: false,
      message: `Rule C violated: history entries missing required fields.

${details}

Required frontmatter fields:
  - date, type, status, schema
  - search_terms
  - related_entries
  - affected_files
  - session_refs
  - tags

Fix/incident entries also require:
  - error_signature
  - ## Validation
  - ## Systemic Gap with Gap Closure evidence
  - ## Class Prevention`,
    };
  }

  return { passed: true, message: "History entries have required fields" };
}

function checkSessionRule(sessionEntries, options = {}) {
  if (!sessionEntries || sessionEntries.length === 0) {
    return { passed: true, message: "No session entries to validate" };
  }

  const violations = [];
  for (const sessionEntry of sessionEntries) {
    const issues = validateSessionContent({
      file: sessionEntry.file,
      content: sessionEntry.content,
      requireFilledBullets: options.requireFilledBullets ?? false,
    });
    if (issues.length > 0) {
      violations.push({ file: sessionEntry.file, issues });
    }
  }

  if (violations.length > 0) {
    const details = violations
      .map(
        (violation) =>
          `  \x1b[1m${violation.file}\x1b[0m:\n${violation.issues
            .map(
              (issue) =>
                `    - \x1b[31m[${issue.code}]\x1b[0m ${issue.message}\n      \x1b[36mFix:\x1b[0m ${issue.fix}`,
            )
            .join("\n")}`,
      )
      .join("\n\n");

    return {
      passed: false,
      message: `Session entries failed validation.\n\n${details}`,
    };
  }

  return { passed: true, message: "Session entries have required fields" };
}

function checkStagedContextRule({
  diffFiles,
  config,
  historyEntries,
  sessionEntries,
}) {
  const nonExemptRealCode = getNonExemptRealCodeFiles(diffFiles, config);
  if (nonExemptRealCode.length === 0) {
    return { passed: true, message: "No staged real code changes detected" };
  }

  if (!historyEntries || historyEntries.length === 0) {
    return {
      passed: false,
      message: `Staged commit intent violated: staged real code requires a staged history entry.

Changed staged code files:
${nonExemptRealCode.map((file) => `  - ${file}`).join("\n")}

Fix: create or stage a history entry via:
  npm run harness:new:entry -- --slug "your-slug" --type fix`,
    };
  }

  if (!sessionEntries || sessionEntries.length === 0) {
    return {
      passed: false,
      message: `Staged commit intent violated: staged real code requires a staged session update.

Changed staged code files:
${nonExemptRealCode.map((file) => `  - ${file}`).join("\n")}

Fix: create or update a session entry via:
  npm run harness:new:session -- --slug "task-name"`,
    };
  }

  const affectedFiles = historyEntries.flatMap((entry) => {
    const { data } = parseFrontmatter(entry.content);
    return normalizeList(data?.affected_files).filter(
      (value) => value && value !== "NONE",
    );
  });

  const uncoveredFiles = nonExemptRealCode.filter(
    (file) => !affectedFiles.includes(file),
  );
  if (uncoveredFiles.length > 0) {
    return {
      passed: false,
      message: `Staged commit intent violated: affected_files must cover every staged real code path.

Uncovered files:
${uncoveredFiles.map((file) => `  - ${file}`).join("\n")}

Fix: update the staged history entry affected_files lists so they exactly cover these files.`,
    };
  }

  const stagedSessionFiles = new Set(sessionEntries.map((entry) => entry.file));
  const referencedSessions = historyEntries.flatMap((entry) => {
    const { data } = parseFrontmatter(entry.content);
    return normalizeList(data?.session_refs).filter(
      (value) => value && value !== "NONE",
    );
  });

  const hasLinkedStagedSession = referencedSessions.some((sessionFile) =>
    stagedSessionFiles.has(sessionFile),
  );
  if (!hasLinkedStagedSession) {
    return {
      passed: false,
      message: `Staged commit intent violated: at least one staged history entry must link to a staged session file via session_refs.

Staged session files:
${sessionEntries.map((entry) => `  - ${entry.file}`).join("\n")}

Fix: update session_refs or recreate the history entry after creating the matching session artifact.`,
    };
  }

  return {
    passed: true,
    message: "Staged real code is covered by staged history and session context",
  };
}

function main() {
  log(`\n\x1b[36m=== Policy Audit${STAGED_ONLY ? " (staged)" : ""} ===\x1b[0m\n`);

  const config = loadConfig();
  const scope = { stagedOnly: STAGED_ONLY };
  const diffFiles = getDiffFiles(scope);

  if (diffFiles.length === 0) {
    logWarning("No changes detected in diff");
    logSuccess("Policy audit passed (no changes to check)");
    return;
  }

  log(`Checking ${diffFiles.length} changed files...\n`);

  let failed = false;

  const historyEntries = getHistoryEntries(diffFiles, config, scope);
  const sessionEntries = getSessionEntries(diffFiles, config, scope);
  const addedFiles = new Set(getAddedFiles(scope));

  const ruleA = checkRuleA(diffFiles, config);
  if (ruleA.passed) {
    logSuccess(`Rule A: ${ruleA.message}`);
  } else {
    logError("Rule A: FAILED");
    log(ruleA.message);
    failed = true;
  }

  const strictEntries = historyEntries
    .filter((entry) => STRICT_TYPES.has(entry.type))
    .map((entry) => entry.file);
  const strictTargetEntries = strictEntries.filter(
    (file) => STAGED_ONLY || addedFiles.has(file),
  );
  const ruleB = checkRuleB(diffFiles, config, strictTargetEntries);
  if (ruleB.passed) {
    logSuccess(`Rule B: ${ruleB.message}`);
  } else {
    logError("Rule B: FAILED");
    log(ruleB.message);
    failed = true;
  }

  const ruleC = checkRuleC(historyEntries, diffFiles, addedFiles, {
    requireV3: STAGED_ONLY,
    requireGapFileInDiff: STAGED_ONLY,
  });
  if (ruleC.passed) {
    logSuccess(`Rule C: ${ruleC.message}`);
  } else {
    logError("Rule C: FAILED");
    log(ruleC.message);
    failed = true;
  }

  const ruleS = checkSessionRule(sessionEntries, {
    requireFilledBullets: STAGED_ONLY,
  });
  if (ruleS.passed) {
    logSuccess(`Rule S: ${ruleS.message}`);
  } else {
    logError("Rule S: FAILED");
    log(ruleS.message);
    failed = true;
  }

  if (STAGED_ONLY) {
    const stagedContextRule = checkStagedContextRule({
      diffFiles,
      config,
      historyEntries,
      sessionEntries,
    });
    if (stagedContextRule.passed) {
      logSuccess(`Rule D: ${stagedContextRule.message}`);
    } else {
      logError("Rule D: FAILED");
      log(stagedContextRule.message);
      failed = true;
    }
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
  getSessionEntries,
  getNonExemptRealCodeFiles,
  validateEntryContent,
  validateSessionContent,
  checkRuleA,
  checkRuleB,
  checkRuleC,
  checkSessionRule,
  checkStagedContextRule,
};
