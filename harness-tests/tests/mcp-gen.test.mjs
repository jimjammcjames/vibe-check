/**
 * mcp-gen unit and integration tests.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  copyFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Writable } from "node:stream";

import {
  parseServersYaml,
  normalizeNamespace,
  computeNamespace,
  parseDotenv,
  buildClaudeServerEntry,
  buildCursorServerEntry,
  buildCodexCommands,
  isOwnedKey,
  mergeMcpServers,
  run,
  ensureGitignorePatterns,
  REQUIRED_PATTERNS,
  GITIGNORE_MARKER,
} from "../../workflows/mcp/index.mjs";

// Note: HARNESS_ALLOW_NETWORK_TESTS - this file uses readFileSync on temp output files only

// ============================================================================
// Test helpers
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMP_ROOT = join(__dirname, ".tmp", "mcp-gen");
const FIXTURE_PATH = join(__dirname, "..", "fixtures", "mcp-servers.yml");
let runCounter = 0;

/**
 * Create a capture stream for testing stdout/stderr.
 */
function createCaptureStream() {
  let content = "";
  const stream = new Writable({
    write(chunk, encoding, callback) {
      content += chunk.toString();
      callback();
    },
  });
  stream.getContent = () => content;
  return stream;
}

/**
 * Create a test run directory with fake repo structure.
 */
function createTestDir(name) {
  const dir = join(TEMP_ROOT, `run-${++runCounter}-${name}`);
  mkdirSync(join(dir, "workflows", "mcp"), { recursive: true });
  return dir;
}

// ============================================================================
// Unit tests: parseServersYaml
// ============================================================================

describe("parseServersYaml", () => {
  it("parses minimal valid spec", () => {
    const spec = parseServersYaml(`
version: 1
servers: []
`);
    assert.equal(spec.version, 1);
    assert.deepEqual(spec.servers, []);
    assert.equal(spec.namespace, null);
  });

  it("parses spec with namespace", () => {
    const spec = parseServersYaml(`
version: 1
namespace: myrepo
servers: []
`);
    assert.equal(spec.namespace, "myrepo");
  });

  it("parses stdio server", () => {
    const spec = parseServersYaml(`
version: 1
servers:
  - id: fetch
    transport: stdio
    command: uvx
    args: ["mcp-server-fetch"]
    cwd: "."
    require_env: ["API_KEY"]
    env:
      FETCH_API_KEY: API_KEY
`);
    assert.equal(spec.servers.length, 1);
    const s = spec.servers[0];
    assert.equal(s.id, "fetch");
    assert.equal(s.transport, "stdio");
    assert.equal(s.command, "uvx");
    assert.deepEqual(s.args, ["mcp-server-fetch"]);
    assert.equal(s.cwd, ".");
    assert.deepEqual(s.require_env, ["API_KEY"]);
    assert.deepEqual(s.env, { FETCH_API_KEY: "API_KEY" });
  });

  it("parses http bearer server", () => {
    const spec = parseServersYaml(`
version: 1
servers:
  - id: figma
    transport: http
    url: "https://mcp.figma.com/mcp"
    auth:
      type: bearer
      token_env: FIGMA_TOKEN
    headers:
      X-Region: "us-east-1"
`);
    const s = spec.servers[0];
    assert.equal(s.transport, "http");
    assert.equal(s.url, "https://mcp.figma.com/mcp");
    assert.equal(s.auth.type, "bearer");
    assert.equal(s.auth.token_env, "FIGMA_TOKEN");
    assert.deepEqual(s.headers, { "X-Region": "us-east-1" });
  });

  it("parses http oauth server", () => {
    const spec = parseServersYaml(`
version: 1
servers:
  - id: linear
    transport: http
    url: "https://mcp.linear.app/mcp"
    auth:
      type: oauth
`);
    const s = spec.servers[0];
    assert.equal(s.auth.type, "oauth");
  });

  it("throws on invalid version", () => {
    assert.throws(
      () => parseServersYaml(`version: 2\nservers: []`),
      /Invalid version/,
    );
  });

  it("throws on duplicate id", () => {
    assert.throws(
      () =>
        parseServersYaml(`
version: 1
servers:
  - id: foo
    transport: stdio
    command: test
  - id: foo
    transport: stdio
    command: test2
`),
      /Duplicate server id: foo/,
    );
  });

  it("throws on missing required fields", () => {
    assert.throws(
      () =>
        parseServersYaml(`
version: 1
servers:
  - id: test
    transport: stdio
`),
      /requires "command"/,
    );
  });

  it("throws on bearer without token_env", () => {
    assert.throws(
      () =>
        parseServersYaml(`
version: 1
servers:
  - id: test
    transport: http
    url: "https://example.com"
    auth:
      type: bearer
`),
      /requires "token_env"/,
    );
  });
});

