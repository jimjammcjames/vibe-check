/**
 * Non-destructive merge logic for MCP config files.
 *
 * We only manage keys with an owned prefix: `<namespace>.`
 * We never touch non-owned entries.
 */

/**
 * Check if a key is owned by the given namespace.
 *
 * @param {string} key - Server key (e.g. "myrepo.fetch")
 * @param {string} namespace - Namespace prefix (e.g. "myrepo")
 * @returns {boolean}
 */
export function isOwnedKey(key, namespace) {
  return key.startsWith(namespace + ".");
}

/**
 * Merge MCP servers with non-destructive ownership semantics.
 *
 * - Only upsert/delete keys starting with `namespace.`
 * - Never touch non-owned entries
 *
 * @param {object} existingJson - Existing JSON config (may have mcpServers or be empty)
 * @param {Map<string, object>} upsertsMap - Map of key -> value to upsert
 * @param {Set<string>} deletesSet - Set of keys to delete
 * @param {string} namespace - Namespace prefix
 * @returns {object} - Merged JSON config
 */
export function mergeMcpServers(
  existingJson,
  upsertsMap,
  deletesSet,
  namespace,
) {
  // Start with existing mcpServers or empty object
  const existing = existingJson?.mcpServers ?? {};

  // Clone existing to avoid mutation
  const merged = { ...existing };

  // First, remove all owned keys (we'll re-add the ones we want)
  for (const key of Object.keys(merged)) {
    if (isOwnedKey(key, namespace)) {
      delete merged[key];
    }
  }

  // Add all upserts (only owned keys should be in upsertsMap, but check anyway)
  for (const [key, value] of upsertsMap.entries()) {
    if (isOwnedKey(key, namespace)) {
      merged[key] = value;
    }
  }

  // deletesSet is implicit - owned keys not in upsertsMap are already removed

  return { mcpServers: merged };
}
