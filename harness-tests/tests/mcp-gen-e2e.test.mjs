/**
 * MCP-gen E2E smoke tests.
 *
 * These tests actually spawn MCP servers and verify connectivity:
 * - stdio servers are spawned and respond to initialize/tools/list
 * - HTTP servers receive requests with correct auth headers
 *
 * Run with: npm run test:e2e
 * Or as part of: npm test
 *
 * Note: HTTP tests use fetch() and are gated by HARNESS_ALLOW_NETWORK_TESTS.
 * Set HARNESS_ALLOW_NETWORK_TESTS=1 to run HTTP tests (they use localhost only).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURES_DIR = join(__dirname, "..", "fixtures");
const STDIO_STUB = join(FIXTURES_DIR, "mcp-stub-server.mjs");
const HTTP_STUB = join(FIXTURES_DIR, "mcp-http-stub.mjs");

// Gate HTTP tests - they use localhost only but still trigger network lint
const ALLOW_NETWORK = process.env.HARNESS_ALLOW_NETWORK_TESTS === "1";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Send a JSON-RPC message to a stdio process and wait for response.
 */
function sendStdioMessage(proc, message, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for response to ${message.method}`));
    }, timeoutMs);

    const handler = (data) => {
      const lines = data
        .toString()
        .split("\n")
        .filter((l) => l.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.id === message.id) {
            clearTimeout(timeout);
            proc.stdout.off("data", handler);
            resolve(response);
            return;
          }
        } catch {
          // Not JSON, ignore (might be stderr leak or debug output)
        }
      }
    };

    proc.stdout.on("data", handler);
    proc.stdin.write(JSON.stringify(message) + "\n");
  });
}

/**
 * Wait for the HTTP stub to print its port info.
 */
function waitForHttpServerReady(proc, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout waiting for HTTP server to start"));
    }, timeoutMs);

    let buffer = "";

    const handler = (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");

      for (const line of lines) {
        if (line.trim()) {
          try {
            const info = JSON.parse(line);
            if (info.port) {
              clearTimeout(timeout);
              proc.stdout.off("data", handler);
              resolve(info);
              return;
            }
          } catch {
            // Not JSON yet
          }
        }
      }
    };

    proc.stdout.on("data", handler);
  });
}

/**
 * Make an HTTP POST request with JSON body.
 */
async function httpPost(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { status: response.status, data };
}

// ============================================================================
// stdio server tests
// ============================================================================

describe("E2E: stdio MCP server", () => {
  let serverProc;

  before(() => {
    serverProc = spawn("node", [STDIO_STUB], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Collect stderr for debugging
    serverProc.stderr.on("data", (data) => {
      // Uncomment for debugging:
      // process.stderr.write(`[stub stderr] ${data}`);
    });
  });

  after(() => {
    if (serverProc && !serverProc.killed) {
      serverProc.kill("SIGTERM");
    }
  });

  it("responds to initialize request", async () => {
    const response = await sendStdioMessage(serverProc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      },
    });

    assert.equal(response.jsonrpc, "2.0");
    assert.equal(response.id, 1);
    assert.ok(response.result);
    assert.equal(response.result.serverInfo.name, "mcp-stub-server");
    assert.ok(response.result.capabilities);
  });

  it("responds to tools/list request", async () => {
    const response = await sendStdioMessage(serverProc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });

    assert.equal(response.id, 2);
    assert.ok(response.result);
    assert.ok(Array.isArray(response.result.tools));
    assert.equal(response.result.tools.length, 1);
    assert.equal(response.result.tools[0].name, "echo");
  });

  it("responds to tools/call request", async () => {
    const response = await sendStdioMessage(serverProc, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "echo",
        arguments: { message: "hello world" },
      },
    });

    assert.equal(response.id, 3);
    assert.ok(response.result);
    assert.ok(Array.isArray(response.result.content));
    assert.equal(response.result.content[0].type, "text");
    assert.ok(response.result.content[0].text.includes("hello world"));
  });

  it("returns error for unknown method", async () => {
    const response = await sendStdioMessage(serverProc, {
      jsonrpc: "2.0",
      id: 4,
      method: "unknown/method",
      params: {},
    });

    assert.equal(response.id, 4);
    assert.ok(response.error);
    assert.equal(response.error.code, -32601);
  });
});

// ============================================================================
// HTTP server tests (requires HARNESS_ALLOW_NETWORK_TESTS=1)
// ============================================================================

describe("E2E: HTTP MCP server", { skip: !ALLOW_NETWORK }, () => {
  describe("without auth", () => {
    let serverProc;
    let serverUrl;

    before(async () => {
      serverProc = spawn("node", [HTTP_STUB, "0"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      serverProc.stderr.on("data", (data) => {
        // Uncomment for debugging:
        // process.stderr.write(`[http stderr] ${data}`);
      });

      const info = await waitForHttpServerReady(serverProc);
      serverUrl = info.url;
    });

    after(() => {
      if (serverProc && !serverProc.killed) {
        serverProc.kill("SIGTERM");
      }
    });

    it("responds to initialize request", async () => {
      const { status, data } = await httpPost(serverUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      });

      assert.equal(status, 200);
      assert.equal(data.jsonrpc, "2.0");
      assert.equal(data.id, 1);
      assert.ok(data.result);
      assert.equal(data.result.serverInfo.name, "mcp-http-stub");
    });

    it("responds to tools/list request", async () => {
      const { status, data } = await httpPost(serverUrl, {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      });

      assert.equal(status, 200);
      assert.ok(data.result);
      assert.ok(Array.isArray(data.result.tools));
      assert.equal(data.result.tools[0].name, "ping");
    });

    it("responds to tools/call request", async () => {
      const { status, data } = await httpPost(serverUrl, {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "ping", arguments: {} },
      });

      assert.equal(status, 200);
      assert.ok(data.result);
      assert.equal(data.result.content[0].text, "pong");
    });
  });

  describe("with bearer auth", () => {
    const TEST_TOKEN = "super-secret-test-token";
    let serverProc;
    let serverUrl;

    before(async () => {
      serverProc = spawn("node", [HTTP_STUB, "0", TEST_TOKEN], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      serverProc.stderr.on("data", (data) => {
        // Uncomment for debugging:
        // process.stderr.write(`[http-auth stderr] ${data}`);
      });

      const info = await waitForHttpServerReady(serverProc);
      serverUrl = info.url;
    });

    after(() => {
      if (serverProc && !serverProc.killed) {
        serverProc.kill("SIGTERM");
      }
    });

    it("rejects requests without auth header", async () => {
      const { status, data } = await httpPost(serverUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      });

      assert.equal(status, 401);
      assert.equal(data.error, "Unauthorized");
    });

    it("rejects requests with wrong token", async () => {
      const { status, data } = await httpPost(
        serverUrl,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        },
        { Authorization: "Bearer wrong-token" },
      );

      assert.equal(status, 401);
      assert.equal(data.error, "Unauthorized");
    });

    it("accepts requests with correct bearer token", async () => {
      const { status, data } = await httpPost(
        serverUrl,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        },
        { Authorization: `Bearer ${TEST_TOKEN}` },
      );

      assert.equal(status, 200);
      assert.ok(data.result);
      assert.equal(data.result.serverInfo.name, "mcp-http-stub");
    });

    it("tools/call works with correct auth", async () => {
      const { status, data } = await httpPost(
        serverUrl,
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "ping", arguments: {} },
        },
        { Authorization: `Bearer ${TEST_TOKEN}` },
      );

      assert.equal(status, 200);
      assert.equal(data.result.content[0].text, "pong");
    });
  });
});

// ============================================================================
// Integration: generated config drives real server connections
// (requires HARNESS_ALLOW_NETWORK_TESTS=1 for HTTP tests)
// ============================================================================

describe(
  "E2E: generated configs connect to real servers",
  { skip: !ALLOW_NETWORK },
  () => {
    let httpServerProc;
    let httpServerUrl;
    let stdioProc;
    const HTTP_TOKEN = "generated-config-token";

    before(async () => {
      // Start HTTP stub with auth
      httpServerProc = spawn("node", [HTTP_STUB, "0", HTTP_TOKEN], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      const info = await waitForHttpServerReady(httpServerProc);
      httpServerUrl = info.url;
    });

    after(() => {
      if (httpServerProc && !httpServerProc.killed) {
        httpServerProc.kill("SIGTERM");
      }
      if (stdioProc && !stdioProc.killed) {
        stdioProc.kill("SIGTERM");
      }
    });

    it("stdio config from mcp-gen can spawn and connect to stub server", async () => {
      // This simulates what Claude/Cursor would do with the generated config:
      // spawn the command with the specified args

      stdioProc = spawn("node", [STDIO_STUB], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Send initialize (as Claude/Cursor would)
      const response = await sendStdioMessage(stdioProc, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "mcp-gen-test", version: "1.0.0" },
        },
      });

      assert.ok(response.result);
      assert.equal(response.result.serverInfo.name, "mcp-stub-server");

      // List tools
      const toolsResponse = await sendStdioMessage(stdioProc, {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      });

      assert.ok(toolsResponse.result.tools.length > 0);

      stdioProc.kill("SIGTERM");
    });

    it("http config from mcp-gen can connect with bearer auth", async () => {
      // This simulates what Claude/Cursor would do:
      // POST to url with Authorization header from config

      const { status, data } = await httpPost(
        httpServerUrl,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "mcp-gen-test", version: "1.0.0" },
          },
        },
        { Authorization: `Bearer ${HTTP_TOKEN}` },
      );

      assert.equal(status, 200);
      assert.ok(data.result);

      // Call a tool
      const { data: toolData } = await httpPost(
        httpServerUrl,
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "ping", arguments: {} },
        },
        { Authorization: `Bearer ${HTTP_TOKEN}` },
      );

      assert.equal(toolData.result.content[0].text, "pong");
    });

    it("verifies Cursor-style literal auth header works", async () => {
      // Cursor config has literal resolved value like:
      // headers: { Authorization: "Bearer actual-token-value" }

      const cursorStyleHeaders = {
        Authorization: `Bearer ${HTTP_TOKEN}`,
        "X-Custom-Header": "custom-value",
      };

      const { status, data } = await httpPost(
        httpServerUrl,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        },
        cursorStyleHeaders,
      );

      assert.equal(status, 200);
      assert.ok(data.result.tools);
    });
  },
);