// ============================================================================
// Unit tests: namespace
// ============================================================================

describe("namespace", () => {
  describe("normalizeNamespace", () => {
    it("lowercases", () => {
      assert.equal(normalizeNamespace("MyRepo"), "myrepo");
    });

    it("replaces special chars with dash", () => {
      assert.equal(normalizeNamespace("my repo!@#"), "my-repo");
    });

    it("trims dashes", () => {
      assert.equal(normalizeNamespace("--my-repo--"), "my-repo");
    });

    it("preserves dots and underscores", () => {
      assert.equal(normalizeNamespace("my.repo_name"), "my.repo_name");
    });

    it('returns "repo" for empty', () => {
      assert.equal(normalizeNamespace(""), "repo");
      assert.equal(normalizeNamespace(null), "repo");
    });
  });

  describe("computeNamespace", () => {
    it("uses spec.namespace if present", () => {
      assert.equal(
        computeNamespace({ namespace: "custom" }, "ignored"),
        "custom",
      );
    });

    it("derives from repo basename", () => {
      assert.equal(
        computeNamespace({ namespace: null }, "my-project"),
        "my-project",
      );
    });

    it("normalizes derived namespace", () => {
      assert.equal(
        computeNamespace({ namespace: null }, "My Project!"),
        "my-project",
      );
    });
  });
});

// ============================================================================
// Unit tests: dotenv parser
// ============================================================================

describe("parseDotenv", () => {
  it("parses KEY=VALUE", () => {
    assert.deepEqual(parseDotenv("FOO=bar"), { FOO: "bar" });
  });

  it("parses quoted values", () => {
    assert.deepEqual(parseDotenv('FOO="bar baz"'), { FOO: "bar baz" });
    assert.deepEqual(parseDotenv("FOO='bar baz'"), { FOO: "bar baz" });
  });

  it("ignores comments", () => {
    assert.deepEqual(parseDotenv("# comment\nFOO=bar"), { FOO: "bar" });
  });

  it("ignores empty lines", () => {
    assert.deepEqual(parseDotenv("\n\nFOO=bar\n\n"), { FOO: "bar" });
  });

  it("handles multiple entries", () => {
    assert.deepEqual(parseDotenv("A=1\nB=2\nC=3"), { A: "1", B: "2", C: "3" });
  });
});

// ============================================================================
// Unit tests: builders
// ============================================================================

describe("buildClaudeServerEntry", () => {
  it("builds stdio with env placeholders", () => {
    const server = {
      id: "fetch",
      transport: "stdio",
      command: "uvx",
      args: ["mcp-server-fetch"],
      env: { API_KEY: "MY_API_KEY" },
    };
    const { key, value } = buildClaudeServerEntry(server, "myrepo");

    assert.equal(key, "myrepo.fetch");
    assert.equal(value.type, "stdio");
    assert.equal(value.command, "uvx");
    assert.deepEqual(value.args, ["mcp-server-fetch"]);
    assert.deepEqual(value.env, { API_KEY: "${MY_API_KEY}" });
  });

  it("builds http with bearer placeholder", () => {
    const server = {
      id: "figma",
      transport: "http",
      url: "https://mcp.figma.com",
      auth: { type: "bearer", token_env: "FIGMA_TOKEN" },
      headers: { "X-Custom": "value" },
    };
    const { key, value } = buildClaudeServerEntry(server, "myrepo");

    assert.equal(key, "myrepo.figma");
    assert.equal(value.type, "http");
    assert.equal(value.url, "https://mcp.figma.com");
    assert.equal(value.headers["Authorization"], "Bearer ${FIGMA_TOKEN}");
    assert.equal(value.headers["X-Custom"], "value");
  });

  it("builds http oauth without auth header", () => {
    const server = {
      id: "linear",
      transport: "http",
      url: "https://mcp.linear.app",
      auth: { type: "oauth" },
    };
    const { value } = buildClaudeServerEntry(server, "myrepo");

    assert.equal(value.headers, undefined);
  });
});

