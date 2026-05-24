import { describe, it } from "node:test";
import assert from "node:assert";
import { resolveSessionRefsWithRetry } from "../../.harness/framework/cli/harness.mjs";

describe("session lookup retry helpers", () => {
  it("retries explicit session slug lookup when a just-created session appears after the first scan", () => {
    let calls = 0;
    const refs = resolveSessionRefsWithRetry({
      sessionSlug: "late-task",
      retryTimeoutMs: 20,
      retryIntervalMs: 1,
      wait: () => {},
      listSessions: () => {
        calls += 1;
        return calls === 1
          ? []
          : [".harness/context/sessions/2026-04-24-2149-late-task.md"];
      },
    });

    assert.strictEqual(calls, 2, "should retry once before succeeding");
    assert.deepStrictEqual(refs, [
      ".harness/context/sessions/2026-04-24-2149-late-task.md",
    ]);
  });

  it("retries exact timestamped session selector lookup for new-session self checks", () => {
    let calls = 0;
    const refs = resolveSessionRefsWithRetry({
      sessionSlug: "2026-04-24-2149-late-task",
      retryTimeoutMs: 20,
      retryIntervalMs: 1,
      wait: () => {},
      listSessions: () => {
        calls += 1;
        return calls === 1
          ? []
          : [".harness/context/sessions/2026-04-24-2149-late-task.md"];
      },
    });

    assert.strictEqual(calls, 2, "should retry exact selector lookups too");
    assert.deepStrictEqual(refs, [
      ".harness/context/sessions/2026-04-24-2149-late-task.md",
    ]);
  });

  it("does not retry ambiguous duplicate session slugs", () => {
    let calls = 0;

    assert.throws(
      () =>
        resolveSessionRefsWithRetry({
          sessionSlug: "task-one",
          retryTimeoutMs: 20,
          retryIntervalMs: 1,
          wait: () => {},
          listSessions: () => {
            calls += 1;
            return [
              ".harness/context/sessions/2026-04-03-1234-task-one.md",
              ".harness/context/sessions/2026-04-03-1236-task-one.md",
            ];
          },
        }),
      /Multiple sessions matched/,
    );

    assert.strictEqual(
      calls,
      1,
      "ambiguous duplicate slugs should fail without retrying",
    );
  });

  it("shell-quotes retry recovery commands for unsafe session slugs", () => {
    let nowMs = 0;

    assert.throws(
      () =>
        resolveSessionRefsWithRetry({
          sessionSlug: "bad'$(touch /tmp/pwn)`name",
          retryTimeoutMs: 2,
          retryIntervalMs: 1,
          wait: (ms) => {
            nowMs += ms;
          },
          now: () => nowMs,
          listSessions: () => [],
        }),
      (error) => {
        assert.match(error.message, /Retried for 2ms/);
        assert.match(
          error.message,
          /Recovery: npm run harness:new:session -- --slug 'bad'\\''\$\(touch \/tmp\/pwn\)`name'/,
        );
        assert.ok(
          !error.message.includes('--slug "'),
          "recovery command should not use double-quoted shell input",
        );
        return true;
      },
    );
  });

  it("uses the current session pointer when no explicit session slug is provided", () => {
    const refs = resolveSessionRefsWithRetry({
      currentSessionFile:
        ".harness/context/sessions/2026-04-24-2149-current-task.md",
      listSessions: () => [],
    });

    assert.deepStrictEqual(refs, [
      ".harness/context/sessions/2026-04-24-2149-current-task.md",
    ]);
  });
});
