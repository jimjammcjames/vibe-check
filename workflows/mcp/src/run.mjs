/**
 * Orchestrator for mcp-gen.
 *
 * Reads spec, builds configs, merges, and writes outputs.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";

import { parseServersYaml } from "./yaml.mjs";
import { computeNamespace } from "./namespace.mjs";
import { loadEnvMap } from "./env.mjs";
import { buildClaudeServerEntry } from "./builders/claude.mjs";
import { buildCursorServerEntry } from "./builders/cursor.mjs";
import { buildCodexCommands } from "./builders/codex.mjs";
import { mergeMcpServers } from "./merge.mjs";
import { ensureGitignorePatterns } from "./gitignore.mjs";
import { scaffoldEnvLocal, collectMissingEnvs } from "./scaffold.mjs";

/**
 * Run the mcp-gen generator.
 *
 * @param {object} options
 * @param {string} options.repoRoot - Absolute path to repo root
 * @param {object} [options.stdout] - Writable stream for stdout (default: process.stdout)
 * @param {object} [options.stderr] - Writable stream for stderr (default: process.stderr)
 * @returns {{ success: boolean, claudePath?: string, cursorPath?: string, warnings: string[] }}
 */
export function run({
  repoRoot,
  stdout = process.stdout,
  stderr = process.stderr,
}) {
  const warnings = [];

  // Read spec
  const specPath = join(repoRoot, "workflows", "mcp", "servers.yml");
  if (!existsSync(specPath)) {
    stderr.write(`ERROR: ${specPath} not found\n`);
    return { success: false, warnings };
  }

  let spec;
  try {
    const specText = readFileSync(specPath, "utf-8");
    spec = parseServersYaml(specText);
  } catch (err) {
    stderr.write(`ERROR: Failed to parse servers.yml: ${err.message}\n`);
    return { success: false, warnings };
  }

  // Compute namespace
  const repoBasename = basename(repoRoot);
  const namespace = computeNamespace(spec, repoBasename);

  // Load env
  const envMap = loadEnvMap(repoRoot);

  // Build Claude entries
  const claudeUpserts = new Map();
  for (const server of spec.servers) {
    const { key, value } = buildClaudeServerEntry(server, namespace);
    claudeUpserts.set(key, value);
  }

  // Build Cursor entries (may have missing env)
  const cursorUpserts = new Map();
  const cursorDeletes = new Set();

  for (const server of spec.servers) {
    const result = buildCursorServerEntry(server, namespace, envMap);

    if ("missingEnv" in result) {
      // Skip this server for Cursor
      cursorDeletes.add(result.key);
      const missing = result.missingEnv.join(", ");
      const msg = `WARN: Skipping ${result.key} for Cursor (missing env: ${missing})`;
      warnings.push(msg);
      stderr.write(msg + "\n");
    } else {
      cursorUpserts.set(result.key, result.value);
    }
  }

  // Read existing Claude config
  const claudePath = join(repoRoot, ".mcp.json");
  let existingClaude = {};
  if (existsSync(claudePath)) {
    try {
      existingClaude = JSON.parse(readFileSync(claudePath, "utf-8"));
    } catch {
      // Treat parse error as empty
      existingClaude = {};
    }
  }

  // Merge and write Claude config
  const mergedClaude = mergeMcpServers(
    existingClaude,
    claudeUpserts,
    new Set(),
    namespace,
  );
  writeFileSync(claudePath, JSON.stringify(mergedClaude, null, 2) + "\n");

  // Ensure .cursor directory exists
  const cursorDir = join(repoRoot, ".cursor");
  if (!existsSync(cursorDir)) {
    mkdirSync(cursorDir, { recursive: true });
  }

  // Read existing Cursor config
  const cursorPath = join(cursorDir, "mcp.json");
  let existingCursor = {};
  if (existsSync(cursorPath)) {
    try {
      existingCursor = JSON.parse(readFileSync(cursorPath, "utf-8"));
    } catch {
      // Treat parse error as empty
      existingCursor = {};
    }
  }

  // Merge and write Cursor config
  const mergedCursor = mergeMcpServers(
    existingCursor,
    cursorUpserts,
    cursorDeletes,
    namespace,
  );
  writeFileSync(cursorPath, JSON.stringify(mergedCursor, null, 2) + "\n");

  // Print Codex commands
  if (spec.servers.length > 0) {
    const codexOutput = buildCodexCommands(spec, namespace);
    stdout.write(codexOutput + "\n");
  }

  // Ensure secret-bearing generated files are gitignored (append-only)
  const gitignoreResult = ensureGitignorePatterns(repoRoot);
  if (gitignoreResult.updated) {
    const added = gitignoreResult.added.join(", ");
    stderr.write(`INFO: Added to .gitignore: ${added}\n`);
  }

  // Scaffold .env.local with missing env vars (append-only)
  const missingEnvs = collectMissingEnvs(spec.servers, namespace, envMap);
  if (missingEnvs.length > 0) {
    const scaffoldResult = scaffoldEnvLocal(repoRoot, missingEnvs);
    if (scaffoldResult.updated) {
      const added = scaffoldResult.added.join(", ");
      stderr.write(`INFO: Scaffolded .env.local with: ${added}\n`);
    }
  }

  return {
    success: true,
    claudePath,
    cursorPath,
    warnings,
  };
}
