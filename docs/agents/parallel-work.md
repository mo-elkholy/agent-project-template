---
type: "Agent Rules"
title: "Parallel work"
description: "Claims, blockers, conflicts and the schema lock that let several agents work issues at the same time."
status: "stable"
owner: "{{DOC_OWNER}}"
generated: {"by": "claude/opus-5.5", "at": "2026-10-05T20:00:00+00:00"}
tracks: ["scripts/issue"]
sources: [{"resource": "../../scripts/issue/lib.mjs"}]
---
# Parallel work

Several agents (for example Claude and Codex) can work GitHub issues at the same time. Each issue's **Impact** section lists its likely files, tests, schema risk and conflicting issues. The rules below are enforced by `scripts/issue/start.mjs` where a script can enforce them; the rest are on the agent.

## Claims

- Claim before starting: the `in progress` label plus `agent: claude` or `agent: codex`, and a comment with the branch name. `start.mjs` does all three.
- Never take an issue that is already claimed.
- If you stop before finishing, remove both labels and comment where you stopped.

## Two kinds of edges

| Edge | Meaning | Where it is written | What `start.mjs` does |
| --- | --- | --- | --- |
| **Blocked by** | Dependency: this issue cannot start until the other one is closed | GitHub's native issue dependencies, or a `Blocked by: #n` line / `## Blocked by` section (written by `/to-tickets`) | Refuses while any blocker is open |
| **Do not run in parallel with** | Conflict: both can be open, but not both in progress, because they edit the same hotspot | A line in the Impact section (written by `/new-issue`) | Refuses while a conflicting issue is in progress, in either direction |

`touches: <subsystem>` labels are for filtering and spotting overlap. Sharing a risky `touches:` label (for example a core engine or an import pipeline) with in-progress work needs extra care: after rebasing, run that area's regression group.

## Schema lock

Only one in-progress issue may carry `touches: schema` at a time. "Schema" means any persisted format others depend on: the saved file format, a database schema, a public API contract. Take the next format or migration version from the current default branch **when merging**, not when starting.

## Overrides

`--force` overrides blockers, conflicts and the schema lock. Use it only after the user approves that specific overlap; the claim comment records it. Closed or already-claimed issues can never be forced.

## Branches and merging

- One issue per branch and worktree, created from `origin/<default branch>`. Branch name: `<branch prefix>/<id>-<short-slug>`.
- Merge only by pull request that says `Closes #N`. Never commit feature work directly to the default branch. The one allowed direct commit is the register/log/changelog commit that records a new issue.

## Shared and generated files

On conflicts in `docs/log.md`, `changelog.md`, `docs/.sync-state.json`, generated indexes or generated manuals: rebase, keep both entries, regenerate with `npm run docs:sync`, and re-acknowledge only what you reviewed. Never hand-merge generated output.

## Verification

Run the tests listed in the issue's Impact section plus any you add. Report them in the pull request and the register as focused verification.
