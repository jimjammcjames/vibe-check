#!/usr/bin/env node

/**
 * Minimal MCP HTTP server stub for E2E testing.
 *
 * This implements just enough to verify:
 * 1. HTTP requests reach the server
 * 2. Bearer auth headers are correctly passed
 * 3. The server responds with valid MCP protocol messages
 *
 * Usage:
 *   node mcp-http-stub.mjs [port] [expected-token]
 *
 * If expected-token is provided, the server will reject requests without
 * a matching Authorization: Bearer <token> header.
 */

import { createServer } from "node:http";

const PORT = parseInt(process.argv[2] || "0", 10); // 0 = random available port
const EXPECTED_TOKEN = process.argv[3] || null;

const SERVER_INFO = {
  name: "mcp-http-stub",
  version: "1.0.0",
};

const CAPABILITIES = {
  tools: {},
};

/**
 * Handle MCP JSON-RPC request.
 */
function handleMcpRequest(request) {
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

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "ping",
              description: "Ping the server",
              inputSchema: { type: "object", properties: {} },
            },
          ],
        },
      };

    case "tools/call":
      if (params?.name === "ping") {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: "pong" }],
          },
        };
      }
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown tool: ${params?.name}` },
      };

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}

const server = createServer((req, res) => {
  // Check auth if expected
  if (EXPECTED_TOKEN) {
    const authHeader = req.headers["authorization"] || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1];

    if (token !== EXPECTED_TOKEN) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Unauthorized",
          expected: EXPECTED_TOKEN,
          got: token,
        }),
      );
      return;
    }
  }

  // Only handle POST to /mcp or /
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    try {
      const request = JSON.parse(body);
      const response = handleMcpRequest(request);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error", data: err.message },
        }),
      );
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  const addr = server.address();
  // Print the port to stdout so tests can capture it
  console.log(
    JSON.stringify({ port: addr.port, url: `http://127.0.0.1:${addr.port}` }),
  );
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
