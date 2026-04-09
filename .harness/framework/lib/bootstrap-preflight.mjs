import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function safeReadFile(filePath) {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function readPackageJson(repoRoot) {
  const packageJsonPath = join(repoRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return { packageJson: null, error: null, path: packageJsonPath };
  }

  try {
    return {
      packageJson: JSON.parse(readFileSync(packageJsonPath, "utf-8")),
      error: null,
      path: packageJsonPath,
    };
  } catch (error) {
    return { packageJson: null, error, path: packageJsonPath };
  }
}

function readNvmrc(repoRoot) {
  const nvmrcPath = join(repoRoot, ".nvmrc");
  if (!existsSync(nvmrcPath)) {
    return { spec: null, source: null };
  }

  const content = safeReadFile(nvmrcPath);
  if (!content) {
    return { spec: null, source: null };
  }

  const spec = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));

  if (!spec) {
    return { spec: null, source: null };
  }

  return { spec, source: ".nvmrc" };
}

function extractVersionMajor(versionSpec) {
  if (!versionSpec) return null;
  const match = String(versionSpec).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function detectInstallCommand(repoRoot) {
  return existsSync(join(repoRoot, "package-lock.json"))
    ? "npm ci"
    : "npm install";
}

function hasDeclaredDependencies(packageJson) {
  if (!packageJson) return false;
  const dependencyBuckets = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
  ];
  return dependencyBuckets.some(
    (bucket) => bucket && Object.keys(bucket).length > 0,
  );
}

export function getBootstrapContract(repoRoot) {
  const packageJsonResult = readPackageJson(repoRoot);
  const { packageJson } = packageJsonResult;
  const nvmrc = readNvmrc(repoRoot);

  const nodeSpec = nvmrc.spec || packageJson?.engines?.node || null;
  const nodeSource =
    nvmrc.source ||
    (packageJson?.engines?.node ? "package.json#engines.node" : null);
  const npmSpec = packageJson?.engines?.npm || null;

  return {
    packageJson,
    packageJsonError: packageJsonResult.error,
    packageJsonPath: packageJsonResult.path,
    nodeSpec,
    nodeSource,
    npmSpec,
    npmSource: npmSpec ? "package.json#engines.npm" : null,
    nodeModulesExists: existsSync(join(repoRoot, "node_modules")),
    installCommand: detectInstallCommand(repoRoot),
    hasDeclaredDependencies: hasDeclaredDependencies(packageJson),
  };
}

function resolveNpmVersion(npmVersion) {
  if (npmVersion !== undefined) {
    return npmVersion;
  }

  try {
    return execSync("npm -v", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

export function analyzeBootstrapPreflight({
  repoRoot,
  nodeVersion = process.version,
  npmVersion,
  nodeModulesExists,
} = {}) {
  if (!repoRoot) {
    throw new Error("analyzeBootstrapPreflight requires repoRoot");
  }

  const contract = getBootstrapContract(repoRoot);
  const currentNpmVersion = resolveNpmVersion(npmVersion);
  const resolvedNodeModulesExists =
    nodeModulesExists === undefined
      ? contract.nodeModulesExists
      : nodeModulesExists;

  const issues = [];

  if (contract.packageJsonError) {
    issues.push({
      code: "PACKAGE_JSON_INVALID",
      message: `Could not parse package.json at ${contract.packageJsonPath}.`,
      fix: "Repair package.json so the harness can read the runtime contract.",
    });
  }

  const expectedNodeMajor = extractVersionMajor(contract.nodeSpec);
  const currentNodeMajor = extractVersionMajor(nodeVersion);
  if (
    expectedNodeMajor !== null &&
    currentNodeMajor !== null &&
    expectedNodeMajor !== currentNodeMajor
  ) {
    const fix =
      contract.nodeSource === ".nvmrc"
        ? "source ~/.nvm/nvm.sh && nvm use"
        : `Use a Node ${expectedNodeMajor} runtime before running the harness again.`;

    issues.push({
      code: "NODE_VERSION_MISMATCH",
      message: `Node ${nodeVersion} does not match the repo runtime contract ${contract.nodeSpec} from ${contract.nodeSource}.`,
      fix,
    });
  }

  const expectedNpmMajor = extractVersionMajor(contract.npmSpec);
  const currentNpmMajor = extractVersionMajor(currentNpmVersion);
  if (
    expectedNpmMajor !== null &&
    currentNpmMajor !== null &&
    expectedNpmMajor !== currentNpmMajor
  ) {
    issues.push({
      code: "NPM_VERSION_MISMATCH",
      message: `npm ${currentNpmVersion} does not match the repo runtime contract ${contract.npmSpec} from ${contract.npmSource}.`,
      fix: "Use an npm version compatible with the repo contract before running the harness again.",
    });
  }

  if (contract.hasDeclaredDependencies && !resolvedNodeModulesExists) {
    issues.push({
      code: "DEPENDENCIES_MISSING",
      message: "Local dependencies are missing (`node_modules/` not found).",
      fix: contract.installCommand,
    });
  }

  return {
    ...contract,
    currentNodeVersion: nodeVersion,
    currentNpmVersion,
    issues,
    ok: issues.length === 0,
  };
}

export function formatBootstrapPreflight(
  result,
  { before = "the harness" } = {},
) {
  if (result.ok) {
    return `Bootstrap preflight passed before ${before}.`;
  }

  const lines = [`Bootstrap preflight failed before ${before}.`, ""];
  for (const issue of result.issues) {
    lines.push(`- [${issue.code}] ${issue.message}`);
    lines.push(`  Fix: ${issue.fix}`);
  }
  return lines.join("\n");
}
