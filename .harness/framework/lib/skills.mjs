/**
 * Skills Loader
 *
 * Loads skill prompts from workflows/skills/<id>/SKILL.md at runtime.
 * Skills are the source of truth for review agent prompts.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./history-entry.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(HARNESS_ROOT, "..");

/**
 * Load a skill's prompt body from workflows/skills/<id>/SKILL.md
 *
 * @param {string} skillId - The skill id (folder name under workflows/skills/)
 * @returns {string} The prompt body (markdown content after frontmatter)
 * @throws {Error} If skill file is missing or empty
 */
export function loadSkillPrompt(skillId) {
  const skillPath = join(REPO_ROOT, "workflows", "skills", skillId, "SKILL.md");

  if (!existsSync(skillPath)) {
    throw new Error(
      `Skill not found: ${skillId}\n` +
        `Expected: workflows/skills/${skillId}/SKILL.md`,
    );
  }

  const content = readFileSync(skillPath, "utf-8");
  const { data, body } = parseFrontmatter(content);

  if (!body || !body.trim()) {
    throw new Error(
      `Skill has no prompt body: ${skillId}\n` +
        `File: workflows/skills/${skillId}/SKILL.md`,
    );
  }

  // Validate frontmatter has required fields
  if (!data?.id) {
    throw new Error(
      `Skill missing 'id' in frontmatter: ${skillId}\n` +
        `File: workflows/skills/${skillId}/SKILL.md`,
    );
  }

  if (!data?.summary) {
    throw new Error(
      `Skill missing 'summary' in frontmatter: ${skillId}\n` +
        `File: workflows/skills/${skillId}/SKILL.md`,
    );
  }

  return body.trim();
}

/**
 * Get skill metadata (id, summary) without the prompt body
 *
 * @param {string} skillId - The skill id
 * @returns {{ id: string, summary: string }} Skill metadata
 */
export function getSkillMeta(skillId) {
  const skillPath = join(REPO_ROOT, "workflows", "skills", skillId, "SKILL.md");

  if (!existsSync(skillPath)) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  const content = readFileSync(skillPath, "utf-8");
  const { data } = parseFrontmatter(content);

  return {
    id: data?.id || skillId,
    summary: data?.summary || "",
  };
}
