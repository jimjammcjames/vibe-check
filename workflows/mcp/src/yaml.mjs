/**
 * YAML parser and validator for MCP server specs (v1 schema).
 */

import { parse } from "yaml";

/**
 * Parse and validate servers.yml content.
 * @param {string} text - Raw YAML content
 * @returns {object} - Parsed and validated spec
 * @throws {Error} - On validation failure
 */
export function parseServersYaml(text) {
  const doc = parse(text);

  if (!doc || typeof doc !== "object") {
    throw new Error("Invalid YAML: expected an object");
  }

  // Validate version
  if (doc.version !== 1) {
    throw new Error(`Invalid version: expected 1, got ${doc.version}`);
  }

  // Validate servers array
  if (!Array.isArray(doc.servers)) {
    throw new Error("Invalid servers: expected an array");
  }

  // Check for duplicate IDs
  const ids = new Set();
  for (const server of doc.servers) {
    if (!server.id || typeof server.id !== "string") {
      throw new Error('Each server must have a string "id"');
    }
    if (ids.has(server.id)) {
      throw new Error(`Duplicate server id: ${server.id}`);
    }
    ids.add(server.id);

    validateServer(server);
  }

  return {
    version: doc.version,
    namespace: doc.namespace ?? null,
    servers: doc.servers,
  };
}

/**
 * Validate a single server entry.
 * @param {object} server
 */
function validateServer(server) {
  const { id, transport } = server;

  if (!transport || !["stdio", "http"].includes(transport)) {
    throw new Error(
      `Server "${id}": transport must be "stdio" or "http", got "${transport}"`,
    );
  }

  if (transport === "stdio") {
    validateStdioServer(server);
  } else {
    validateHttpServer(server);
  }
}

/**
 * Validate stdio server fields.
 * @param {object} server
 */
function validateStdioServer(server) {
  const { id, command, args, cwd, env, require_env } = server;

  if (!command || typeof command !== "string") {
    throw new Error(`Server "${id}": stdio server requires "command" string`);
  }

  if (args !== undefined) {
    if (!Array.isArray(args) || !args.every((a) => typeof a === "string")) {
      throw new Error(`Server "${id}": "args" must be an array of strings`);
    }
  }

  if (cwd !== undefined && typeof cwd !== "string") {
    throw new Error(`Server "${id}": "cwd" must be a string`);
  }

  if (env !== undefined) {
    if (typeof env !== "object" || Array.isArray(env)) {
      throw new Error(`Server "${id}": "env" must be an object`);
    }
    for (const [key, value] of Object.entries(env)) {
      if (typeof value !== "string") {
        throw new Error(
          `Server "${id}": env["${key}"] must be a string (env var name)`,
        );
      }
    }
  }

  if (require_env !== undefined) {
    if (
      !Array.isArray(require_env) ||
      !require_env.every((e) => typeof e === "string")
    ) {
      throw new Error(
        `Server "${id}": "require_env" must be an array of strings`,
      );
    }
  }
}

/**
 * Validate http server fields.
 * @param {object} server
 */
function validateHttpServer(server) {
  const { id, url, auth, headers } = server;

  if (!url || typeof url !== "string") {
    throw new Error(`Server "${id}": http server requires "url" string`);
  }

  if (auth !== undefined) {
    if (typeof auth !== "object" || Array.isArray(auth)) {
      throw new Error(`Server "${id}": "auth" must be an object`);
    }

    const { type, token_env } = auth;

    if (!type || !["bearer", "oauth"].includes(type)) {
      throw new Error(
        `Server "${id}": auth.type must be "bearer" or "oauth", got "${type}"`,
      );
    }

    if (type === "bearer") {
      if (!token_env || typeof token_env !== "string") {
        throw new Error(
          `Server "${id}": bearer auth requires "token_env" string`,
        );
      }
    }
  }

  if (headers !== undefined) {
    if (typeof headers !== "object" || Array.isArray(headers)) {
      throw new Error(`Server "${id}": "headers" must be an object`);
    }
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value !== "string") {
        throw new Error(`Server "${id}": headers["${key}"] must be a string`);
      }
    }
  }
}
