# Harness Evolution Report

## Done Rubric

This report is only "done" when every item below has been satisfied for all four target repos:

- `moves`
- `moves-algorithm`
- `life.exe`
- `mooo` (assumed to be the user's "moo" repo; verify against repo evidence as the report progresses)

### 1. Scope Lock

- Identify the exact repo path being analyzed.
- Identify the exact harness surface being treated as canonical in that repo.
- Note whether the repo uses an explicit `.harness` implementation or a broader harness-descendant operating system.
- Record any naming mismatch or assumption that affects interpretation.

### 2. Canonical Entry Points

- Capture the top-level agent instructions or equivalent operator guidance.
- Capture the primary bootstrap command(s) or first-run workflow.
- Capture the canonical "start here" document(s).
- Capture the main loop commands or their equivalent lifecycle.

### 3. Structural Inventory

- Inventory the directories and files that make up the harness or harness-equivalent system.
- Separate core framework code from docs, policy, memory, skills, automation, and runtime integration.
- Note what is repo-local versus mounted, generated, host-side, or runtime-only.

### 4. Operating Model

- Explain what problem the harness is solving in that repo.
- Explain who the primary operator is: human, local agent, remote agent, hosted runtime, or mixed.
- Explain the intended execution boundary: local checkout, worktree, mounted subtree, VM, container, hosted bot, etc.
- Explain whether the system is optimized for coding tasks, personal operations, infra operations, automation, or a hybrid.

### 5. Workflow Loop

- Document the inner loop, medium loop, outer loop, or the repo's equivalent control flow.
- Document how work is started, iterated, reviewed, and concluded.
- Document whether the workflow is synchronous, agent-driven, scheduler-driven, PR-driven, or event-driven.
- Document what "completion" means inside that repo's model.

### 6. Memory and History Model

- Explain whether the repo requires history entries, sessions, memory docs, durable state, or similar artifacts.
- Document where those artifacts live and how they are created.
- Explain how intent, rationale, validation, and future retrieval are preserved.
- Call out whether memory is enforcement-backed, advisory, append-only, or opportunistic.

### 7. Enforcement and Policy Model

- Document the explicit enforcement mechanisms: scripts, hooks, CI, policy audits, broker constraints, trust files, PR gates, or runtime constraints.
- Explain what kinds of changes are gated.
- Explain what the system refuses to allow.
- Explain whether enforcement is deterministic, advisory, agent-reviewed, or environment-based.

### 8. Agent and Tooling Integration

- Document how the harness interacts with agents, models, MCP, skills, review agents, or remote runtimes.
- Explain provider/model abstraction, if any.
- Explain whether the repo expects direct local execution, brokered execution, or remote orchestration.
- Note any notable integrations that materially change the harness model.

### 9. Verification Model

- Document what counts as validation in the repo.
- Document the major commands, scripts, or runtime checks used to validate work.
- Document whether validation is code-centric, behavior-centric, live-system-centric, infra-centric, or automation-centric.
- Note any special review stages such as tripwires, diff review agents, or prod-readiness checks.

### 10. Git and Change-Management Model

- Explain how the repo expects changes to be staged, reviewed, committed, and merged.
- Document whether branch workflows, PR workflows, auto-generated PRs, or brokered commits are central to the system.
- Explain how the repo links code changes to intent artifacts.
- Call out any unusual safeguards around `main`, merge-base diffs, or scoped git access.

### 11. Evolution Evidence

- Collect evidence from current files plus git history.
- Identify when the harness surface appeared or materially changed.
- Identify at least the major inflection points in how the repo evolved its harness.
- Distinguish inherited/shared ideas from repo-specific inventions.

### 12. Cross-Repo Difference Breakdown

- Compare the four repos on a common axis set rather than only in isolation.
- Produce a difference matrix covering purpose, workflow, memory, enforcement, runtime boundary, review model, and automation model.
- Identify which repos remain closest to the "classic harness" shape and which have evolved into adjacent systems.
- Explain the most consequential differences, not just surface-level file layout differences.

### 13. Independent Evolution Analysis

- Explain how each repo appears to have diverged from shared ancestry or common concepts.
- Identify features that appear independently invented in a single repo.
- Identify features that appear transplanted or adapted across repos.
- Explain why each divergence makes sense in the context of that repo's mission and operating environment.

### 14. Strengths, Weaknesses, and Tradeoffs

- For each repo, summarize what its harness version is best at.
- For each repo, summarize what complexity or risk its design introduces.
- Compare the tradeoffs between strict local enforcement, durable memory, runtime isolation, and hosted automation.
- Identify where one repo solved a problem better than the others.

### 15. Synthesis and Completion Check

- Provide a final synthesis that states how the repos relate to each other overall.
- Explicitly mark each rubric section as covered.
- List any remaining uncertainty, assumption, or evidence gap.
- Confirm that no repo was left at a shallower level than the others without saying so explicitly.

## Working Notes

- The current working assumption is that the user's "moo" repo maps to `/Users/jamesdugle/Repos/mooo`.
- Early evidence suggests `moves` and `moves-algorithm` are explicit `.harness` repos, while `life.exe` and `mooo` represent broader harness-descendant systems with different execution boundaries.

## Assessment Summary

The four repos are related, but they no longer represent one uniform "harness."

- `moves` is the primary full-strength local harness: explicit `.harness`, dense skill catalog, staged commit-intent enforcement, merge-base-aware tripwire, and multiple agent-review providers.
- `moves-algorithm` is a selective port of that harness into a Python-first backend repo. It inherits the core framework and anti-gaming layer, but intentionally leaves behind most product- and UI-specific behavior.
- `life.exe` is not a direct `.harness` port. It borrows the same goals, especially durable intent capture and enforcement, then re-expresses them as a host-plus-mounted-workspace operating system with brokered git, live-runtime validation, feature catalogs, and monitor policy.
- `mooo` is the most different. It is a hosted remote-agent repo where GitHub Actions, Azure, OpenClaw workspace docs, and auto-merged upmerge PRs form the harness-equivalent control loop. It optimizes for "repo as source of truth for a live bot" rather than "local coding harness inside one checkout."

The cleanest lineage read is:

1. `moves` is the main local harness incubator.
2. `moves-algorithm` is a direct transplant of that incubator into a different substrate.
3. `life.exe` is a conceptual fork: same goals, different architecture.
4. `mooo` is a sibling pattern focused on remote runtime sync and workspace memory rather than local staged enforcement.

## Scope Lock

### Repo Paths and Canonical Surfaces

| Repo              | Path                                      | Canonical harness surface used in this report                                                                                                                          |
| ----------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moves`           | `/Users/jamesdugle/Repos/moves`           | `AGENTS.md`, `.harness/Harness.md`, `.harness/config.yml`, `.husky/*`, `.harness/context/*`, `workflows/skills/*`                                                      |
| `moves-algorithm` | `/Users/jamesdugle/Repos/moves-algorithm` | `AGENTS.md`, `.harness/Harness.md`, `.harness/config.yml`, `.husky/pre-commit`, `.harness/context/*`, `workflows/skills/*`                                             |
| `life.exe`        | `/Users/jamesdugle/Repos/life.exe`        | `AGENTS.md`, `README.md`, `history/*`, `.githooks/*`, `tools/history/*`, `tools/system-review/*`, `tools/box-git.sh`, `box/AGENTS.md`, `skills/*`, `system/features/*` |
| `mooo`            | `/Users/jamesdugle/Repos/mooo`            | `README.md`, `docs/*`, `.github/workflows/*`, `scripts/deploy-openclaw.sh`, `openclaw/vm-scripts/openclaw-upmerge.sh`, `openclaw/workspace/*`                          |

### Naming Assumption

- I am treating the user's `moo` repo as `/Users/jamesdugle/Repos/mooo`.
- There was no `/Users/jamesdugle/Repos/moo`; `mooo` is the only plausible match and it contains the expected OpenClaw workspace plus runtime-sync machinery.

## Repo Breakdown

### `moves`

#### What It Is

`moves` is the fullest, most mature version of the explicit local harness. It is embedded inside a live React Native / Expo product repo, so the harness has been forced to evolve under real shipping pressure, stale-branch merges, UI-heavy diffs, Firebase workflows, and agent-provider experimentation.

#### Canonical Entry Points

- Main operator docs: `AGENTS.md`, `.harness/Harness.md`, `README.md`
- Main commands from `package.json`:
  - `harness:prep`
  - `harness:iterate`
  - `harness:post`
  - `harness:post -- --staged`
  - `harness:ci`
  - `harness:new:entry`
  - `harness:new:session`
  - `harness:close:session`

#### Structural Inventory

- Explicit harness tree: `.harness/`
- Core framework: `.harness/framework/cli`, `lib`, `providers`, `scripts`, `templates`
- Durable context: `.harness/context/history`, `.harness/context/sessions`
- Portable skills: `workflows/skills/*`
- Repo-local MCP manifest generation: `workflows/mcp/*`, `npm run mcp-gen`
- Hook layer: `.husky/pre-commit`, `.husky/pre-push`

Quantitatively, this repo currently has:

- `269` tracked history entries
- `206` tracked session artifacts
- `24` portable skills
- `8` framework scripts
- `5` providers

#### Operating Model

This harness is built for local coding inside one worktree. It assumes:

- a human or coding agent working in the repo directly
- staged changes are the key unit of provenance
- commits should carry their own rationale and task-session context
- CI-like review can run locally before PR creation or PR merge

It is optimized for product delivery, especially product code that is easy to churn or accidentally merge incorrectly.

#### Workflow Loop

The loop is explicitly tiered:

- `prep`: read the MUST block and skills summary
- `iterate`: quick format/lint cleanup
- `post`: tests + policy checks
- `post -- --staged`: staged-only commit-intent enforcement
- `ci`: outer-loop only, reserved for PR creation/update or final merge

A key late evolution is that `harness:ci` is no longer treated as normal local iteration. The current doc explicitly frames it as outer-loop only.

#### Memory and History Model

This repo has the strongest structured memory model of the four.

- History entries and session artifacts are separate files.
- New or edited artifacts use `schema: v3`.
- History entries carry `affected_files` and `session_refs`.
- Sessions carry timeline, corrections/thrash, workflow repetition, and codify candidates.

The important detail is that `moves` now enforces commit provenance at the staged-index level, not just branch level. That change is documented in `2026-03-08-staged-commit-intent-v3.md`.

#### Enforcement and Policy Model

Enforcement is deterministic and local:

- `.husky/pre-commit` runs `lint-staged` and then `npm run harness:post -- --staged`
- `policy-audit` enforces history/session linkage and schema rules
- `base-tripwire` checks whether learned fixes actually fail on base
- `harness-guardian` protects the anti-gaming layer
- `undocumented-detector` checks diff coverage
- `agent-memory-coherence` checks context coherence
- `agent-code-review` performs provider-backed diff review
- `.husky/pre-push` disables the local Firebase host override and blocks pushes that keep it

This is the repo where the anti-gaming layer is most explicit and most iterated.

#### Agent and Tooling Integration

`moves` is the only repo here with a broad provider abstraction inside the harness itself.

- Default provider: `gemini`
- Fallback provider: `codex`
- Additional provider: `copilot`
- Local config overrides: `.harness/config.local.yml`
- Optional flagged parallel agent reviews

The Copilot provider was added on `2026-03-19` in commit `c67b8778`.

#### Verification Model

Validation is code- and behavior-centric:

- lint and tests in `post`
- full lint + tests + reviewers + tripwire in `ci`
- branch-diff reviewers operate from current merge-base rather than raw `origin/main` tip
- mobile/web-specific repo skills extend the harness into design review, PR workflows, regression hunts, and UI automation validation

#### Git and Change Management

This repo is extremely opinionated about branch hygiene:

- pre-commit staged provenance is mandatory
- `harness:ci` is PR-oriented outer-loop work
- stale branches should prefer rebase
- dedicated PR skills codify branch sync and merge behavior
- history-first conflict resolution exists as a first-class skill

#### Evolution Timeline

Evidence-backed inflection points:

- `2026-01-24` `518499a2` added `.harness/Harness.md` and `.harness/config.yml` to the repo.
- `2026-01-23-harness-integration.md` records the initial Moves integration as a repo-agnostic harness port with policy audit, test lint, and local agent reviewers.
- `2026-03-08` `51e8c31c` aligned staged commit intent and review scope; `2026-03-08-staged-commit-intent-v3.md` marks the shift to v3 history plus session linkage and staged-only provenance.
- `2026-03-17` `3449ae13` refined PR workflow guidance and locked `harness:ci` into outer-loop usage.
- `2026-03-19` `c67b8778` added GitHub Copilot as a first-class provider.
- `2026-03-19` `476760e8` added local harness config overrides.
- `2026-03-19` `parallel-agent-review-flagged-ci.md` documents opt-in parallel agent reviews without changing default CI semantics.

#### What `moves` Solves Best

- Strongest local anti-gaming enforcement
- Best developed provider abstraction
- Best commit-by-commit provenance
- Most operational experience under real product churn

#### What It Pays For That Strength

- Highest procedural complexity
- Largest skill surface to maintain
- Most policy detail, which can become heavy if transplanted into a repo that does not need the full product workflow

### `moves-algorithm`

#### What It Is

`moves-algorithm` is a direct port of the Moves harness into a Python-first notification/backend repo. It is much more obviously a transplant than an independently invented system.

#### Canonical Entry Points

- Main operator docs: `AGENTS.md`, `.harness/Harness.md`, `README.md`
- Main commands:
  - `harness:prep`
  - `harness:iterate`
  - `harness:post`
  - `harness:ci`
  - `harness:new:entry`
  - `harness:new:session`
  - `harness:close:session`

#### Structural Inventory

- Explicit `.harness/` tree copied from `moves`
- Python-aware repo-edge scripts under `scripts/`
- Only four portable skills, all harness-review skills
- `.husky/pre-commit`, but no repo-specific `.husky/pre-push` equivalent

Current scale:

- `3` history entries
- `2` sessions
- `4` skills
- `8` framework scripts
- `4` providers

The framework script count matches `moves`, but the skills/context surface is much thinner.

#### Operating Model

This repo keeps the same local-staged-enforcement model, but adapts it to a mixed Node + Python verification surface. The harness exists to bring the Moves discipline into a backend/service repo without dragging in mobile-specific policy.

#### Workflow Loop

The loop mirrors `moves` structurally:

- `prep`
- `iterate`
- `post`
- `post -- --staged`
- `ci`

But the iterate and test edges are repo-specific:

- iterate uses `npm run lint:fix`
- tests are driven by wrapper scripts around Python and Node harness checks
- tripwire test discovery is configured for Python test files plus Node harness tests

#### Memory and History Model

This repo starts with the later, stricter version of the Moves model:

- v3 history/session schema
- staged commit-intent enforcement
- `affected_files` and `session_refs`

In other words, it did not evolve through the older v2-only Moves phase. It imported the more mature staged-intent/session design from later Moves.

#### Enforcement and Policy Model

The anti-gaming layer remains intact:

- `policy-audit`
- `test-lint`
- `harness-guardian`
- `undocumented-detector`
- `agent-memory-coherence`
- `base-tripwire`
- `agent-code-review`

But repo-specific enforcement is narrower:

- no Firebase-host push guard
- no large repo-specific skill lattice
- smaller real-code and test globs tailored to backend files

#### Agent and Tooling Integration

Provider support is close to early/mid Moves, not current Moves:

- `gemini`
- `codex`
- `http-api`
- provider index

Notably absent:

- no `copilot` provider
- no local override documentation in the harness doc
- no flagged parallel agent-review path

#### Verification Model

Validation is mixed:

- Python business logic through `pytest`
- Node harness tests for the harness itself
- repo wrapper scripts like `scripts/run-tests.mjs`, `scripts/lint-all.mjs`, and `scripts/list-tests.mjs`

This repo is the cleanest example of "same harness, different substrate."

#### Git and Change Management

Commit-time intent is enforced in `pre-commit`, but the repo stays much closer to the core harness than to the expanded Moves PR-and-skill ecosystem.

#### Evolution Timeline

Evidence-backed inflection points:

- `2026-03-11` `f69af52c` added `.harness/Harness.md` and `.harness/config.yml` to the repo.
- `2026-03-12-moves-algorithm-harness-port.md` explicitly describes the work as a shared Moves harness port.
- The port entry says the repo intentionally kept only the core harness-review skills and omitted mobile/UI-specific skills and policies.

This is the most direct evidence that `moves-algorithm` is a selective transplant rather than a separately evolved harness.

#### What `moves-algorithm` Solves Best

- Reuses a proven harness without reinventing it
- Adapts the discipline to Python/backend work with minimal noise
- Keeps the anti-gaming layer while avoiding product-specific bloat

#### What It Gives Up

- Much less repo-specific operational guidance
- Far less evolved skill ecosystem
- Less evidence yet of long-running independent harness evolution

### `life.exe`

#### What It Is

`life.exe` is a broader agent operating system, not just a local coding harness.

It keeps some of the same goals as `moves`:

- durable context
- explicit intent capture
- enforcement-backed change discipline
- reusable skills

But it re-implements those goals around a very different center:

- repo root as host/control plane
- `box/` as mounted agent workspace
- NanoClaw as the default execution boundary
- brokered git instead of raw git inside the mounted workspace
- feature-monitor governance for durable operational capabilities

#### Canonical Entry Points

- Root guidance: `AGENTS.md`, `README.md`
- Structured history: `history/README.md`
- Mounted-agent guidance: `box/AGENTS.md`
- Brokered git: `tools/box-git.sh`
- Root review gate: `tools/system-review/vibe-check.sh`, `./vibe-check`
- Worktree bootstrap: `tools/bootstrap-worktree.sh`
- Feature governance: `system/features/features.yaml`, `system/features/monitors.yaml`
- Runtime-validation skill: `skills/nanoclaw-live-validation/SKILL.md`

#### Structural Inventory

This system is intentionally split:

- `history/entries` and `history/sessions`
- `.githooks/pre-commit` and `.githooks/pre-push`
- `tools/history/*` for entry/session generation and auditing
- `tools/system-review/*` for root review and vibe-check
- `tools/box-git.sh` for box-scoped brokered git
- `box/` as mounted workspace
- `box/system/nanoclaw/` as vendored runtime
- `automations/*.yaml`
- `system/features/*.yaml`

Current scale:

- `108` history entries
- `52` history sessions
- `2` root skills
- `17` automation definitions
- `41` feature rows
- `10` monitor definitions

#### Operating Model

This repo solves a broader problem than `moves`: how to make durable life context operational across host tools, mounted agent workspaces, automations, integrations, and recurring system status.

The core boundary distinction is:

- root: host-side integrations, git hooks, feature catalog, automation scheduler, review tooling
- `box/`: mounted agent-visible life workspace

That is the biggest architectural divergence from the classic `.harness` model.

#### Workflow Loop

There are effectively two loops:

1. Root loop
   - bootstrap the worktree
   - let hooks auto-draft context when needed
   - pass policy audit
   - pass `vibe-check`

2. Mounted `box/` loop
   - use `life-box-git` or `tools/box-git.sh`
   - `session-start`, `session-note`, `session-close`
   - commit through brokered paths that auto-link root history/session artifacts
   - validate live through NanoClaw when changes touch runtime boundaries

This is a system with local coding workflow, runtime automation workflow, and mounted-agent workflow all coexisting.

#### Memory and History Model

`life.exe` reuses the same idea as `moves` but changes the ergonomics.

- Root work can auto-draft v2 entry/session files through `tools/history/ensure-context.py`
- Missing context is not merely rejected; it is generated and then blocked until placeholders are replaced
- `life-box-git` can auto-create or reuse required root history/session files for `box/` changes
- Sessions are a first-class trail of user intent, corrections, workflow notes, and outcome

This is less manual than Moves and more integrated into the execution boundary.

#### Enforcement and Policy Model

Enforcement is broader than Moves and less centered on agent reviewers.

At commit time:

- secret review
- Notion submodule boundary checks
- launchd contract audit for certain service paths
- `ensure-context --staged`
- `policy_audit.py --staged`

At push time:

- outgoing commits are audited against structured-history policy only after the structured-history intro commit
- outgoing commits are audited against the Notion submodule boundary only after its intro commit
- mandatory `vibe-check --mode push`

At feature-governance time:

- new durable features must appear in `features.yaml`
- they must bind to monitor definitions or have an explicit approved exception
- post-policy `commit_history` must be append-only

This is the only repo here where "monitorability" is itself part of the harness.

#### Agent and Tooling Integration

`life.exe` does not center on swappable review providers. It centers on execution boundaries and runtime mediation.

- NanoClaw is the default execution boundary
- `life-box-git` is a constrained broker
- mounted agents must not reach around host boundaries
- host-side one-shot runs go through `./tools/nanoclaw/run-main-agent.sh`
- `Main` is treated as an admin-only surface
- live validation is formalized as a skill

This is why `life.exe` feels like an operating system with harness properties, not a harness library living in a repo.

#### Verification Model

Validation spans three different modes:

- structured history/session audit
- Copilot-backed root review through `vibe-check`
- live end-to-end runtime validation for NanoClaw-boundary changes

The `2026-03-11-232126-add-nanoclaw-live-validation-and-merge-default-skills.md` entry is especially important here: it encodes live validation through the real NanoClaw entrypoint as a reusable policy.

#### Git and Change Management

This repo is unusually strict about git boundaries:

- mounted agents do not get raw repo-wide git
- `box/` commits are brokered and box-scoped
- local `main` has special restrictions
- feature rows must track durable capabilities across time
- outgoing push review is mandatory

In practice, `life.exe` moves the harness from "explain each commit" toward "govern the whole operating system."

#### Evolution Timeline

Evidence-backed inflection points:

- `2026-03-07` `4e11fce` established host-local secrets and commit-history workflow.
- `2026-03-08` `380a8fe` added brokered `box-git`.
- `2026-03-08` `bb09728` added worktree bootstrap and `.githooks/pre-commit`.
- `2026-03-10` `a9ea05b` rolled out structured history sessions and staged policy audit; the entry explicitly says this was "similar to the moves harness, but without agent-review gates."
- `2026-03-11` the repo added NanoClaw live-validation and merge-default skills.
- `2026-03-19` `ba248fc` added the root feature catalog and monitor policy.
- `2026-03-19` `ff84b72` added the lightweight root vibe-check harness. The corresponding history entry explicitly says the repo extended existing Bash/Python tooling instead of importing the full Moves `.harness` stack.
- `2026-03-23` feature work tightened prod-ready and canary boundaries around the feature catalog and runtime contracts.

#### What `life.exe` Solves Best

- Strongest execution-boundary discipline
- Best integration of durable history with a mounted-agent workspace
- Best treatment of live-system validation as first-class policy
- Only repo with explicit durable-feature + monitor governance

#### What It Pays For That Strength

- Higher architectural complexity than a repo-local `.harness`
- More moving parts across hooks, brokers, automations, feature catalog, runtime, and mount policy
- Harder to transplant wholesale into a smaller repo

### `mooo`

#### What It Is

`mooo` is a remote-agent deployment repo. It is not a `.harness` repo at all, but it still solves many harness-adjacent problems:

- where agent memory lives
- how runtime changes get back into version control
- who/what is the source of truth
- how infra and runtime config are reviewed and deployed

Its answer is: GitHub repo as source of truth, Azure VM as runtime, OpenClaw workspace as durable agent context, and upmerge PRs as the change-return path from runtime back into git.

#### Canonical Entry Points

- Main overview: `README.md`
- Day-to-day ops: `docs/DEVELOPMENT.md`
- Infra model: `docs/INFRASTRUCTURE.md`
- Security model: `docs/SECURITY.md`
- Deploy path: `.github/workflows/deploy.yml`, `scripts/deploy-openclaw.sh`
- Runtime sync path: `openclaw/vm-scripts/openclaw-upmerge.sh`, `.github/workflows/auto-merge-upmerge.yml`
- Agent workspace: `openclaw/workspace/*`

#### Structural Inventory

- GitHub Actions workflows for PR checks, deploy, Terraform, and auto-merge
- Terraform modules under `modules/`
- VM deployment and pull helpers under `scripts/`
- Runtime systemd and shell scripts under `openclaw/vm-scripts/`
- OpenClaw workspace docs under `openclaw/workspace/`
- Long-term memory under `openclaw/workspace/memory/`
- Small skill set under `openclaw/workspace/skills/`
- Adjacent `product-factory/` experiment for LLM-judged task generation/refinement

Current scale:

- `4` memory docs in `openclaw/workspace/memory`
- `3` workspace skills
- `5` GitHub workflows
- `7` VM scripts/systemd assets
- `11` Python files in `product-factory/product_factory`

#### Operating Model

This system is built around a remote bot, not a local developer loop.

- humans mostly edit the repo and push to GitHub
- GitHub Actions plans/applies infra and deploys config
- OpenClaw runs on an Azure VM
- the VM can mutate its workspace at runtime
- those runtime mutations are synced back as PRs and auto-merged

The repo is both desired state and reconciliation target.

#### Workflow Loop

There are three loops:

1. Local authoring loop
   - edit repo
   - push or open PR

2. CI/CD loop
   - PR runs lint and Terraform plans
   - push to `main` applies infra and deploys config

3. Runtime sync loop
   - VM timer checks `~/.openclaw/` every 60 seconds
   - changed runtime files are copied into a repo clone
   - bot branch is force-pushed
   - PR is opened
   - bot PR is auto-merged

This is the most GitHub-centric and runtime-centric harness shape in the set.

#### Memory and History Model

There is durable memory, but not structured per-commit history.

- `openclaw/workspace/IDENTITY.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`
- `openclaw/workspace/memory/*.md`
- runtime-upmerged workspace edits become the durable record

The repo does not enforce commit-scoped rationale artifacts the way `moves` or `life.exe` do. Instead, it preserves durable agent context in the workspace and lets runtime file changes re-enter the repo via PRs.

#### Enforcement and Policy Model

Enforcement is mostly infrastructural and CI-driven:

- PR linting and Terraform validation
- deploy sequencing through GitHub Actions
- auto-merge restricted to bot-authored upmerge PRs
- VM hardening, loopback bind, token auth, allowlisted exec tools, OIDC, and pinned versions
- upmerge lock file, token-stripping, and diff-vs-deploy-dir guard in `openclaw-upmerge.sh`

This repo enforces safety through deployment and runtime architecture more than through local staged provenance.

#### Agent and Tooling Integration

The agent surface is OpenClaw workspace content, not a provider abstraction layer.

- workspace persona docs
- small skill set: `github`, `notion`, `weather`
- remote runtime rather than local tool wrapping

The interesting adjacent signal is `product-factory/`, which uses Copilot, judges, and refinement loops to turn product input into task contracts. That is not the repo's main harness, but it shows this repo starting to grow its own meta-workflow tooling.

#### Verification Model

Validation is centered on CI/CD and remote operations:

- GitHub Actions lint and Terraform plans
- deploy job rsyncs config and optionally restarts gateway
- troubleshooting uses Azure run-command, SSH, systemd status, and logs
- security model is documented explicitly

There is no Moves-style tripwire, structured staged audit, or provider-backed diff-review path here.

#### Git and Change Management

This repo has the strangest git model of the four:

- the repo is the source of truth
- the runtime is allowed to mutate files anyway
- those mutations return via auto-generated PRs
- those PRs are auto-merged

`openclaw-upmerge.sh` is the crucial mechanism:

- compares runtime files to the deployed copy
- syncs changed runtime files into a repo clone
- commits them on a dated `moo/upmerge-*` branch
- opens a PR if needed

This is a reconciliation loop, not a staged local provenance loop.

#### Evolution Timeline

Evidence-backed inflection points:

- `2026-03-03` `5959fe6` initial commit added the repo, deploy workflow, and workspace.
- `2026-03-03` `a3201ad` reformatted the initial OpenClaw filesystem.
- `2026-03-04` added SSH and workflow hardening.
- `2026-03-05` repeatedly landed bot-authored `upmerge: sync runtime changes from VM` commits, then `f987105` extracted scripts and systemd units into `openclaw/vm-scripts/`.
- `2026-03-05` also moved from Key Vault to GitHub Secrets and added manual workflow dispatch.
- `2026-03-15` `20b72b6` added repo-backed Discord text export.

This is a young repo. Most of its evolution so far is deployment and runtime-sync hardening, not harness-internal sophistication.

#### What `mooo` Solves Best

- Clean "live bot config as git repo" story
- Strongest runtime-to-repo reconciliation loop
- Clear separation between infra, deploy, runtime workspace, and GitHub orchestration
- Simple, legible workspace-memory model for a hosted agent

#### What It Gives Up

- No structured per-commit rationale enforcement
- No local anti-gaming or staged-provenance machinery
- Much less explicit review of agent-produced diffs beyond bot PR identity and CI

## Cross-Repo Matrix

| Axis                 | `moves`                                           | `moves-algorithm`                     | `life.exe`                                                    | `mooo`                                                              |
| -------------------- | ------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| Main shape           | Explicit local `.harness`                         | Ported local `.harness`               | Hybrid host/box operating system                              | Remote bot repo + CI/CD + upmerge                                   |
| Primary purpose      | Product delivery harness                          | Backend/service delivery harness      | Life operations + mounted agent runtime governance            | Hosted OpenClaw deployment and workspace                            |
| Execution boundary   | Local worktree                                    | Local worktree                        | Root host + mounted `box/` + NanoClaw                         | Azure VM + GitHub Actions                                           |
| Main memory model    | Structured history + structured sessions          | Same structured model, smaller volume | Structured history + sessions + feature catalog + automations | Workspace markdown memory + runtime-upmerged docs                   |
| Commit provenance    | Strongest staged enforcement                      | Strong staged enforcement             | Auto-drafted root context + brokered box context              | Not commit-centric                                                  |
| Enforcement locus    | Hooks + policy audit + tripwire + agent reviewers | Same core layer, thinner repo edge    | Hooks + policy audit + vibe-check + broker + monitor policy   | GitHub Actions + deploy scripts + runtime guards                    |
| Review model         | Agent-backed diff review inside harness           | Same core review scripts              | Copilot-backed `vibe-check` + live NanoClaw validation        | PR/CI-centric, no local diff-review harness                         |
| Skill model          | Broadest and most repo-specific                   | Minimal core review skills only       | Two root skills; many durable rules in docs/system            | Small OpenClaw workspace skill set                                  |
| Provider abstraction | Gemini, Codex, Copilot, fallback, overrides       | Gemini, Codex, http-api               | Not the center of gravity                                     | Not present                                                         |
| Live validation bias | Medium                                            | Medium                                | Very high for runtime-boundary work                           | High, but through deploy/runtime ops rather than formal skill gates |
| Git model            | Rebase-first, PR-oriented, staged provenance      | Pre-commit provenance                 | Brokered git, main protection, push audit                     | Source-of-truth repo with bot upmerge PRs                           |
| Current maturity     | Most mature                                       | Young but clean                       | Rapidly maturing and expanding                                | Young and infra-centric                                             |

## Independent Evolution Analysis

### 1. `moves` became the incubator

The evidence strongly supports `moves` as the main harness incubator.

- It introduced the explicit harness on `2026-01-24`.
- It has by far the deepest skill catalog and context volume.
- Its history shows repeated harness-meta changes driven by real product pain:
  - staged provenance
  - merge-base drift fixes
  - PR workflow hardening
  - provider additions
  - optional parallelization

This is what a harness looks like when it is living inside the highest-churn repo and forced to solve real shipping problems quickly.

### 2. `moves-algorithm` is a selective transplant, not a major independent branch

This repo has some independent adaptation, but much less independent invention.

- Its own history explicitly calls the work a Moves harness port.
- The framework layer is almost the same size as Moves.
- The repo-specific deltas are mostly substrate adaptation:
  - Python-aware tests and linting
  - changed real-code globs
  - reduced skill surface
  - omission of mobile/UI policies

So `moves-algorithm` evolved mostly by pruning and adapting, not by inventing new harness concepts.

### 3. `life.exe` is the deepest conceptual fork

This repo clearly borrowed the idea-space from Moves:

- commit-scoped history
- session artifacts
- staged policy audit
- durable skills
- explicit operator docs

But the repo's own history explicitly says it did not import the full `.harness` stack. Instead, it rebuilt the same goals around:

- brokered git
- mounted workspace boundaries
- live runtime validation
- feature/monitor governance
- host-runtime separation

That is genuine independent evolution. It is the same species of system with a different body plan.

### 4. `mooo` evolved on a different axis altogether

`mooo` is solving a different first problem:

- how to keep a hosted bot's live workspace and repo aligned
- how to deploy infra and runtime config safely
- how to let runtime edits flow back to source control

So its harness-equivalent features are:

- repo-as-source-of-truth
- workspace memory docs
- GitHub Actions as policy engine
- upmerge PRs as reconciliation

It shares values with the other repos, especially durable context and inspectable state, but it does not share the local staged-enforcement approach.

### 5. Likely cross-pollination, with different centers of gravity

Evidence-backed facts:

- `moves-algorithm` directly ports from `moves`.
- `life.exe` explicitly says it wanted something "similar to the moves harness" without the full agent-review stack.
- `mooo` stores a memory note about the Moves harness inside `openclaw/workspace/memory/MOVES_TECHNICAL.md`.

Inference:

- `moves` is the strongest source repo for the explicit harness pattern.
- `life.exe` appears to be borrowing the discipline while re-architecting around runtime boundaries.
- `mooo` appears to be a parallel exploration of durable remote-agent workspace management rather than a direct `.harness` descendant.

## Strengths, Weaknesses, and Tradeoffs

### Where each repo is ahead

- `moves`
  - Best local code-review harness
  - Best staged provenance discipline
  - Best provider abstraction
- `moves-algorithm`
  - Best example of clean harness transplantation into a new substrate
  - Best "minimum viable strong harness" version
- `life.exe`
  - Best runtime-boundary discipline
  - Best live-validation policy
  - Best durable-feature governance
- `mooo`
  - Best remote runtime reconciliation loop
  - Best "repo stays source of truth even while bot edits live state" pattern

### Where each repo is exposed

- `moves`
  - Can become process-heavy
  - Skill/doc surface is expensive to keep coherent
- `moves-algorithm`
  - Still depends heavily on upstream Moves conceptually
  - Less battle-tested in its own right
- `life.exe`
  - High complexity and many policy layers
  - Hardest system to onboard casually
- `mooo`
  - Least protection against weak commit intent
  - Strong runtime-sync story, weaker structured rationale story

### The biggest tradeoff across the set

The core tradeoff is:

- `moves` and `moves-algorithm` optimize for local correctness of code changes before they land.
- `life.exe` optimizes for correctness of an operating system that spans code, runtime, automation, and mount boundaries.
- `mooo` optimizes for keeping a live hosted agent and its repo in sync.

Those are not the same problem, which is why the harnesses diverged so much.

## Final Synthesis

If I had to describe the set in one sentence:

`moves` is the canonical local harness, `moves-algorithm` is its pruned backend port, `life.exe` is its runtime-governed conceptual descendant, and `mooo` is a sibling remote-agent repo whose "harness" lives mostly in CI/CD, workspace memory, and runtime-to-repo reconciliation.

The most important difference is not file layout. It is where each repo decided the real risk lives:

- `moves`: weak local commits and diff review quality
- `moves-algorithm`: same risk, but in a backend repo
- `life.exe`: boundary violations, unvalidated runtime behavior, and unmonitored durable features
- `mooo`: drift between live bot state and the Git repo, plus infra/runtime deployment safety

That is how they independently evolved: they all started from "agents need durable structure," but each repo hardened around its own failure mode.

## Rubric Completion Check

1. Scope lock: complete. Paths, canonical surfaces, and the `mooo` naming assumption are stated.
2. Canonical entry points: complete. Each repo section identifies its operator docs and start commands or equivalent flow.
3. Structural inventory: complete. Each repo section inventories the harness or harness-equivalent surfaces.
4. Operating model: complete. Each repo section states the problem being solved and the primary operator/runtime boundary.
5. Workflow loop: complete. Each repo section describes the start/iterate/review/finish loop or its equivalent.
6. Memory and history model: complete. The report covers structured history, session capture, workspace memory, and auto-upmerge memory differences.
7. Enforcement and policy model: complete. Hooks, CI, brokers, monitor policy, runtime guards, and review gates are covered.
8. Agent and tooling integration: complete. Provider abstraction, NanoClaw, OpenClaw workspace, skills, and GitHub orchestration are covered.
9. Verification model: complete. Local tests, tripwire, vibe-check, live NanoClaw validation, deploy checks, and Terraform plans are covered.
10. Git and change-management model: complete. Staged provenance, brokered git, main restrictions, and upmerge PRs are covered.
11. Evolution evidence: complete. Each repo has evidence-backed dates and key commits or history-entry inflection points.
12. Cross-repo difference breakdown: complete. The matrix and synthesis compare all four repos on common axes.
13. Independent evolution analysis: complete. The report distinguishes direct ports from conceptual forks and sibling patterns, and marks inference as inference.
14. Strengths, weaknesses, and tradeoffs: complete. Each repo has strengths and costs plus an overall tradeoff discussion.
15. Synthesis and completion check: complete. This section closes the loop and explicitly checks the rubric off.

## Remaining Uncertainty

- The strongest uncertainty is lineage between `mooo` and `life.exe`. The shared problem-space is obvious, but the exact direction of influence is not directly proven by the files I inspected, so any claim there should be treated as inference.
- `moves-algorithm` has very little post-port history so far, so its "independent evolution" is currently shallow because the repo itself has not had much time to diverge.
