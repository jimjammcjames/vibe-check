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

3. Make validation explicit.

- Record the strongest deterministic validation command available today.
- If the repo distinguishes lanes like local/canary/live/prod, name each lane separately and note any gaps.

4. Make monitoring or readiness explicit.

- Prefer a durable health signal run by a persistent service or scheduled automation over manual smoke tests alone.
- If only manual validation exists today, say so explicitly and record the missing monitor as a follow-up.

5. Fail closed on ambiguity.

- Do not land a new durable surface with an implicit owner, hidden entrypoint, or unspecified validation story.
- If the repo lacks a central catalog, add the contract to the narrowest tracked doc instead of leaving it only in chat.

6. Summarize leftovers.

- List any remaining gaps in monitoring, validation, or documentation ownership.