describe("buildCursorServerEntry", () => {
  it("resolves literals when env present", () => {
    const server = {
      id: "fetch",
      transport: "stdio",
      command: "uvx",
      args: ["mcp-server-fetch"],
      env: { API_KEY: "MY_API_KEY" },
    };
    const envMap = { MY_API_KEY: "secret123" };
    const result = buildCursorServerEntry(server, "myrepo", envMap);

    assert.equal(result.key, "myrepo.fetch");
    assert.deepEqual(result.value.env, { API_KEY: "secret123" });
  });

  it("returns missingEnv when env missing", () => {
    const server = {
      id: "fetch",
      transport: "stdio",
      command: "uvx",
      env: { API_KEY: "MY_API_KEY" },
      require_env: ["OTHER_KEY"],
    };
    const envMap = {};
    const result = buildCursorServerEntry(server, "myrepo", envMap);

    assert.ok("missingEnv" in result);
    assert.ok(result.missingEnv.includes("MY_API_KEY"));
    assert.ok(result.missingEnv.includes("OTHER_KEY"));
  });

  it("resolves bearer token", () => {
    const server = {
      id: "figma",
      transport: "http",
      url: "https://mcp.figma.com",
      auth: { type: "bearer", token_env: "FIGMA_TOKEN" },
    };
    const envMap = { FIGMA_TOKEN: "tok123" };
    const result = buildCursorServerEntry(server, "myrepo", envMap);

    assert.equal(result.value.headers["Authorization"], "Bearer tok123");
  });
});

describe("buildCodexCommands", () => {
  it("builds stdio command with env", () => {
    const spec = {
      servers: [
        {
          id: "fetch",
          transport: "stdio",
          command: "uvx",
          args: ["mcp-server-fetch"],
          env: { API_KEY: "MY_API_KEY" },
        },
      ],
    };
    const output = buildCodexCommands(spec, "myrepo");

    assert.ok(output.includes("codex mcp add myrepo.fetch"));
    assert.ok(output.includes('--env API_KEY="$MY_API_KEY"'));
    assert.ok(output.includes("-- uvx mcp-server-fetch"));
  });

  it("builds http bearer command", () => {
    const spec = {
      servers: [
        {
          id: "figma",
          transport: "http",
          url: "https://mcp.figma.com",
          auth: { type: "bearer", token_env: "FIGMA_TOKEN" },
        },
      ],
    };
    const output = buildCodexCommands(spec, "myrepo");

    assert.ok(output.includes("--url https://mcp.figma.com"));
    assert.ok(output.includes("--bearer-token-env-var FIGMA_TOKEN"));
  });

  it("builds http oauth with login", () => {
    const spec = {
      servers: [
        {
          id: "linear",
          transport: "http",
          url: "https://mcp.linear.app",
          auth: { type: "oauth" },
        },
      ],
    };
    const output = buildCodexCommands(spec, "myrepo");

    assert.ok(output.includes("codex mcp add myrepo.linear --url"));
    assert.ok(output.includes("codex mcp login myrepo.linear"));
  });
});

// ============================================================================
// Unit tests: merge
// ============================================================================

