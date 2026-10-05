# Agent Project Template

A starting point for building software with AI coding agents (Claude Code and Codex) that work GitHub issues **in parallel**, with you holding the keys to every pull request and merge.

It packages a working method, not just files:

- **Align before building**, with [Matt Pocock's skills](https://github.com/mattpocock/skills): a relentless interview that builds a shared glossary, then a spec, then vertical-slice tickets.
- **Run agents in parallel safely**: stable issue IDs, an **Impact** section on every ticket, claims, blockers versus conflicts, a schema lock, and one worktree per issue (with [Orca](https://github.com/stablyai/orca) or plain `git worktree`).
- **Review twice before you see a PR**: a two-axis code review (standards and spec) plus an adversarial reviewer that tries to break the change. An optional Codex GitHub review follows.
- **Two human stops**: an agent never opens a PR or merges without your explicit yes.
- **Keep honest records**: a changelog and a detailed log that say what was verified (and what was not), and docs that flag themselves when the code they describe changes.

Read [PLAYBOOK.md](PLAYBOOK.md) for the full guide: every step, why it exists, and what went wrong without it.

## The flow

```
 idea
  │  /grill-with-docs        interview; GLOSSARY.md and ADRs grow as you talk
  ▼
 spec issue  ◄── /to-spec    (skip for small changes)
  │  /to-tickets             vertical slices with "blocked by" edges
  │  /new-issue              + stable ID, Impact section, labels, register row
  ▼
 open tickets ── /start-issue N claude|codex ──► worktree + branch + claim + agent
                                                   │  /implement-issue
                                                   │  /tdd → focused checks → docs
                                                   │  /code-review + adversarial review
                                                   ▼
                                       ■ STOP 1: you approve the PR
                                                   │  PR (+ optional Codex review)
                                                   ▼
                                       ■ STOP 2: you approve the merge
                                                   │  finish.mjs: squash-merge, clean up
                                                   ▼
                                       /retro → /retro-to-docs: improve the setup
```

## Quick start (new project)

1. Click **Use this template** on GitHub, then clone your new repository.
2. Install Matt Pocock's skills:
   - Claude Code: `claude plugins install mattpocock-skills`
   - Codex or other agents: `npx skills@latest add mattpocock/skills` (include `setup-matt-pocock-skills`)
3. Install the tooling: `npm install` (Node 20 or later; it only adds `js-yaml`, and works beside any stack).
4. In Claude Code or Codex, run `/project-setup`. It asks for your project name, ID prefix, commands, areas and modules, creates the GitHub labels, and runs Matt's setup.
5. Start your first feature with `/grill-with-docs`.

## Adopting it in an existing repository

Copy the template's files into your repository (`AGENTS.md`, `CLAUDE.md` link, `.agents/`, `.claude/`, `.github/`, `scripts/`, `docs/`, `template.config.json`, `GLOSSARY.md`, `changelog.md`, `PLAYBOOK.md`, and the `package.json` scripts and dependency), then run `/project-setup`. It merges with your existing `AGENTS.md` or `CLAUDE.md` instead of overwriting them, and can create labels without touching existing ones. See [PLAYBOOK §12](PLAYBOOK.md#12-adopting-in-an-existing-repository).

## What's inside

| Path | What it is |
| --- | --- |
| [AGENTS.md](AGENTS.md) (`CLAUDE.md` links here) | Short hard rules and pointers that every agent reads |
| [PLAYBOOK.md](PLAYBOOK.md) | The full guide |
| `.agents/skills/` (`.claude/skills` links here) | `project-setup`, `new-issue`, `start-issue`, `implement-issue`, `retro-to-docs` |
| `scripts/issue/` | `start.mjs`, `setup-worktree.sh`, `wait-codex-review.mjs`, `finish.mjs` |
| `scripts/github/` | `bootstrap-labels.mjs` and `labels.json` |
| `scripts/docs/` | `docs.mjs` (indexes, drift fingerprints, review receipts) and the optional `manuals.mjs` |
| `scripts/setup/` | `placeholders.mjs` (used by `/project-setup`) and `upstream.mjs` (checks Matt Pocock's skills still exist upstream) |
| [docs/agents/](docs/agents/index.md) | Verification cadence, parallel work, lifecycle, review risks, dependency policy |
| [docs/](docs/index.md) | Documentation profile, sync guide, issue register, log |
| [GLOSSARY.md](GLOSSARY.md), [changelog.md](changelog.md) | Shared language; concise change history |
| `template.config.json` | Your answers to `/project-setup`, read by the scripts |

## Requirements

- Git and the [GitHub CLI](https://cli.github.com/) (`gh auth login`)
- Node.js 20 or later (for the workflow scripts only)
- [Claude Code](https://claude.com/claude-code) and/or [Codex](https://github.com/openai/codex)
- Optional: [Orca](https://github.com/stablyai/orca) for managed worktrees; the [Codex GitHub app](https://chatgpt.com/codex) for automated PR review

## Credits and license

- Alignment and planning skills: [Matt Pocock's Skills For Real Engineers](https://github.com/mattpocock/skills) (MIT), installed separately and not copied here.
- Documentation format: [Open Knowledge Format v0.2](docs/references/okf-spec.md) (Apache-2.0), included with its license.
- Everything else: MIT, see [LICENSE](LICENSE) and [NOTICE](NOTICE).
