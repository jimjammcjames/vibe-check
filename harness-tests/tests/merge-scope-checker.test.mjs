import test from "node:test";
import assert from "node:assert";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const SCRIPT_PATH = join(
  REPO_ROOT,
  "workflows/skills/merge-main-open-pr/scripts/check-merge-scope.mjs",
);

function runChecker(files, args = []) {
  return spawnSync(process.execPath, [SCRIPT_PATH, "--stdin", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    input: files.join("\n"),
  });
}

test("merge scope checker allows runtime-only payloads", () => {
  const result = runChecker(["src/app.ts", "src/lib/util.ts"]);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Runtime \(2\)/);
});

test("merge scope checker blocks mixed governance and runtime payloads by default", () => {
  const result = runChecker([".harness/Harness.md", "src/app.ts"]);

  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /Mixed-scope merge payload detected/);
});

test("merge scope checker allows intentional mixed payloads with acknowledgement", () => {
  const result = runChecker(
    [".harness/Harness.md", "src/app.ts"],
    ["--ack-mixed"],
  );

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Mixed-scope payload acknowledged/);
});