describe("merge", () => {
  describe("isOwnedKey", () => {
    it("returns true for owned key", () => {
      assert.ok(isOwnedKey("myrepo.fetch", "myrepo"));
    });

    it("returns false for non-owned key", () => {
      assert.ok(!isOwnedKey("other.fetch", "myrepo"));
      assert.ok(!isOwnedKey("myrepofetch", "myrepo"));
    });
  });

  describe("mergeMcpServers", () => {
    it("preserves foreign keys", () => {
      const existing = { mcpServers: { "foreign.server": { type: "stdio" } } };
      const upserts = new Map([["myrepo.new", { type: "http" }]]);
      const result = mergeMcpServers(existing, upserts, new Set(), "myrepo");

      assert.ok("foreign.server" in result.mcpServers);
      assert.ok("myrepo.new" in result.mcpServers);
    });

    it("updates owned key", () => {
      const existing = { mcpServers: { "myrepo.old": { type: "stdio" } } };
      const upserts = new Map([["myrepo.old", { type: "http" }]]);
      const result = mergeMcpServers(existing, upserts, new Set(), "myrepo");

      assert.equal(result.mcpServers["myrepo.old"].type, "http");
    });

    it("deletes owned key not in upserts", () => {
      const existing = {
        mcpServers: {
          "myrepo.old": { type: "stdio" },
          "myrepo.keep": { type: "http" },
        },
      };
      const upserts = new Map([["myrepo.keep", { type: "http" }]]);
      const result = mergeMcpServers(existing, upserts, new Set(), "myrepo");

      assert.ok(!("myrepo.old" in result.mcpServers));
      assert.ok("myrepo.keep" in result.mcpServers);
    });

    it("does not delete foreign key", () => {
      const existing = { mcpServers: { "foreign.server": { type: "stdio" } } };
      const upserts = new Map();
      const result = mergeMcpServers(
        existing,
        upserts,
        new Set(["foreign.server"]),
        "myrepo",
      );

      assert.ok("foreign.server" in result.mcpServers);
    });
  });
});

// ============================================================================
// Integration tests
// ============================================================================

