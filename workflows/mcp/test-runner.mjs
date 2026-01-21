#!/usr/bin/env node

/**
 * Interactive test runner for mcp-gen.
 *
 * Usage: node workflows/mcp/test-runner.mjs
 *    or: npm run mcp-gen:test
 *
 * Portability note: this script depends on harness-tests/ fixtures.
 * If you only drop in .harness/ and workflows/, omit or adapt this runner.
 *
 * This script:
 * 1. Creates a temp directory with the shared fixture
 * 2. Optionally sets test env vars
 * 3. Runs mcp-gen against the fixture
 * 4. Displays the generated configs
 * 5. Cleans up
 */

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

import { run } from "./src/run.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Compute paths
const repoRoot = resolve(__dirname, "..", "..");
const fixtureSource = join(
  repoRoot,
  "harness-tests",
  "fixtures",
  "mcp-servers.yml",
);
const tempDir = join(
  repoRoot,
  "harness-tests",
  "tests",
  ".tmp",
  "mcp-gen-interactive",
);

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(msg, color = "") {
  console.log(`${color}${msg}${colors.reset}`);
}

function header(msg) {
  log(`\n${"=".repeat(60)}`, colors.dim);
  log(msg, colors.bold + colors.cyan);
  log("=".repeat(60), colors.dim);
}

function main() {
  log("\nmcp-gen Test Runner", colors.bold + colors.blue);
  log(
    "Testing with shared fixture: harness-tests/fixtures/mcp-servers.yml\n",
    colors.dim,
  );

  // Setup temp directory
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(join(tempDir, "workflows", "mcp"), { recursive: true });

  // Copy fixture
  copyFileSync(fixtureSource, join(tempDir, "workflows", "mcp", "servers.yml"));

  // Create test .env.local with some test values
  writeFileSync(
    join(tempDir, ".env.local"),
    [
      "# Test environment variables",
      "TEST_API_KEY=test-api-key-12345",
      "TEST_API_SECRET=test-api-secret-67890",
      "FIGMA_TOKEN=figma-test-token-abcdef",
      "# Note: REQUIRED_SECRET is intentionally missing to test skip behavior",
    ].join("\n") + "\n",
  );

  log("Test env vars set:", colors.green);
  log("  TEST_API_KEY=test-api-key-12345", colors.dim);
  log("  TEST_API_SECRET=test-api-secret-67890", colors.dim);
  log("  FIGMA_TOKEN=figma-test-token-abcdef", colors.dim);
  log("  REQUIRED_SECRET=(missing - will trigger warning)", colors.yellow);

  // Run mcp-gen
  header("Running mcp-gen");

  const result = run({
    repoRoot: tempDir,
    stdout: process.stdout,
    stderr: process.stderr,
  });

  if (!result.success) {
    log("\nERROR: mcp-gen failed", colors.yellow);
    rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  // Display generated configs
  header("Generated: .mcp.json (Claude)");
  const claudeConfig = readFileSync(join(tempDir, ".mcp.json"), "utf-8");
  console.log(claudeConfig);

  header("Generated: .cursor/mcp.json (Cursor)");
  const cursorConfig = readFileSync(
    join(tempDir, ".cursor", "mcp.json"),
    "utf-8",
  );
  console.log(cursorConfig);

  // Summary
  header("Summary");

  const claudeData = JSON.parse(claudeConfig);
  const cursorData = JSON.parse(cursorConfig);

  const claudeCount = Object.keys(claudeData.mcpServers).length;
  const cursorCount = Object.keys(cursorData.mcpServers).length;

  log(`Claude servers: ${claudeCount}`, colors.green);
  log(`Cursor servers: ${cursorCount}`, colors.green);

  if (result.warnings.length > 0) {
    log(`Warnings: ${result.warnings.length}`, colors.yellow);
    for (const w of result.warnings) {
      log(`  - ${w}`, colors.dim);
    }
  }

  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
  log("\nTemp files cleaned up.", colors.dim);
  log("All tests passed!\n", colors.bold + colors.green);
}

main();
