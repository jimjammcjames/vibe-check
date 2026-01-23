/**
 * Env scaffolding for mcp-gen.
 *
 * Generates .env.local placeholders for missing environment variables,
 * making configuration self-documenting and ergonomic.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Marker comment for the auto-scaffolded section.
 */
const SCAFFOLD_MARKER = "# mcp-gen scaffold (fill in values below)";

/**
 * Pattern to detect placeholder values that haven't been filled in.
 * Matches values containing YOUR_ or _HERE (e.g., YOUR_TOKEN, YOUR_VALUE_HERE).
 */
const PLACEHOLDER_PATTERN = /YOUR_|_HERE/;

/**
 * Check if an env var already has a line in the content.
 * Matches both commented and uncommented lines, ignoring trailing comments.
 *
 * @param {string} content - Existing .env.local content
 * @param {string} envVar - Environment variable name to check
 * @returns {boolean}
 */
function envVarExists(content, envVar) {
  // Match lines like:
  // FOO=...
  // # FOO=...
  // #FOO=...
  const regex = new RegExp(`^\\s*#?\\s*${envVar}\\s*=`, "m");
  return regex.test(content);
}

/**
 * Scaffold missing env vars into .env.local.
 * Append-only: never removes or modifies existing lines.
 *
 * @param {string} repoRoot - Absolute path to repo root
 * @param {Array<{serverKey: string, envVar: string, hint?: string}>} missingEnvs - Missing env vars with optional hints
 * @returns {{ updated: boolean, added: string[] }}
 */
export function scaffoldEnvLocal(repoRoot, missingEnvs) {
  if (!missingEnvs || missingEnvs.length === 0) {
    return { updated: false, added: [] };
  }

  const envLocalPath = join(repoRoot, ".env.local");

  // Read existing content (or empty string if file doesn't exist)
  let existingContent = "";
  if (existsSync(envLocalPath)) {
    existingContent = readFileSync(envLocalPath, "utf-8");
  }

  // Filter out env vars that already exist
  const toAdd = missingEnvs.filter(
    ({ envVar }) => !envVarExists(existingContent, envVar),
  );

  if (toAdd.length === 0) {
    return { updated: false, added: [] };
  }

  // Group by server for better readability
  const byServer = new Map();
  for (const { serverKey, envVar, hint } of toAdd) {
    if (!byServer.has(serverKey)) {
      byServer.set(serverKey, []);
    }
    byServer.get(serverKey).push({ envVar, hint });
  }

  // Build the block to append
  const lines = [SCAFFOLD_MARKER];

  for (const [serverKey, envVars] of byServer) {
    lines.push(`# Server: ${serverKey}`);
    for (const { envVar, hint } of envVars) {
      const value = hint || "YOUR_VALUE_HERE";
      // Uncommented with inline marker for easy recognition
      lines.push(`${envVar}='${value}' # <-- fill in`);
    }
  }

  const block = lines.join("\n");

  // Ensure we start on a new line
  let newContent = existingContent;
  if (newContent.length > 0 && !newContent.endsWith("\n")) {
    newContent += "\n";
  }
  if (newContent.length > 0) {
    newContent += "\n"; // Blank line before scaffold block
  }
  newContent += block + "\n";

  // Write updated content
  writeFileSync(envLocalPath, newContent);

  return { updated: true, added: toAdd.map(({ envVar }) => envVar) };
}

/**
 * Collect missing env vars from servers with their hints.
 *
 * @param {object[]} servers - Server definitions from spec
 * @param {string} namespace - Computed namespace
 * @param {Record<string, string>} envMap - Current environment
 * @returns {Array<{serverKey: string, envVar: string, hint?: string}>}
 */
export function collectMissingEnvs(servers, namespace, envMap) {
  const missing = [];

  for (const server of servers) {
    const serverKey = `${namespace}.${server.id}`;
    const requiredEnvVars = collectRequiredEnv(server);

    for (const envVar of requiredEnvVars) {
      if (!envMap[envVar]) {
        const hint = server.env_hints?.[envVar];
        missing.push({ serverKey, envVar, hint });
      }
    }
  }

  return missing;
}

/**
 * Collect all required environment variables for a server.
 * @param {object} server
 * @returns {string[]}
 */
function collectRequiredEnv(server) {
  const required = new Set();

  // Add explicit require_env
  if (server.require_env) {
    for (const v of server.require_env) {
      required.add(v);
    }
  }

  // Add env map values (local env names)
  if (server.env) {
    for (const localEnv of Object.values(server.env)) {
      required.add(localEnv);
    }
  }

  // Add bearer token_env
  if (server.auth?.type === "bearer" && server.auth.token_env) {
    required.add(server.auth.token_env);
  }

  return [...required];
}

/**
 * Check if a value is a placeholder (not yet filled in).
 * @param {string} value
 * @returns {boolean}
 */
export function isPlaceholderValue(value) {
  if (!value || typeof value !== "string") {
    return true;
  }
  return PLACEHOLDER_PATTERN.test(value);
}

export { SCAFFOLD_MARKER, PLACEHOLDER_PATTERN };
