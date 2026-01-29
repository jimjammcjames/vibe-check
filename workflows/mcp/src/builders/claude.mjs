/**
 * Claude Code (.mcp.json) builder.
 *
 * Claude uses resolved literal values - must be gitignored.
 */

import { isPlaceholderValue } from "../scaffold.mjs";

/**
 * Build a Claude server entry.
 *
 * @param {object} server - Server definition from spec
 * @param {string} namespace - Computed namespace
 * @param {Record<string, string>} envMap - Resolved environment variables
 * @returns {{ key: string, value: object } | { key: string, missingEnv: string[] }}
 */
export function buildClaudeServerEntry(server, namespace, envMap = {}) {
  const key = `${namespace}.${server.id}`;

  const requiredEnvVars = collectRequiredEnv(server);
  const missingEnv = requiredEnvVars.filter(
    (v) => !envMap[v] || isPlaceholderValue(envMap[v]),
  );

  if (missingEnv.length > 0) {
    return { key, missingEnv };
  }

  if (server.transport === "stdio") {
    return { key, value: buildStdioEntry(server, envMap) };
  } else {
    return { key, value: buildHttpEntry(server, envMap) };
  }
}

/**
 * Build stdio entry for Claude.
 * @param {object} server
 * @param {Record<string, string>} envMap
 * @returns {object}
 */
function buildStdioEntry(server, envMap) {
  const entry = {
    type: "stdio",
    command: server.command,
    args: server.args ?? [],
  };

  if (server.cwd) {
    entry.cwd = server.cwd;
  }

  // Resolve env to literal values
  if (server.env && Object.keys(server.env).length > 0) {
    entry.env = {};
    for (const [serverEnv, localEnv] of Object.entries(server.env)) {
      entry.env[serverEnv] = envMap[localEnv];
    }
  }

  return entry;
}

/**
 * Build http entry for Claude.
 * @param {object} server
 * @param {Record<string, string>} envMap
 * @returns {object}
 */
function buildHttpEntry(server, envMap) {
  const entry = {
    type: "http",
    url: server.url,
  };

  // Build headers
  const headers = { ...(server.headers ?? {}) };

  // If bearer auth, set Authorization header with resolved token
  if (server.auth?.type === "bearer") {
    const token = envMap[server.auth.token_env];
    headers["Authorization"] = `Bearer ${token}`;
  }
  // oauth: do not inject auth headers

  if (Object.keys(headers).length > 0) {
    entry.headers = headers;
  }

  return entry;
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
