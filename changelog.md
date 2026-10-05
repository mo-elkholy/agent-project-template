# Changelog

Meaningful repository changes, newest first, with dates and the verification actually performed. Detailed records live in [docs/log.md](docs/log.md).

Each entry: what changed (by area), then a **Verification** line naming the checks that ran and whether they were focused or full. Say plainly what was not run.

## 2026-10-05

### Created from the agent project template

- Added the agent workflow: `AGENTS.md` (with `CLAUDE.md` linked to it), lifecycle skills in `.agents/skills/`, issue and label scripts in `scripts/`, documentation profile and drift checks in `docs/`, and the playbook.

Verification: template tooling tests (`npm run test:tools`) and documentation checks (`npm run docs:check`). No application code exists yet.
