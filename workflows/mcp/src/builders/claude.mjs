/**
 * Claude Code (.mcp.json) builder.
 *
 * Claude uses ${ENV} placeholders - safe to commit.
 */

/**
 * Build a Claude server entry.
 *
 * @param {object} server - Server definition from spec
 * @param {string} namespace - Computed namespace
 * @returns {{ key: string, value: object }}
 */
export function buildClaudeServerEntry(server, namespace) {
  const key = `${namespace}.${server.id}`;

  if (server.transport === "stdio") {
    return { key, value: buildStdioEntry(server) };
  } else {
    return { key, value: buildHttpEntry(server) };
  }
}

/**
 * Build stdio entry for Claude.
 * @param {object} server
 * @returns {object}
 */
function buildStdioEntry(server) {
  const entry = {
    type: "stdio",
    command: server.command,
    args: server.args ?? [],
  };

  if (server.cwd) {
    entry.cwd = server.cwd;
  }

  // Render env as placeholders using local env names
  // YAML: env: { FETCH_API_KEY: FETCH_API_KEY }
  // Claude: env: { "FETCH_API_KEY": "${FETCH_API_KEY}" }
  if (server.env && Object.keys(server.env).length > 0) {
    entry.env = {};
    for (const [serverEnv, localEnv] of Object.entries(server.env)) {
      entry.env[serverEnv] = `\${${localEnv}}`;
    }
  }

  return entry;
}

/**
 * Build http entry for Claude.
 * @param {object} server
 * @returns {object}
 */
function buildHttpEntry(server) {
  const entry = {
    type: "http",
    url: server.url,
  };

  // Build headers
  const headers = { ...(server.headers ?? {}) };

  // If bearer auth, set Authorization header with placeholder
  if (server.auth?.type === "bearer") {
    headers["Authorization"] = `Bearer \${${server.auth.token_env}}`;
  }
  // oauth: do not inject auth headers

  if (Object.keys(headers).length > 0) {
    entry.headers = headers;
  }

  return entry;
}
