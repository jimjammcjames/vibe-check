/**
 * Append-only .gitignore management for mcp-gen.
 *
 * Ensures secret-bearing generated files are ignored by git.
 * Never removes or reorders existing entries - only appends missing patterns.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Patterns that mcp-gen should ensure are in .gitignore.
 * These are files that can contain secrets when generated.
 */
const REQUIRED_PATTERNS = [".cursor/mcp*.json", ".env", ".env.local"];

/**
 * Marker comment for the auto-managed section.
 */
const MARKER = "# mcp-gen (auto-managed; append-only)";

/**
 * Check if a pattern already exists in the gitignore content.
 * Matches line-exact (trimming whitespace).
 *
 * @param {string} content - Existing .gitignore content
 * @param {string} pattern - Pattern to check for
 * @returns {boolean}
 */
function patternExists(content, pattern) {
  const lines = content.split("\n").map((line) => line.trim());
  return lines.includes(pattern);
}

/**
 * Ensure required ignore patterns exist in .gitignore.
 * Append-only: never removes or reorders existing entries.
 *
 * @param {string} repoRoot - Absolute path to repo root
 * @returns {{ updated: boolean, added: string[] }}
 */
export function ensureGitignorePatterns(repoRoot) {
  const gitignorePath = join(repoRoot, ".gitignore");

  // Read existing content (or empty string if file doesn't exist)
  let existingContent = "";
  if (existsSync(gitignorePath)) {
    existingContent = readFileSync(gitignorePath, "utf-8");
  }

  // Find patterns that are missing
  const missingPatterns = REQUIRED_PATTERNS.filter(
    (pattern) => !patternExists(existingContent, pattern),
  );

  // If all patterns exist, nothing to do
  if (missingPatterns.length === 0) {
    return { updated: false, added: [] };
  }

  // Build the block to append
  const blockLines = [MARKER, ...missingPatterns];
  const block = blockLines.join("\n");

  // Ensure we start on a new line
  let newContent = existingContent;
  if (newContent.length > 0 && !newContent.endsWith("\n")) {
    newContent += "\n";
  }
  if (newContent.length > 0) {
    newContent += "\n"; // Blank line before marker block
  }
  newContent += block + "\n";

  // Write updated content
  writeFileSync(gitignorePath, newContent);

  return { updated: true, added: missingPatterns };
}

export { REQUIRED_PATTERNS, MARKER };
