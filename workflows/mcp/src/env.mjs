/**
 * Environment variable loading with .env file support.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Simple dotenv parser.
 * Handles:
 * - KEY=VALUE
 * - KEY="quoted value"
 * - KEY='single quoted value'
 * - # comments
 * - empty lines
 *
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parseDotenv(content) {
  const result = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Handle quoted values
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Load environment map:
 * - Start from process.env (strings only)
 * - Overlay .env if exists
 * - Overlay .env.local if exists (wins)
 *
 * @param {string} repoRoot - Absolute path to repo root
 * @returns {Record<string, string>}
 */
export function loadEnvMap(repoRoot) {
  // Start with process.env (filter to strings only)
  const envMap = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      envMap[key] = value;
    }
  }

  // Overlay .env
  const dotenvPath = join(repoRoot, ".env");
  if (existsSync(dotenvPath)) {
    try {
      const content = readFileSync(dotenvPath, "utf-8");
      Object.assign(envMap, parseDotenv(content));
    } catch {
      // Ignore read errors
    }
  }

  // Overlay .env.local (wins)
  const dotenvLocalPath = join(repoRoot, ".env.local");
  if (existsSync(dotenvLocalPath)) {
    try {
      const content = readFileSync(dotenvLocalPath, "utf-8");
      Object.assign(envMap, parseDotenv(content));
    } catch {
      // Ignore read errors
    }
  }

  return envMap;
}
