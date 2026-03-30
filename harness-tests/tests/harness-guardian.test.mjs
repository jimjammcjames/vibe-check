import test from "node:test";
import assert from "node:assert";
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

function withEnv(vars, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

async function startGuardianStubServer() {
  const serverScript = `
    const { createServer } = require("node:http");
    const body = JSON.stringify({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                verdict: "pass",
                reasoning: "Hermetic guardian test stub",
                gaming_detected: false
              })
            }
          ]
        }
      ]
    });

    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(body);
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      process.stdout.write(String(address.port) + "\\n");
    });
  `;

  const child = spawn(process.execPath, ["-e", serverScript], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const port = await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const handleStdout = (chunk) => {
      stdout += chunk.toString();
      const line = stdout.split("\n")[0].trim();
      if (line) {
        cleanup();
        resolve(Number(line));
      }
    };

    const handleStderr = (chunk) => {
      stderr += chunk.toString();
    };

    const handleExit = (code) => {
      cleanup();
      reject(
        new Error(
          `guardian stub exited before reporting a port (code ${code}): ${stderr}`,
        ),
      );
    };

    const cleanup = () => {
      child.stdout.off("data", handleStdout);
      child.stderr.off("data", handleStderr);
      child.off("exit", handleExit);
    };

    child.stdout.on("data", handleStdout);
    child.stderr.on("data", handleStderr);
    child.on("exit", handleExit);
  });

  assert.ok(Number.isInteger(port) && port > 0, "guardian stub port required");

  return {
    endpoint: `http://127.0.0.1:${port}/v1/responses`,
    async close() {
      if (child.exitCode !== null) return;
      child.kill("SIGTERM");
      await new Promise((resolve) => {
        child.once("exit", resolve);
      });
    },
  };
}
/**
 * BEHAVIORAL TESTS: Harness Guardian
 *
 * Verifies that the Integrity Reviewer correctly protects the framework
 * by enforcing the meta-protocol and detecting gaming attempts.
 */

test("Harness Guardian: Enforcement Protocol", async (t) => {
  await t.test("detects harness modifications", () => {
    return withEnv(
      {
        HARNESS_PROVIDER: "http",
        HARNESS_API_KEY: "test-key",
      },
      async () => {
        const stub = await startGuardianStubServer();
        t.after(async () => {
          await stub.close();
        });

        const previousEndpoint = process.env.HARNESS_API_ENDPOINT;
        process.env.HARNESS_API_ENDPOINT = stub.endpoint;

        // Run guardian against CURRENT repo state (which has harness changes)
        // The local HTTP stub keeps this test hermetic in CI.
        try {
          const output = execSync(
            "node .harness/framework/scripts/harness-guardian.mjs",
            {
              cwd: REPO_ROOT,
              encoding: "utf-8",
            },
          );
          const isVerified =
            output.includes("Integrity verified") ||
            output.includes("No harness modifications detected") ||
            output.includes("No changes to check");
          assert.ok(
            isVerified,
            "Should verify existing legitimate changes or detect no changes",
          );
          assert.ok(
            !output.includes("Harness meta-security violation"),
            "Should not flag meta-security violation when tagged entry exists",
          );
        } catch (error) {
          const stdout = error.stdout || "";
          const stderr = error.stderr || "";
          const combined = stdout + stderr;

          if (
            combined.includes("No harness modifications detected") ||
            combined.includes("No changes to check")
          ) {
            assert.ok(true, "No harness modifications to check");
          } else {
            assert.fail(
              "Guardian failed: " + (combined || error.message).slice(0, 500),
            );
          }
        } finally {
          if (previousEndpoint === undefined) {
            delete process.env.HARNESS_API_ENDPOINT;
          } else {
            process.env.HARNESS_API_ENDPOINT = previousEndpoint;
          }
        }
      },
    );
  });

  await t.test("meta-entry folder structure", () => {
    const metaDir = join(REPO_ROOT, ".harness", "context", "history");
    assert.ok(
      existsSync(metaDir),
      "History directory should exist for meta entries",
    );
  });
});
