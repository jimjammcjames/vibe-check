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

    // Handle quoted values (allow inline comments after closing quote)
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      let endIndex = -1;
      for (let i = 1; i < value.length; i += 1) {
        if (value[i] !== quote) {
          continue;
        }
        // Count consecutive backslashes before the quote to detect escaping
        let backslashes = 0;
        for (let j = i - 1; j >= 0 && value[j] === "\\"; j -= 1) {
          backslashes += 1;
        }
        if (backslashes % 2 === 0) {
          endIndex = i;
          break;
        }
      }
      if (endIndex !== -1) {
        value = value.slice(1, endIndex);
      } else {
        // Fallback: strip leading quote if unmatched
        value = value.slice(1);
        const hashIndex = value.indexOf("#");
        if (hashIndex !== -1) {
          value = value.slice(0, hashIndex).trim();
        }
      }
    } else {
      // Strip inline comments for unquoted values (any #)
      const hashIndex = value.indexOf("#");
      if (hashIndex !== -1) {
        value = value.slice(0, hashIndex).trim();
      }
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
