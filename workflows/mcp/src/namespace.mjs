/**
 * Namespace utilities for MCP server keys.
 */

/**
 * Normalize a namespace string:
 * - lowercase
 * - replace non [a-z0-9_-] sequences with -
 * - trim leading/trailing -
 * - fallback to "repo" if empty
 *
 * Note: dots are NOT allowed because `codex mcp add` only accepts
 * letters, numbers, hyphens, and underscores in server names.
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeNamespace(name) {
  if (!name || typeof name !== "string") {
    return "repo";
  }

  let normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "repo";
}

/**
 * Compute the namespace from spec or repo root basename.
 *
 * @param {object} spec - Parsed servers.yml spec
 * @param {string} repoRootBasename - The basename of the repo root folder
 * @returns {string}
 */
export function computeNamespace(spec, repoRootBasename) {
  if (spec.namespace && typeof spec.namespace === "string") {
    // Use spec namespace (optionally normalize for safety)
    return normalizeNamespace(spec.namespace);
  }

  return normalizeNamespace(repoRootBasename);
}
