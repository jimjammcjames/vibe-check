/**
 * MCP module barrel export.
 * Re-exports all public APIs for cleaner imports.
 */

export { parseServersYaml } from "./src/yaml.mjs";
export { normalizeNamespace, computeNamespace } from "./src/namespace.mjs";
export { parseDotenv, loadEnvMap } from "./src/env.mjs";
export { buildClaudeServerEntry } from "./src/builders/claude.mjs";
export { buildCursorServerEntry } from "./src/builders/cursor.mjs";
export { buildCodexCommands } from "./src/builders/codex.mjs";
export { isOwnedKey, mergeMcpServers } from "./src/merge.mjs";
export { run } from "./src/run.mjs";
export {
  ensureGitignorePatterns,
  REQUIRED_PATTERNS,
  MARKER as GITIGNORE_MARKER,
} from "./src/gitignore.mjs";
