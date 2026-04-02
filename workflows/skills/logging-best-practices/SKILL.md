---
id: logging-best-practices
summary: Apply structured logging, correlation IDs, level discipline, and secret-safe log design before adding or revising production logging.
---

# Logging Best Practices

Use this before implementing or revising logging in any non-trivial system.

## Use Cases

- Designing or cleaning up production logging.
- Adding observability around failures, retries, or external service calls.
- Deciding what should and should not be logged.

## Principles

- Logs are for querying during incidents, not just for writing.
- Context matters more than prose.
- Structured logs beat interpolated strings.
- If logs cannot be filtered effectively, they are not doing their job.

## Required Practices

1. Prefer structured logs.

- Bad: `"Payment failed for user 123"`
- Good: `{"event":"payment_failed","user_id":"123","reason":"insufficient_funds"}`

2. Include correlation context when available.

- `request_id` or `trace_id`
- `service`
- `environment`
- relevant domain identifiers such as `user_id`, `job_id`, or `order_id`

3. Use levels correctly.

- `debug`: verbose local detail
- `info`: normal meaningful operations
- `warn`: unexpected but handled
- `error`: actual failure needing attention

4. Log useful state transitions.

- request entry/exit with duration
- external dependency calls with latency and response codes
- background job start/finish/failure
- retries and fallback behavior

5. Do not log secrets or noisy garbage.

- Never log passwords, tokens, credentials, or raw sensitive payloads.
- Avoid logs inside tight loops unless sampling is intentional.
- Do not emit "error" logs for expected user mistakes.

6. After incidents, add the logs you wished you had.
