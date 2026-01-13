#!/usr/bin/env node

/**
 * Minimal MCP stdio server stub for E2E testing.
 *
 * This implements just enough of the MCP protocol to verify:
 * 1. The server can be spawned
 * 2. It receives stdin messages
 * 3. It responds with valid JSON-RPC
 *
 * MCP uses JSON-RPC 2.0 over stdio with newline-delimited messages.
 */

import { createInterface } from "node:readline";

const SERVER_INFO = {
  name: "mcp-stub-server",
  version: "1.0.0",
};

const CAPABILITIES = {
  tools: {},
};

/**
 * Handle a JSON-RPC request and return a response.
 */
function handleRequest(request) {
  const { id, method, params } = request;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: CAPABILITIES,
          serverInfo: SERVER_INFO,
        },
      };

    case "initialized":
      // This is a notification, no response needed
      return null;

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "echo",
              description: "Echo back the input",
              inputSchema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                },
                required: ["message"],
              },
            },
          ],
        },
      };

    case "tools/call":
      if (params?.name === "echo") {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: `Echo: ${params.arguments?.message ?? "(no message)"}`,
              },
            ],
          },
        };
      }
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Unknown tool: ${params?.name}`,
        },
      };

    case "shutdown":
      return {
        jsonrpc: "2.0",
        id,
        result: null,
      };

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
  }
}

// Read lines from stdin
const rl = createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on("line", (line) => {
  if (!line.trim()) return;

  try {
    const request = JSON.parse(line);
    const response = handleRequest(request);

    if (response !== null) {
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  } catch (err) {
    const errorResponse = {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error",
        data: err.message,
      },
    };
    process.stdout.write(JSON.stringify(errorResponse) + "\n");
  }
});

rl.on("close", () => {
  process.exit(0);
});

// Log to stderr that we're ready (for debugging)
process.stderr.write("MCP stub server ready\n");
