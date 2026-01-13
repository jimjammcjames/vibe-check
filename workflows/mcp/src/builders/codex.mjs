/**
 * Codex CLI command builder.
 *
 * Prints copy/paste-able `codex mcp add` commands to stdout.
 */

/**
 * Build Codex CLI commands for all servers.
 *
 * @param {object} spec - Parsed servers.yml spec
 * @param {string} namespace - Computed namespace
 * @returns {string} - Multi-line string of commands
 */
export function buildCodexCommands(spec, namespace) {
  const lines = [];

  lines.push(
    "# Run these commands in your terminal once. You can list servers with `codex mcp list`.",
  );
  lines.push("");

  for (const server of spec.servers) {
    const serverKey = `${namespace}.${server.id}`;

    if (server.transport === "stdio") {
      lines.push(buildStdioCommand(server, serverKey));
    } else {
      lines.push(...buildHttpCommands(server, serverKey));
    }
  }

  return lines.join("\n");
}

/**
 * Build stdio server command.
 * @param {object} server
 * @param {string} serverKey
 * @returns {string}
 */
function buildStdioCommand(server, serverKey) {
  const parts = ["codex", "mcp", "add", serverKey];

  // Add --env flags for each env mapping
  if (server.env) {
    for (const [serverEnv, localEnv] of Object.entries(server.env)) {
      parts.push(`--env ${serverEnv}="$${localEnv}"`);
    }
  }

  // Add -- separator and command
  parts.push("--");
  parts.push(server.command);

  // Add args
  if (server.args && server.args.length > 0) {
    parts.push(...server.args.map(escapeArg));
  }

  return parts.join(" ");
}

/**
 * Build http server commands (may be multiple for oauth).
 * @param {object} server
 * @param {string} serverKey
 * @returns {string[]}
 */
function buildHttpCommands(server, serverKey) {
  const commands = [];

  if (!server.auth || server.auth.type === "oauth") {
    // No auth or oauth
    commands.push(`codex mcp add ${serverKey} --url ${server.url}`);

    if (server.auth?.type === "oauth") {
      commands.push(`codex mcp login ${serverKey}`);
    }
  } else if (server.auth.type === "bearer") {
    // Bearer auth
    commands.push(
      `codex mcp add ${serverKey} --url ${server.url} --bearer-token-env-var ${server.auth.token_env}`,
    );
  }

  return commands;
}

/**
 * Escape an argument for shell if it contains special characters.
 * @param {string} arg
 * @returns {string}
 */
function escapeArg(arg) {
  // If arg contains spaces or special shell characters, quote it
  if (/[\s"'$`\\!]/.test(arg)) {
    // Use double quotes and escape inner double quotes
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return arg;
}
