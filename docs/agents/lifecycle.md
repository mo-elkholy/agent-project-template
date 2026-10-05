---
type: "Agent Rules"
title: "Issue lifecycle"
description: "The steps from idea to merged pull request, which skill or script runs each, and the two stops that need the user."
status: "stable"
owner: "{{DOC_OWNER}}"
generated: {"by": "claude/opus-5.5", "at": "2026-10-05T20:00:00+00:00"}
tracks: [".agents/skills/project-setup", ".agents/skills/new-issue", ".agents/skills/start-issue", ".agents/skills/implement-issue", ".agents/skills/retro-to-docs", "scripts/issue", "template.config.json"]
sources: [{"resource": "../../PLAYBOOK.md"}]
---
# Issue lifecycle

Our skills live in `.agents/skills/` (`.claude/skills` links to the same folder, so Claude Code and Codex read the same files). Scripts live in `scripts/`. Matt Pocock's skills are installed separately; see the [playbook](../../PLAYBOOK.md#2-prerequisites).

| # | Step | Run | Notes |
| --- | --- | --- | --- |
| 0 | One-time setup | `/project-setup` | Fills the placeholders and config, creates labels, runs `/setup-matt-pocock-skills` |
| 1 | Align | `/grill-with-docs` | Relentless interview; updates `GLOSSARY.md` and ADRs as terms and decisions settle. Use for every non-trivial change |
| 2 | Spec | `/to-spec` | Publishes an umbrella spec issue (label `spec`). Skip for small, single-ticket changes |
| 3 | Tickets | `/to-tickets`, then `/new-issue` | Matt's skill creates vertical-slice issues with blocking edges; ours adds the ID, Impact section, labels and register row. `/new-issue` alone turns one agreed idea into one issue |
| 4 | Start | `/start-issue N claude\|codex` | Runs `scripts/issue/start.mjs`: checks, worktree, agent launch, claim. The coordinating session then stops |
| 5 | Build and review | `/implement-issue` (in the worktree) | `/tdd` at agreed seams, focused verification, docs, then `/code-review` plus an adversarial reviewer. Findings are fixed or rejected with a written reason |
| | **Stop 1** | | Report readiness. **The user authorizes creating the PR** |
| 6 | PR and review | (inside `/implement-issue`) | PR body: summary, evidence, review outcome, merge danger, `Closes #N`. Optional Codex GitHub review via `scripts/issue/wait-codex-review.mjs` |
| | **Stop 2** | | Report reviews done. **The user authorizes the merge** |
| 7 | Merge and clean up | `node scripts/issue/finish.mjs <PR>` | Squash-merge, clear the claim, update the main checkout, remove the worktree and branch |
| 8 | Improve | `/retro`, then `/retro-to-docs` | Turn accepted retro findings into checks, rules or issues |

Never create a PR or merge without the user's explicit authorization **for that issue**. Approval for one issue does not carry over to the next. If branch protection is not enforced on the repository, these two stops are the only gate.

## Worktrees: Orca or plain git

`template.config.json` sets `"orca": true|false`. With Orca enabled and installed, `start.mjs` creates an Orca worktree linked to the issue and launches the agent in it. If Orca is disabled, not installed, not running, or does not know the repository, it says why and creates a plain `git worktree` in `<repo>-worktrees/<name>` beside the main checkout and prints the command to launch the agent there. `finish.mjs` removes whichever kind it finds.

## Codex GitHub review (optional)

With `"codexReview": true`, step 6 waits for the Codex GitHub reviewer: findings are fixed or answered in their thread, then `@codex review` is requested again (at most three rounds). The waiter nudges once after 10 minutes and gives up after 45. With `false`, step 6 skips straight to Stop 2.
