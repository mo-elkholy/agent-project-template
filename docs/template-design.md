# Agent project template: design

Status: approved design, 2026-10-05. This document records why the template is shaped the way it is. The [playbook](../PLAYBOOK.md) is the user-facing guide.

## Purpose

Capture the way of working that was set up for the Oktob project and generalize it into a reusable, shareable starting point. Oktob is a desktop app built by one owner with two AI coding agents (Claude Code and Codex) working GitHub issues in parallel. The template combines that setup with [Matt Pocock's skills](https://github.com/mattpocock/skills) (MIT), which cover alignment and planning.

Audience: the owner's future projects, and other people who receive the link. The repository is public, MIT-licensed, and contains no Oktob or personal details.

Success: someone can create a repository from the template (or adopt it in an existing repository), run `/project-setup`, and on the same day take an idea through grill → spec → tickets → parallel implementation → reviewed merge → retro.

## Decisions

| Question | Decision | Reason |
| --- | --- | --- |
| Form | GitHub template repository plus a long `PLAYBOOK.md` | Runnable files people own, plus the reasoning behind every rule |
| Applying it | A prompt-driven `/project-setup` skill, with deterministic work (labels) in scripts | Works for new and existing repositories; modeled on `setup-matt-pocock-skills` |
| Matt Pocock's skills | Installed from upstream, not copied; our skills add glue | Users get his updates; no fork drift; clear credit |
| Tools | Orca and the Codex GitHub review are optional | People without them can still use the workflow |
| `AGENTS.md` | Lean: hard rules and pointers to `docs/agents/*.md` | Agent context is expensive; detail belongs in pointed-to docs |
| Docs tooling | Generalized `docs.mjs` configured by `docs/docs.config.json` | No project-specific code paths in the shared tool |
| Oktob | Unchanged | Migrating Oktob to the merged workflow is a separate decision |

## Workflow

| # | Step | Command | Owner |
| --- | --- | --- | --- |
| 0 | One-time setup | `/project-setup` | ours (also runs `/setup-matt-pocock-skills`) |
| 1 | Align | `/grill-with-docs` | Matt: interview, `GLOSSARY.md`, ADRs |
| 2 | Spec | `/to-spec` | Matt: umbrella spec issue (optional for small changes) |
| 3 | Tickets | `/to-tickets` then `/new-issue` | Matt creates vertical slices with blocking links; ours adds the ID, Impact section, labels and register row |
| 4 | Start | `/start-issue N claude\|codex` | ours: `scripts/issue/start.mjs` |
| 5 | Build and review | `/implement-issue` | ours, driving Matt's `/tdd` and `/code-review` plus our adversarial review. **Stop 1: user authorizes the PR** |
| 6 | PR | inside `/implement-issue` | PR body in the shape of Matt's `pr` skill; optional Codex review loop. **Stop 2: user authorizes the merge** |
| 7 | Merge and clean up | `scripts/issue/finish.mjs` | ours |
| 8 | Improve | `/retro` then `/retro-to-docs` | Matt suggests; ours records accepted changes |

Two kinds of edges between issues are kept separate:

- **Blocked by** (dependency): native GitHub issue dependencies, or a `Blocked by: #n` line. `start.mjs` refuses an issue with an open blocker.
- **Do not run in parallel with** (conflict): a line in the Impact section. `start.mjs` refuses while a conflicting issue is in progress.

Only one in-progress issue may carry `touches: schema`. Every rule can be overridden with `--force` only after the user approves that specific overlap.

## Labels

Created by `scripts/github/bootstrap-labels.mjs` from `scripts/github/labels.json`, which `/project-setup` fills:

- Priority: `P0`, `P1`, `P2`.
- Area: `area: <name>` per product area.
- Conflict filters: `touches: <subsystem>`, including `touches: schema`.
- Claims: `in progress`, `agent: claude`, `agent: codex`.
- Triage (Matt's canonical roles): `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
- Gates tests cannot close: `needs owner decision`, `needs external acceptance`.
- `spec` for umbrella spec issues.

## Repository structure

```
README.md  PLAYBOOK.md  LICENSE  NOTICE  AGENTS.md  CLAUDE.md -> AGENTS.md  changelog.md  GLOSSARY.md
.agents/skills/{project-setup,new-issue,start-issue,implement-issue,retro-to-docs}/   (.claude/skills -> ../.agents/skills)
scripts/issue/{start.mjs,setup-worktree.sh,wait-codex-review.mjs,finish.mjs}
scripts/github/{bootstrap-labels.mjs,labels.json}
scripts/docs/{docs.mjs,docs.test.mjs,manuals.mjs}
docs/{index.md,SPEC.md,log.md,documentation-sync.md,issue-register.md,template-design.md,docs.config.json}
docs/agents/{verification.md,parallel-work.md,lifecycle.md,review-risks.md,dependencies.md}   (issue-tracker.md, domain.md, triage-labels.md written by /setup-matt-pocock-skills)
docs/references/{okf-spec.md,OKF-LICENSE.txt}
.github/{ISSUE_TEMPLATE/ticket.md,pull_request_template.md}
package.json  (tools only: js-yaml)  template.config.json  (placeholders and module switches)
```

Placeholders use `{{NAME}}` and are listed in `template.config.json`, which also records the module switches the scripts read (Orca, Codex review, ID prefix, branch prefix, install command). `/project-setup` fills it and replaces the placeholders. `CLAUDE.md` is a symlink, so when Matt's setup skill adds its `## Agent skills` block to `CLAUDE.md`, it lands in `AGENTS.md`.

## Optional modules

`/project-setup` asks which to keep and removes the rest with their `AGENTS.md` lines:

1. **Docs drift system**: OKF profile, generated indexes, tracked-source fingerprints, explicit review receipts, `docs:check` as a build gate.
2. **Issue register**: `docs/issue-register.md` with stable `PREFIX-NNN` IDs mirrored to GitHub issues.
3. **Bilingual manuals**: `docs/help-content.json` generates `docs/manual-<lang>.md` with a drift check.
4. **Dependency policy**: no paid runtime dependencies; verify licenses.
5. **Codex GitHub review** step.
6. **Orca** worktrees and agent launch (otherwise plain `git worktree`).

## Script behavior

- `start.mjs <N> <claude|codex> [--force] [--dry-run]`: checks state, claim, blockers, conflicts and the schema lock; derives the branch `<user>/<prefix>-<nnn>-<slug>`; creates the worktree with Orca when `orca` is installed and enabled in `template.config.json`, otherwise with `git worktree add` beside the main checkout; launches the agent through Orca or prints the launch command; adds labels and a claim comment.
- `setup-worktree.sh`: copies dependency folders listed in `scripts/issue/worktree-copy.txt` from the main checkout when lockfiles match, else runs the configured install command.
- `wait-codex-review.mjs`: unchanged behavior from Oktob (findings, 👍 clean, nudge after 10 minutes, 45-minute timeout).
- `finish.mjs <PR>`: squash-merge, delete remote branch, clear claim labels, fast-forward the main checkout, remove the worktree (Orca or `git worktree remove` plus branch delete).
- `bootstrap-labels.mjs [--dry-run]`: idempotent create-or-update of labels.

## Verification of the template

- `node --test scripts/docs/docs.test.mjs` passes.
- `node --check` passes for every script; `--dry-run` paths run against a real or fixture repository.
- A scratch repository created from the template runs `/project-setup` end to end, then `docs:check` passes.
- A grep finds no `Oktob`, `OKT-`, owner paths, or email addresses outside credits and this design record; a secret scan finds nothing.
- Then: create the public repository, mark it as a template, push.

## Out of scope

- Migrating Oktob to this template.
- A Claude Code plugin or marketplace package.
- CI workflows (the playbook explains how to add `docs:check` to CI later).
- Linear, GitLab or Jira trackers beyond what Matt's setup skill supports.
