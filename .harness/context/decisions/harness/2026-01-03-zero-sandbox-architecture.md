# Zero-Sandbox Architecture #harness-meta

## Context
The harness previously created filesystem sandboxes (`harness-tests/simulation/temp/`) for every agent execution to stage input files and store outputs. This created thousands of temporary directories, causing disk clutter and performance overhead.

## Decision
We have transitioned to a **Zero-Sandbox** content loading model for the HTTP provider:

1.  **In-Memory Context**: Input files (`DIFF.txt`, `MEMORY_ENTRIES.txt`, etc.) are passed directly in memory to the provider. The provider constructs the prompt string without reading from disk.
2.  **In-Memory Results**: The provider parses the JSON response directly from the API output and returns it as a JavaScript object. No `RESULT.json` file is written to disk.
3.  **Debug Visibility & Auditability**: Instead of preserving a sandbox directory for post-mortem inspection, debug information (full stdout/stderr and error stacks) is **streamed directly to the primary console logs** upon failure. This ensures that all failure details are captured in the persisted CI/terminal logs, providing **unalterable audit trails** superior to ephemeral temp files that are often deleted or lost.

## Trade-offs
- **Loss of Persistence**: Debug artifacts are ephemeral. If an agent fails, you must rely on the console logs captured at runtime.
- **Strict Analysis Mode**: Agents are restricted to "Text In -> JSON Out" workflows. They cannot execute shell commands, run tests, or write intermediate files during their thought process. This aligns with the limitations of the HTTP-only provider.

## Changes
- **Refactored**: `.harness/framework/lib/agent-runner.mjs` to remove `mkdirSync`/`mkdtempSync` and pass `files` map.
- **Refored**: `.harness/framework/providers/http-api.mjs` to build context from memory and return parsed results directly.
- **Updated**: `.harness/framework/scripts/undocumented-detector.mjs` to remove shell execution instructions from prompts.
- **Updated**: Tests (`http-provider.test.mjs`) were updated to reflect these changes (implicit, validated by suite passing).

## Related
- .harness/framework/lib/agent-runner.mjs
- .harness/framework/providers/http-api.mjs

## Search terms
sandbox, memory, agent-runner, http-api, performance, cleanup, zero-sandbox

## Tags
#architecture #performance #cleanup #harness-meta
