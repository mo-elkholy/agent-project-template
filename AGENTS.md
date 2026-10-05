# {{PROJECT_NAME}}: agent working agreements

`CLAUDE.md` is a link to this file, so Claude Code and Codex read the same rules. Keep this file short: hard rules and pointers. Detail lives in the linked documents.

## Read first

- [GLOSSARY.md](GLOSSARY.md): the project's words. Use them in code, issues and tests.
- `docs/adr/`: decisions that are hard to reverse (created when the first one is needed). Flag any change that contradicts an ADR.
- [docs/index.md](docs/index.md): all documentation. [Issue register](docs/issue-register.md): tracked work and stable IDs.

## Hard rules

1. **Two stops.** Never create a pull request or merge one without the user's explicit authorization for that issue. Approval does not carry over to the next issue.
2. **Claim before working** an issue; never take a claimed one. Respect blockers, conflicts and the schema lock: [parallel work](docs/agents/parallel-work.md).
3. **One issue per branch and worktree**, from `origin/main`, merged by pull request with `Closes #N`. The only direct commits to `main` record a new issue (register, log, changelog).
4. **Verify proportionately and report honestly**: [verification cadence](docs/agents/verification.md). Distinguish focused checks from the full suite. Never claim a check passed that did not run.
5. **Docs travel with the change.** Update affected docs, [the log](docs/log.md) and [the changelog](changelog.md) in the same batch. Follow [documentation sync](docs/documentation-sync.md). Never acknowledge a document you did not review, and never hand-merge generated files.
6. **Dependencies**: follow the [dependency policy](docs/agents/dependencies.md).
7. **Private data stays out** of docs, issues, logs and external services: credentials, customer data, private files.

## Workflow

The full lifecycle with its stops is in [docs/agents/lifecycle.md](docs/agents/lifecycle.md); the reasoning is in [PLAYBOOK.md](PLAYBOOK.md).

| When the user says | Run |
| --- | --- |
| "Set up this repo" | `/project-setup` (once) |
| "Let's figure out / design X" | `/grill-with-docs` |
| "Write the spec" | `/to-spec` |
| "Break it into tickets" | `/to-tickets`, then `/new-issue` to add IDs and Impact |
| "Make this a ticket" | `/new-issue` |
| "Work on issue N" | `/start-issue N claude\|codex` |
| "Implement issue N" (inside its worktree) | `/implement-issue` |
| "Retro" | `/retro`, then `/retro-to-docs` |

Our skills are in `.agents/skills/`; scripts are in `scripts/`. Matt Pocock's skills are installed separately.

## Agent skills

_`/setup-matt-pocock-skills` writes its issue tracker, triage label and domain-doc pointers here._
