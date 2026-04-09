import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  analyzeBootstrapPreflight,
  formatBootstrapPreflight,
} from "../../.harness/framework/lib/bootstrap-preflight.mjs";

function createRepoFixture() {
  return mkdtempSync(join(tmpdir(), "bootstrap-preflight-"));
}

test("bootstrap preflight fails fast when dependencies are missing", () => {
  const repoRoot = createRepoFixture();
  writeFileSync(
    join(repoRoot, "package.json"),
    JSON.stringify(
      {
        name: "fixture",
        version: "1.0.0",
        devDependencies: {
          tsx: "^4.21.0",
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(repoRoot, "package-lock.json"), "{}\n");

  try {
    const result = analyzeBootstrapPreflight({
      repoRoot,
      nodeVersion: "v20.20.0",
      npmVersion: "10.9.0",
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.issues.some((issue) => issue.code === "DEPENDENCIES_MISSING"),
    );
    assert.match(formatBootstrapPreflight(result), /npm ci/);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("bootstrap preflight enforces the .nvmrc runtime contract", () => {
  const repoRoot = createRepoFixture();
  writeFileSync(
    join(repoRoot, "package.json"),
    JSON.stringify({ name: "fixture", version: "1.0.0" }, null, 2),
  );
  writeFileSync(join(repoRoot, ".nvmrc"), "20\n");
  mkdirSync(join(repoRoot, "node_modules"), { recursive: true });

  try {
    const result = analyzeBootstrapPreflight({
      repoRoot,
      nodeVersion: "v18.20.2",
      npmVersion: "10.9.0",
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.issues.some((issue) => issue.code === "NODE_VERSION_MISMATCH"),
    );
    assert.match(formatBootstrapPreflight(result), /nvm use/);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("bootstrap preflight passes when runtime and local deps match the contract", () => {
  const repoRoot = createRepoFixture();
  writeFileSync(
    join(repoRoot, "package.json"),
    JSON.stringify(
      {
        name: "fixture",
        version: "1.0.0",
        engines: {
          node: ">=20 <21",
          npm: ">=10 <11",
        },
        devDependencies: {
          tsx: "^4.21.0",
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(repoRoot, ".nvmrc"), "20\n");
  mkdirSync(join(repoRoot, "node_modules"), { recursive: true });

  try {
    const result = analyzeBootstrapPreflight({
      repoRoot,
      nodeVersion: "v20.20.0",
      npmVersion: "10.9.0",
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.issues, []);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