describe("integration", () => {
  before(() => {
    // Clear temp root
    if (existsSync(TEMP_ROOT)) {
      rmSync(TEMP_ROOT, { recursive: true, force: true });
    }
    mkdirSync(TEMP_ROOT, { recursive: true });
  });

  after(() => {
    // Cleanup temp root
    if (existsSync(TEMP_ROOT)) {
      rmSync(TEMP_ROOT, { recursive: true, force: true });
    }
  });

  it("writes .mcp.json and .cursor/mcp.json", async (t) => {
    const dir = createTestDir("basic");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: testns
servers:
  - id: test
    transport: stdio
    command: echo
    args: ["hello"]
`,
    );

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();

    const result = run({ repoRoot: dir, stdout, stderr });

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    assert.ok(result.success);
    assert.ok(existsSync(join(dir, ".mcp.json")));
    assert.ok(existsSync(join(dir, ".cursor", "mcp.json")));

    const claude = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf-8"));
    assert.ok("testns.test" in claude.mcpServers);
  });

  it("Claude uses placeholders, Cursor uses literals", async (t) => {
    const dir = createTestDir("placeholders");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: test
servers:
  - id: api
    transport: stdio
    command: myapi
    env:
      TOKEN: MY_SECRET
`,
    );

    writeFileSync(join(dir, ".env.local"), "MY_SECRET=actual_secret_value\n");

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();

    run({ repoRoot: dir, stdout, stderr });

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const claude = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf-8"));
    const cursor = JSON.parse(
      readFileSync(join(dir, ".cursor", "mcp.json"), "utf-8"),
    );

    assert.equal(claude.mcpServers["test.api"].env.TOKEN, "${MY_SECRET}");
    assert.equal(
      cursor.mcpServers["test.api"].env.TOKEN,
      "actual_secret_value",
    );
  });

  it("preserves non-owned keys on merge", async (t) => {
    const dir = createTestDir("merge-preserve");

    // Write existing config with foreign key
    mkdirSync(join(dir, ".cursor"), { recursive: true });
    writeFileSync(
      join(dir, ".mcp.json"),
      JSON.stringify({ mcpServers: { "foreign.server": { type: "stdio" } } }),
    );
    writeFileSync(
      join(dir, ".cursor", "mcp.json"),
      JSON.stringify({ mcpServers: { "foreign.server": { type: "stdio" } } }),
    );

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: myns
servers:
  - id: new
    transport: stdio
    command: test
`,
    );

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();

    run({ repoRoot: dir, stdout, stderr });

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const claude = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf-8"));
    const cursor = JSON.parse(
      readFileSync(join(dir, ".cursor", "mcp.json"), "utf-8"),
    );

    // Foreign key preserved
    assert.ok("foreign.server" in claude.mcpServers);
    assert.ok("foreign.server" in cursor.mcpServers);
    // New key added
    assert.ok("myns.new" in claude.mcpServers);
    assert.ok("myns.new" in cursor.mcpServers);
  });

  it("Cursor skips on missing env and emits warning", async (t) => {
    const dir = createTestDir("missing-env");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: test
servers:
  - id: api
    transport: stdio
    command: myapi
    require_env: ["MISSING_VAR"]
`,
    );

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();

    const result = run({ repoRoot: dir, stdout, stderr });

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    assert.ok(result.success);
    assert.ok(result.warnings.some((w) => w.includes("MISSING_VAR")));
    assert.ok(stderr.getContent().includes("WARN"));

    const cursor = JSON.parse(
      readFileSync(join(dir, ".cursor", "mcp.json"), "utf-8"),
    );
    assert.ok(!("test.api" in cursor.mcpServers));
  });

  it("Cursor deletes previously-existing owned entry when env goes missing", async (t) => {
    const dir = createTestDir("delete-missing");

    // Write existing cursor config with the server
    mkdirSync(join(dir, ".cursor"), { recursive: true });
    writeFileSync(
      join(dir, ".cursor", "mcp.json"),
      JSON.stringify({
        mcpServers: {
          "test.api": { command: "old", args: [] },
        },
      }),
    );

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: test
servers:
  - id: api
    transport: stdio
    command: myapi
    require_env: ["MISSING_VAR"]
`,
    );

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();

    run({ repoRoot: dir, stdout, stderr });

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const cursor = JSON.parse(
      readFileSync(join(dir, ".cursor", "mcp.json"), "utf-8"),
    );
    assert.ok(!("test.api" in cursor.mcpServers));
  });

  it("idempotency - second run produces identical files", async (t) => {
    const dir = createTestDir("idempotent");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: idem
servers:
  - id: server
    transport: stdio
    command: test
    args: ["a", "b"]
`,
    );

    const stdout1 = createCaptureStream();
    const stderr1 = createCaptureStream();
    run({ repoRoot: dir, stdout: stdout1, stderr: stderr1 });

    const claude1 = readFileSync(join(dir, ".mcp.json"), "utf-8");
    const cursor1 = readFileSync(join(dir, ".cursor", "mcp.json"), "utf-8");

    const stdout2 = createCaptureStream();
    const stderr2 = createCaptureStream();
    run({ repoRoot: dir, stdout: stdout2, stderr: stderr2 });

    const claude2 = readFileSync(join(dir, ".mcp.json"), "utf-8");
    const cursor2 = readFileSync(join(dir, ".cursor", "mcp.json"), "utf-8");

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    assert.equal(claude1, claude2);
    assert.equal(cursor1, cursor2);
  });

  it("codex commands printed to stdout", async (t) => {
    const dir = createTestDir("codex-output");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: codextest
servers:
  - id: api
    transport: stdio
    command: myapi
    args: ["--flag"]
    env:
      TOKEN: API_TOKEN
  - id: web
    transport: http
    url: "https://example.com"
    auth:
      type: bearer
      token_env: WEB_TOKEN
`,
    );

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();

    run({ repoRoot: dir, stdout, stderr });

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const output = stdout.getContent();
    assert.ok(output.includes("codex mcp add codextest.api"));
    assert.ok(output.includes('--env TOKEN="$API_TOKEN"'));
    assert.ok(output.includes("-- myapi --flag"));
    assert.ok(output.includes("codex mcp add codextest.web"));
    assert.ok(output.includes("--bearer-token-env-var WEB_TOKEN"));
  });

  it("shared fixture generates all server types correctly", async (t) => {
    const dir = createTestDir("shared-fixture");

    // Copy shared fixture
    copyFileSync(FIXTURE_PATH, join(dir, "workflows", "mcp", "servers.yml"));

    // Create test env with some values (missing REQUIRED_SECRET intentionally)
    writeFileSync(
      join(dir, ".env.local"),
      [
        "TEST_API_KEY=test-key-123",
        "TEST_API_SECRET=test-secret-456",
        "FIGMA_TOKEN=figma-tok-789",
      ].join("\n"),
    );

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();

    const result = run({ repoRoot: dir, stdout, stderr });

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    assert.ok(result.success);

    // Parse generated configs
    const claude = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf-8"));
    const cursor = JSON.parse(
      readFileSync(join(dir, ".cursor", "mcp.json"), "utf-8"),
    );

    // Claude should have all 7 servers
    assert.equal(Object.keys(claude.mcpServers).length, 7);
    assert.ok("test-fixture.basic-stdio" in claude.mcpServers);
    assert.ok("test-fixture.stdio-with-cwd" in claude.mcpServers);
    assert.ok("test-fixture.stdio-with-env" in claude.mcpServers);
    assert.ok("test-fixture.stdio-required-env" in claude.mcpServers);
    assert.ok("test-fixture.http-no-auth" in claude.mcpServers);
    assert.ok("test-fixture.http-bearer" in claude.mcpServers);
    assert.ok("test-fixture.http-oauth" in claude.mcpServers);

    // Claude uses placeholders
    assert.equal(
      claude.mcpServers["test-fixture.stdio-with-env"].env.API_KEY,
      "${TEST_API_KEY}",
    );
    assert.equal(
      claude.mcpServers["test-fixture.http-bearer"].headers.Authorization,
      "Bearer ${FIGMA_TOKEN}",
    );

    // Cursor should have 6 servers (missing stdio-required-env due to missing REQUIRED_SECRET)
    assert.equal(Object.keys(cursor.mcpServers).length, 6);
    assert.ok(!("test-fixture.stdio-required-env" in cursor.mcpServers));

    // Cursor uses literals
    assert.equal(
      cursor.mcpServers["test-fixture.stdio-with-env"].env.API_KEY,
      "test-key-123",
    );
    assert.equal(
      cursor.mcpServers["test-fixture.http-bearer"].headers.Authorization,
      "Bearer figma-tok-789",
    );

    // Should have warning about missing REQUIRED_SECRET
    assert.ok(result.warnings.some((w) => w.includes("REQUIRED_SECRET")));

    // Codex commands should include all servers
    const codexOutput = stdout.getContent();
    assert.ok(codexOutput.includes("codex mcp add test-fixture.basic-stdio"));
    assert.ok(codexOutput.includes("codex mcp add test-fixture.http-oauth"));
    assert.ok(codexOutput.includes("codex mcp login test-fixture.http-oauth"));
  });
});

// ============================================================================
// Unit tests: gitignore
// ============================================================================

describe("ensureGitignorePatterns", () => {
  it("creates .gitignore if missing", async (t) => {
    const dir = createTestDir("gitignore-create");

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const result = ensureGitignorePatterns(dir);

    assert.ok(result.updated);
    assert.deepEqual(result.added, REQUIRED_PATTERNS);

    const content = readFileSync(join(dir, ".gitignore"), "utf-8");
    assert.ok(content.includes(GITIGNORE_MARKER));
    for (const pattern of REQUIRED_PATTERNS) {
      assert.ok(content.includes(pattern), `Missing pattern: ${pattern}`);
    }
  });

  it("appends missing patterns to existing .gitignore", async (t) => {
    const dir = createTestDir("gitignore-append");

    const existingContent = "node_modules/\n*.log\n";
    writeFileSync(join(dir, ".gitignore"), existingContent);

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const result = ensureGitignorePatterns(dir);

    assert.ok(result.updated);
    assert.deepEqual(result.added, REQUIRED_PATTERNS);

    const content = readFileSync(join(dir, ".gitignore"), "utf-8");

    // Existing content preserved at the start
    assert.ok(content.startsWith(existingContent.trim()));

    // New patterns appended
    assert.ok(content.includes(GITIGNORE_MARKER));
    for (const pattern of REQUIRED_PATTERNS) {
      assert.ok(content.includes(pattern), `Missing pattern: ${pattern}`);
    }
  });

  it("is idempotent - second run makes no changes", async (t) => {
    const dir = createTestDir("gitignore-idem");

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    // First run
    const result1 = ensureGitignorePatterns(dir);
    assert.ok(result1.updated);
    const content1 = readFileSync(join(dir, ".gitignore"), "utf-8");

    // Second run
    const result2 = ensureGitignorePatterns(dir);
    assert.ok(!result2.updated);
    assert.deepEqual(result2.added, []);
    const content2 = readFileSync(join(dir, ".gitignore"), "utf-8");

    // Content unchanged
    assert.equal(content1, content2);
  });

  it("only appends patterns that are actually missing", async (t) => {
    const dir = createTestDir("gitignore-partial");

    // Pre-populate with one of the patterns
    const existingContent = "node_modules/\n.env\n";
    writeFileSync(join(dir, ".gitignore"), existingContent);

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const result = ensureGitignorePatterns(dir);

    assert.ok(result.updated);
    // .env already exists, so only the other two should be added
    assert.ok(!result.added.includes(".env"));
    assert.ok(result.added.includes(".cursor/mcp*.json"));
    assert.ok(result.added.includes(".env.local"));

    const content = readFileSync(join(dir, ".gitignore"), "utf-8");

    // Count occurrences of .env - should only appear once (the original)
    const envMatches = content.split("\n").filter((l) => l.trim() === ".env");
    assert.equal(envMatches.length, 1);
  });

  it("preserves existing content exactly (append-only)", async (t) => {
    const dir = createTestDir("gitignore-preserve");

    // Complex existing content with comments and blank lines
    const existingContent = `# Build output
dist/
*.js.map

# Dependencies
node_modules/

# Editor
.vscode/
*.swp
`;
    writeFileSync(join(dir, ".gitignore"), existingContent);

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    ensureGitignorePatterns(dir);

    const content = readFileSync(join(dir, ".gitignore"), "utf-8");

    // All existing lines preserved in order
    const existingLines = existingContent.split("\n").filter(Boolean);
    for (const line of existingLines) {
      assert.ok(content.includes(line), `Missing line: ${line}`);
    }

    // Existing content comes before marker
    const markerIndex = content.indexOf(GITIGNORE_MARKER);
    for (const line of existingLines) {
      const lineIndex = content.indexOf(line);
      assert.ok(
        lineIndex < markerIndex,
        `Line "${line}" should appear before marker`,
      );
    }
  });
});

// ============================================================================
// Integration tests: gitignore + run()
// ============================================================================

describe("integration - gitignore", () => {
  it("run() ensures gitignore patterns", async (t) => {
    const dir = createTestDir("run-gitignore");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: test
servers:
  - id: api
    transport: stdio
    command: test
`,
    );

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();

    run({ repoRoot: dir, stdout, stderr });

    // .gitignore should be created with patterns
    assert.ok(existsSync(join(dir, ".gitignore")));
    const content = readFileSync(join(dir, ".gitignore"), "utf-8");

    for (const pattern of REQUIRED_PATTERNS) {
      assert.ok(content.includes(pattern), `Missing pattern: ${pattern}`);
    }

    // stderr should mention the addition
    assert.ok(stderr.getContent().includes("INFO: Added to .gitignore"));
  });

  it("run() gitignore is idempotent", async (t) => {
    const dir = createTestDir("run-gitignore-idem");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: test
servers:
  - id: api
    transport: stdio
    command: test
`,
    );

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const stdout1 = createCaptureStream();
    const stderr1 = createCaptureStream();
    run({ repoRoot: dir, stdout: stdout1, stderr: stderr1 });

    const content1 = readFileSync(join(dir, ".gitignore"), "utf-8");

    const stdout2 = createCaptureStream();
    const stderr2 = createCaptureStream();
    run({ repoRoot: dir, stdout: stdout2, stderr: stderr2 });

    const content2 = readFileSync(join(dir, ".gitignore"), "utf-8");

    // Content unchanged after second run
    assert.equal(content1, content2);

    // Second run should not mention adding to gitignore
    assert.ok(!stderr2.getContent().includes("INFO: Added to .gitignore"));
  });
});
