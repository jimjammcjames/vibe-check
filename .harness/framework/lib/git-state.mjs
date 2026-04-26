import { execSync } from "node:child_process";

function defaultExecGit(command, repoRoot) {
  return execSync(command, {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

export function getCurrentBranch({ repoRoot, execGit } = {}) {
  const runGit =
    execGit ||
    ((command) => {
      if (!repoRoot) {
        throw new Error("repoRoot is required when execGit is not provided");
      }
      return defaultExecGit(command, repoRoot);
    });

  try {
    return runGit("git branch --show-current");
  } catch {
    return "";
  }
}

export function getGitCommonDir({ repoRoot, execGit } = {}) {
  const runGit =
    execGit ||
    ((command) => {
      if (!repoRoot) {
        throw new Error("repoRoot is required when execGit is not provided");
      }
      return defaultExecGit(command, repoRoot);
    });

  try {
    return runGit("git rev-parse --git-common-dir");
  } catch {
    return "";
  }
}

export function isDetachedHead(options = {}) {
  return getCurrentBranch(options) === "";
}

export function buildDetachedHeadMessage({
  purpose = "durable git work",
  recoveryCommand = "git checkout -b <branch-name>",
} = {}) {
  return [
    `Detached HEAD is fine for exploration, but not for ${purpose}.`,
    `Fix: ${recoveryCommand}`,
  ].join("\n");
}

export function requireNamedBranch(options = {}) {
  const branch = getCurrentBranch(options);
  if (branch) {
    return branch;
  }

  throw new Error(buildDetachedHeadMessage(options));
}
