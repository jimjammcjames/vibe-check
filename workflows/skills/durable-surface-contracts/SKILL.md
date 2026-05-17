---
id: durable-surface-contracts
summary: Record the boundary, validation path, and monitoring contract for long-lived runtime or automation surfaces so durable capabilities never ship as implicit behavior.
---

# Durable Surface Contracts

Use this when a change introduces or materially changes a long-lived automation,
service, runtime surface, operator command, or background workflow.

## Use Cases

- Adding a scheduled job, daemon, watcher, bridge, runtime, or durable CLI entrypoint.
- Promoting a previously ad hoc/manual workflow into a standing system capability.
- Capturing the abstract equivalent of a feature-catalog row without depending on a repo-specific schema.
- Use when the user says or implies:
- "Make this a durable feature."
- "Add a background service or automation."
- "Document how this surface is validated and monitored."

## Workflow

1. Name the surface and its boundary.

- State the capability, its canonical entrypoint, and which files or operators own it.
- Make the boundary explicit if the surface spans runtime, host, automation, or repo edges.

2. Record the contract in tracked repo artifacts.

- Update the narrowest durable doc that future agents will actually consult.
- Record the same change in the linked history/session `## Guidance Impact` sections.
- If the surface depends on shared assets such as manifests, schemas,
  templates, prompts, or repo-root contract files outside the immediate runtime
  package, declare how those assets are packaged, mounted, or copied into the
  real execution environment.
- If the repo has several long-lived automations, prefer a small registry or
  index that names each automation, its status, source file, runner, schedule,
  reads, writes, and owner-facing output.
- If the repo has several durable surfaces with shared health checks, prefer a
  small monitor taxonomy or reusable monitor definitions that surfaces can point
  at instead of duplicating monitor prose in every row.
- If the repo does not have a registry, record the same fields in the narrowest
  existing tracked doc instead of leaving the capability implicit.

3. Make validation explicit.

- Record the strongest deterministic validation command available today.
- If the repo distinguishes lanes like local/canary/live/prod, name each lane
  separately and note any gaps.
- When support is incomplete, label each lane explicitly as `full`, `partial`,
  or `none` and name the blocking gaps instead of flattening everything into a
  vague "ready" claim.
- If the surface depends on packaged shared assets, include one validation step
  that proves those assets are present in the real runtime or deploy artifact.
- If the repo maintains named validation suites, register the new durable check
  centrally and reference the suite identifiers from the surface contract
  instead of leaving validation as ad hoc prose.
- When the change affects execution-boundary behavior, include validation
  through the real operator-facing entrypoint rather than stopping at a nearby
  helper, unit seam, or contract-only check.
- If the surface has a canonical deploy, publish, or update command, prefer
  wiring the strongest deterministic local validation into that path by default.
  If an explicit bypass is still necessary, document the narrow bypass knob and
  its intended incident-only use.
- Do not call a surface "ready" when lane claims are still implicit. Each
  claimed lane should either name the supporting suite(s) or record the gap
  explicitly.

4. Make monitoring or readiness explicit.

- Prefer a durable health signal run by a persistent service or scheduled automation over manual smoke tests alone.
- If only manual validation exists today, say so explicitly and record the missing monitor as a follow-up.
- Use consistent status language such as `active`, `ready`, and `paused` so
  future audits can distinguish scheduled behavior from documented-but-idle
  capability.

5. Fail closed on ambiguity.

- Do not land a new durable surface with an implicit owner, hidden entrypoint, or unspecified validation story.
- If the repo lacks a central catalog, add the contract to the narrowest tracked doc instead of leaving it only in chat.

6. Summarize leftovers.

- List any remaining gaps in monitoring, validation, or documentation ownership.
