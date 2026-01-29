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

    it("preserves underscores but replaces dots", () => {
      assert.equal(normalizeNamespace("my.repo_name"), "my-repo_name");
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

  it("strips inline comments after quoted values", () => {
    assert.deepEqual(parseDotenv("FOO='bar' # comment"), { FOO: "bar" });
    assert.deepEqual(parseDotenv('FOO="bar # baz" # comment'), {
      FOO: "bar # baz",
    });
    assert.deepEqual(parseDotenv("FOO='bar'#comment"), { FOO: "bar" });
    assert.deepEqual(parseDotenv("FOO='bar#baz'#comment"), { FOO: "bar#baz" });
  });

  it("strips inline comments for unquoted values", () => {
    assert.deepEqual(parseDotenv("FOO=bar # comment"), { FOO: "bar" });
    assert.deepEqual(parseDotenv("FOO=bar#comment"), { FOO: "bar" });
    assert.deepEqual(parseDotenv("FOO=bar# <-- fill in"), { FOO: "bar" });
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
  it("builds stdio with resolved env values", () => {
    const server = {
      id: "fetch",
      transport: "stdio",
      command: "uvx",
      args: ["mcp-server-fetch"],
      env: { API_KEY: "MY_API_KEY" },
    };
    const envMap = { MY_API_KEY: "secret123" };
    const { key, value } = buildClaudeServerEntry(server, "myrepo", envMap);

    assert.equal(key, "myrepo.fetch");
    assert.equal(value.type, "stdio");
    assert.equal(value.command, "uvx");
    assert.deepEqual(value.args, ["mcp-server-fetch"]);
    assert.deepEqual(value.env, { API_KEY: "secret123" });
  });

  it("builds http with resolved bearer token", () => {
    const server = {
      id: "figma",
      transport: "http",
      url: "https://mcp.figma.com",
      auth: { type: "bearer", token_env: "FIGMA_TOKEN" },
      headers: { "X-Custom": "value" },
    };
    const envMap = { FIGMA_TOKEN: "tok123" };
    const { key, value } = buildClaudeServerEntry(server, "myrepo", envMap);

    assert.equal(key, "myrepo.figma");
    assert.equal(value.type, "http");
    assert.equal(value.url, "https://mcp.figma.com");
    assert.equal(value.headers["Authorization"], "Bearer tok123");
    assert.equal(value.headers["X-Custom"], "value");
  });

  it("returns missingEnv when required env is missing", () => {
    const server = {
      id: "fetch",
      transport: "stdio",
      command: "uvx",
      env: { API_KEY: "MY_API_KEY" },
      require_env: ["OTHER_KEY"],
    };
    const envMap = {};
    const result = buildClaudeServerEntry(server, "myrepo", envMap);

    assert.ok("missingEnv" in result);
    assert.ok(result.missingEnv.includes("MY_API_KEY"));
    assert.ok(result.missingEnv.includes("OTHER_KEY"));
  });

  it("builds http oauth without auth header", () => {
    const server = {
      id: "linear",
      transport: "http",
      url: "https://mcp.linear.app",
      auth: { type: "oauth" },
    };
    const { value } = buildClaudeServerEntry(server, "myrepo", {});

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

    assert.ok(output.includes("codex mcp add myrepo-fetch"));
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

    assert.ok(output.includes("codex mcp add myrepo-linear --url"));
    assert.ok(output.includes("codex mcp login myrepo-linear"));
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

  it("Claude and Cursor use literals", async (t) => {
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

    assert.equal(
      claude.mcpServers["test.api"].env.TOKEN,
      "actual_secret_value",
    );
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

  it("Claude and Cursor skip on missing env and emit warning", async (t) => {
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

    const claude = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf-8"));
    const cursor = JSON.parse(
      readFileSync(join(dir, ".cursor", "mcp.json"), "utf-8"),
    );
    assert.ok(!("test.api" in claude.mcpServers));
    assert.ok(!("test.api" in cursor.mcpServers));
  });

  it("Claude and Cursor delete owned entry when env goes missing", async (t) => {
    const dir = createTestDir("delete-missing");

    // Write existing configs with the server
    mkdirSync(join(dir, ".cursor"), { recursive: true });
    writeFileSync(
      join(dir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          "test.api": { type: "stdio", command: "old", args: [] },
        },
      }),
    );
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

    const claude = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf-8"));
    const cursor = JSON.parse(
      readFileSync(join(dir, ".cursor", "mcp.json"), "utf-8"),
    );
    assert.ok(!("test.api" in claude.mcpServers));
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
    assert.ok(output.includes("codex mcp add codextest-api"));
    assert.ok(output.includes('--env TOKEN="$API_TOKEN"'));
    assert.ok(output.includes("-- myapi --flag"));
    assert.ok(output.includes("codex mcp add codextest-web"));
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

    // Claude should have 6 servers (missing stdio-required-env)
    assert.equal(Object.keys(claude.mcpServers).length, 6);
    assert.ok("test-fixture.basic-stdio" in claude.mcpServers);
    assert.ok("test-fixture.stdio-with-cwd" in claude.mcpServers);
    assert.ok("test-fixture.stdio-with-env" in claude.mcpServers);
    assert.ok("test-fixture.http-no-auth" in claude.mcpServers);
    assert.ok("test-fixture.http-bearer" in claude.mcpServers);
    assert.ok("test-fixture.http-oauth" in claude.mcpServers);
    assert.ok(!("test-fixture.stdio-required-env" in claude.mcpServers));

    // Claude uses literals
    assert.equal(
      claude.mcpServers["test-fixture.stdio-with-env"].env.API_KEY,
      "test-key-123",
    );
    assert.equal(
      claude.mcpServers["test-fixture.http-bearer"].headers.Authorization,
      "Bearer figma-tok-789",
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
    assert.ok(codexOutput.includes("codex mcp add test-fixture-basic-stdio"));
    assert.ok(codexOutput.includes("codex mcp add test-fixture-http-oauth"));
    assert.ok(codexOutput.includes("codex mcp login test-fixture-http-oauth"));
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
    // .env already exists, so only the other three should be added
    assert.ok(!result.added.includes(".env"));
    assert.ok(result.added.includes(".mcp.json"));
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

// ============================================================================
// Unit tests: scaffold
// ============================================================================

import {
  scaffoldEnvLocal,
  collectMissingEnvs,
  isPlaceholderValue,
  SCAFFOLD_MARKER,
} from "../../workflows/mcp/index.mjs";

describe("scaffoldEnvLocal", () => {
  it("creates .env.local with missing env vars", async (t) => {
    const dir = createTestDir("scaffold-create");

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const missingEnvs = [
      { serverKey: "test.api", envVar: "API_KEY", hint: "your-api-key" },
    ];

    const result = scaffoldEnvLocal(dir, missingEnvs);

    assert.ok(result.updated);
    assert.deepEqual(result.added, ["API_KEY"]);

    const content = readFileSync(join(dir, ".env.local"), "utf-8");
    assert.ok(content.includes(SCAFFOLD_MARKER));
    assert.ok(content.includes("# Server: test.api"));
    assert.ok(content.includes("API_KEY='your-api-key' # <-- fill in"));
  });

  it("includes inline fill-in marker", async (t) => {
    const dir = createTestDir("scaffold-fill-in");

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const missingEnvs = [
      { serverKey: "ns.server", envVar: "MY_TOKEN", hint: "secret123" },
    ];

    scaffoldEnvLocal(dir, missingEnvs);

    const content = readFileSync(join(dir, ".env.local"), "utf-8");
    assert.ok(
      content.includes("MY_TOKEN='secret123' # <-- fill in"),
      "Should include inline fill-in marker",
    );
  });

  it("outputs uncommented placeholders", async (t) => {
    const dir = createTestDir("scaffold-uncommented");

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const missingEnvs = [
      { serverKey: "ns.server", envVar: "MY_VAR", hint: "value" },
    ];

    scaffoldEnvLocal(dir, missingEnvs);

    const content = readFileSync(join(dir, ".env.local"), "utf-8");
    // Should be uncommented (no leading #)
    assert.ok(content.includes("MY_VAR='value'"), "Should be uncommented");
    assert.ok(
      !content.includes("# MY_VAR="),
      "Should not have commented version",
    );
  });

  it("uses default hint when none provided", async (t) => {
    const dir = createTestDir("scaffold-default-hint");

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const missingEnvs = [{ serverKey: "test.api", envVar: "NO_HINT" }];

    scaffoldEnvLocal(dir, missingEnvs);

    const content = readFileSync(join(dir, ".env.local"), "utf-8");
    assert.ok(content.includes("NO_HINT='YOUR_VALUE_HERE' # <-- fill in"));
  });

  it("is idempotent - second run makes no changes", async (t) => {
    const dir = createTestDir("scaffold-idem");

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const missingEnvs = [{ serverKey: "test.api", envVar: "API_KEY" }];

    // First run
    const result1 = scaffoldEnvLocal(dir, missingEnvs);
    assert.ok(result1.updated);
    const content1 = readFileSync(join(dir, ".env.local"), "utf-8");

    // Second run
    const result2 = scaffoldEnvLocal(dir, missingEnvs);
    assert.ok(!result2.updated);
    assert.deepEqual(result2.added, []);
    const content2 = readFileSync(join(dir, ".env.local"), "utf-8");

    // Content unchanged
    assert.equal(content1, content2);
  });

  it("skips env vars that already exist (commented or not)", async (t) => {
    const dir = createTestDir("scaffold-skip-existing");

    // Pre-populate with one commented and one uncommented var
    const existingContent = "EXISTING_VAR=value\n# COMMENTED_VAR=old\n";
    writeFileSync(join(dir, ".env.local"), existingContent);

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const missingEnvs = [
      { serverKey: "test.api", envVar: "EXISTING_VAR" },
      { serverKey: "test.api", envVar: "COMMENTED_VAR" },
      { serverKey: "test.api", envVar: "NEW_VAR" },
    ];

    const result = scaffoldEnvLocal(dir, missingEnvs);

    assert.ok(result.updated);
    assert.deepEqual(result.added, ["NEW_VAR"]);

    const content = readFileSync(join(dir, ".env.local"), "utf-8");
    // Should only add NEW_VAR
    assert.ok(content.includes("NEW_VAR='YOUR_VALUE_HERE' # <-- fill in"));
    // Should not duplicate existing vars
    const existingMatches = content.match(/EXISTING_VAR/g);
    assert.equal(existingMatches.length, 1);
  });

  it("groups by server for readability", async (t) => {
    const dir = createTestDir("scaffold-group");

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const missingEnvs = [
      { serverKey: "ns.server1", envVar: "VAR_A" },
      { serverKey: "ns.server1", envVar: "VAR_B" },
      { serverKey: "ns.server2", envVar: "VAR_C" },
    ];

    scaffoldEnvLocal(dir, missingEnvs);

    const content = readFileSync(join(dir, ".env.local"), "utf-8");
    assert.ok(content.includes("# Server: ns.server1"));
    assert.ok(content.includes("# Server: ns.server2"));
  });
});

describe("collectMissingEnvs", () => {
  it("collects missing env vars from servers", () => {
    const servers = [
      {
        id: "api",
        transport: "stdio",
        command: "test",
        require_env: ["API_KEY"],
        env_hints: { API_KEY: "hint-value" },
      },
    ];
    const envMap = {}; // Empty - all missing

    const missing = collectMissingEnvs(servers, "ns", envMap);

    assert.equal(missing.length, 1);
    assert.equal(missing[0].serverKey, "ns.api");
    assert.equal(missing[0].envVar, "API_KEY");
    assert.equal(missing[0].hint, "hint-value");
  });

  it("skips env vars that are present", () => {
    const servers = [
      {
        id: "api",
        transport: "stdio",
        command: "test",
        require_env: ["API_KEY"],
      },
    ];
    const envMap = { API_KEY: "exists" };

    const missing = collectMissingEnvs(servers, "ns", envMap);

    assert.equal(missing.length, 0);
  });

  it("collects bearer token_env", () => {
    const servers = [
      {
        id: "web",
        transport: "http",
        url: "https://example.com",
        auth: { type: "bearer", token_env: "WEB_TOKEN" },
      },
    ];
    const envMap = {};

    const missing = collectMissingEnvs(servers, "ns", envMap);

    assert.equal(missing.length, 1);
    assert.equal(missing[0].envVar, "WEB_TOKEN");
  });
});

describe("isPlaceholderValue", () => {
  it("returns true for values containing YOUR_", () => {
    assert.ok(isPlaceholderValue("YOUR_TOKEN_HERE"));
    assert.ok(isPlaceholderValue("YOUR_API_KEY"));
    assert.ok(isPlaceholderValue('{"Authorization":"Bearer YOUR_TOKEN"}'));
  });

  it("returns true for values containing _HERE", () => {
    assert.ok(isPlaceholderValue("VALUE_HERE"));
    assert.ok(isPlaceholderValue("INSERT_HERE"));
  });

  it("returns false for real values", () => {
    assert.ok(!isPlaceholderValue("actual-token-12345"));
    assert.ok(!isPlaceholderValue('{"Authorization":"Bearer ntn_abc123"}'));
    assert.ok(!isPlaceholderValue("my-secret-key"));
  });

  it("returns true for empty or undefined", () => {
    assert.ok(isPlaceholderValue(""));
    assert.ok(isPlaceholderValue(null));
    assert.ok(isPlaceholderValue(undefined));
  });
});

describe("buildCursorServerEntry - placeholder detection", () => {
  it("skips servers when env has placeholder value", () => {
    const server = {
      id: "api",
      transport: "stdio",
      command: "test",
      env: { TOKEN: "MY_TOKEN" },
    };
    const envMap = { MY_TOKEN: "YOUR_VALUE_HERE" }; // Placeholder

    const result = buildCursorServerEntry(server, "ns", envMap);

    assert.ok("missingEnv" in result);
    assert.ok(result.missingEnv.includes("MY_TOKEN"));
  });

  it("includes servers when env has real value", () => {
    const server = {
      id: "api",
      transport: "stdio",
      command: "test",
      env: { TOKEN: "MY_TOKEN" },
    };
    const envMap = { MY_TOKEN: "actual-secret-12345" }; // Real value

    const result = buildCursorServerEntry(server, "ns", envMap);

    assert.ok("value" in result);
    assert.equal(result.value.env.TOKEN, "actual-secret-12345");
  });
});

// ============================================================================
// Integration tests: scaffold + run()
// ============================================================================

describe("integration - scaffold", () => {
  it("run() scaffolds .env.local with missing env vars", async (t) => {
    const dir = createTestDir("run-scaffold");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: test
servers:
  - id: api
    transport: stdio
    command: test
    require_env: ["MISSING_VAR"]
    env_hints:
      MISSING_VAR: "template-value"
`,
    );

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();

    run({ repoRoot: dir, stdout, stderr });

    // .env.local should be created with scaffold
    assert.ok(existsSync(join(dir, ".env.local")));
    const content = readFileSync(join(dir, ".env.local"), "utf-8");

    assert.ok(content.includes(SCAFFOLD_MARKER));
    assert.ok(content.includes("MISSING_VAR='template-value' # <-- fill in"));

    // stderr should mention the scaffolding
    assert.ok(stderr.getContent().includes("INFO: Scaffolded .env.local"));
  });

  it("run() scaffold is idempotent", async (t) => {
    const dir = createTestDir("run-scaffold-idem");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: test
servers:
  - id: api
    transport: stdio
    command: test
    require_env: ["MISSING_VAR"]
`,
    );

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const stdout1 = createCaptureStream();
    const stderr1 = createCaptureStream();
    run({ repoRoot: dir, stdout: stdout1, stderr: stderr1 });

    const content1 = readFileSync(join(dir, ".env.local"), "utf-8");

    const stdout2 = createCaptureStream();
    const stderr2 = createCaptureStream();
    run({ repoRoot: dir, stdout: stdout2, stderr: stderr2 });

    const content2 = readFileSync(join(dir, ".env.local"), "utf-8");

    // Content unchanged after second run
    assert.equal(content1, content2);

    // Second run should not mention scaffolding
    assert.ok(!stderr2.getContent().includes("INFO: Scaffolded .env.local"));
  });

  it("end-to-end: scaffold -> fill in -> Cursor includes server", async (t) => {
    const dir = createTestDir("e2e-scaffold-flow");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: test
servers:
  - id: api
    transport: stdio
    command: my-server
    args: ["--mode", "api"]
    require_env: ["API_TOKEN"]
    env:
      TOKEN: API_TOKEN
    env_hints:
      API_TOKEN: "YOUR_API_TOKEN_HERE"
`,
    );

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    // === Step 1: Run with missing env var ===
    const stdout1 = createCaptureStream();
    const stderr1 = createCaptureStream();
    run({ repoRoot: dir, stdout: stdout1, stderr: stderr1 });

    // .env.local should be created with scaffold
    const envLocalPath = join(dir, ".env.local");
    assert.ok(existsSync(envLocalPath), ".env.local should be created");

    const scaffoldContent = readFileSync(envLocalPath, "utf-8");
    assert.ok(
      scaffoldContent.includes("API_TOKEN='YOUR_API_TOKEN_HERE' # <-- fill in"),
      "Should have uncommented placeholder with fill-in marker",
    );

    // Cursor config should skip the server
    const cursorPath = join(dir, ".cursor", "mcp.json");
    assert.ok(existsSync(cursorPath), "Cursor config should exist");
    const cursorConfig1 = JSON.parse(readFileSync(cursorPath, "utf-8"));
    assert.ok(
      !("test.api" in cursorConfig1.mcpServers),
      "Cursor should skip server with missing/placeholder env",
    );

    // stderr should warn about skipping
    assert.ok(
      stderr1.getContent().includes("Skipping test.api for Cursor"),
      "Should warn about skipping",
    );

    // === Step 2: Simulate user filling in the value ===
    writeFileSync(envLocalPath, "API_TOKEN='real-secret-token-12345'\n");

    // === Step 3: Run again with real value ===
    const stdout2 = createCaptureStream();
    const stderr2 = createCaptureStream();
    run({ repoRoot: dir, stdout: stdout2, stderr: stderr2 });

    // Cursor config should now include the server
    const cursorConfig2 = JSON.parse(readFileSync(cursorPath, "utf-8"));
    assert.ok(
      "test.api" in cursorConfig2.mcpServers,
      "Cursor should now include server with real value",
    );

    const serverEntry = cursorConfig2.mcpServers["test.api"];
    assert.equal(serverEntry.command, "my-server");
    assert.deepEqual(serverEntry.args, ["--mode", "api"]);
    assert.equal(
      serverEntry.env.TOKEN,
      "real-secret-token-12345",
      "Env should have resolved real value",
    );

    // stderr should NOT warn about skipping anymore
    assert.ok(
      !stderr2.getContent().includes("Skipping test.api"),
      "Should not warn when env is present",
    );
  });

  it("Cursor skips server when env has placeholder value from scaffold", async (t) => {
    const dir = createTestDir("e2e-placeholder-skip");

    writeFileSync(
      join(dir, "workflows", "mcp", "servers.yml"),
      `
version: 1
namespace: test
servers:
  - id: svc
    transport: stdio
    command: svc-cmd
    require_env: ["SVC_KEY"]
    env:
      KEY: SVC_KEY
    env_hints:
      SVC_KEY: "YOUR_SERVICE_KEY"
`,
    );

    // Pre-create .env.local with the placeholder (as if scaffold just ran)
    writeFileSync(join(dir, ".env.local"), "SVC_KEY='YOUR_SERVICE_KEY'\n");

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();
    run({ repoRoot: dir, stdout, stderr });

    // Cursor should skip because value contains YOUR_
    const cursorConfig = JSON.parse(
      readFileSync(join(dir, ".cursor", "mcp.json"), "utf-8"),
    );
    assert.ok(
      !("test.svc" in cursorConfig.mcpServers),
      "Cursor should skip server with placeholder value",
    );

    assert.ok(
      stderr.getContent().includes("Skipping test.svc for Cursor"),
      "Should warn about placeholder value",
    );
  });
});
