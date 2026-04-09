import { execSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const REPO_ROOT = join(__dirname, "..", "..");
export const HARNESS_CLI = join(
  REPO_ROOT,
  ".harness",
  "framework",
  "cli",
  "harness.mjs",
);
export const TEST_DATE = "2026-01-04";
export const TEST_TIMESTAMP = "2026-01-04T12:34:56.000Z";

export function runHarness(args, envOverrides = {}) {
  try {
    const result = execSync(`node "${HARNESS_CLI}" ${args}`, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...envOverrides },
    });
    return { output: result, exitCode: 0 };
  } catch (error) {
    return {
      output: (error.stdout || "") + (error.stderr || ""),
      exitCode: error.status || 1,
    };
  }
}

export function createContextRoot(t) {
  const dir = mkdtempSync(join(tmpdir(), "harness-context-"));
  t.after(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

export function runHarnessUntilMarkers(
  command,
  markers,
  envOverrides = {},
  timeoutMs = 15000,
) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("node", [HARNESS_CLI, command], {
      cwd: REPO_ROOT,
      env: { ...process.env, ...envOverrides },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let settled = false;
    let expectedClose = false;

    const settle = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };

    const resolveAfterClose = () => {
      expectedClose = true;
      const finish = () => settle(() => resolvePromise({ output }));
      if (child.exitCode !== null || child.signalCode !== null) {
        finish();
        return;
      }
      child.once("close", finish);
      child.kill("SIGTERM");
    };

    const checkMarkers = () => {
      if (markers.every((marker) => output.includes(marker))) {
        resolveAfterClose();
      }
    };

    child.stdout?.on("data", (chunk) => {
      output += chunk.toString();
      checkMarkers();
    });

    child.stderr?.on("data", (chunk) => {
      output += chunk.toString();
      checkMarkers();
    });

    child.on("error", (error) => {
      settle(() => rejectPromise(error));
    });

    child.on("close", (code, signal) => {
      if (expectedClose) {
        return;
      }
      if (!settled) {
        settle(() =>
          rejectPromise(
            new Error(
              `Process exited before markers for ${command} (code=${code}, signal=${signal}). Output:\n${output}`,
            ),
          ),
        );
      }
    });

    const timeout = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
      settle(() =>
        rejectPromise(
          new Error(
            `Timed out waiting for ${command} markers. Output:\n${output}`,
          ),
        ),
      );
    }, timeoutMs);
  });
}
