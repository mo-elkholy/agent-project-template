---
name: project-setup
description: "Configure a repository for the agent project workflow: fill template placeholders and template.config.json, choose optional modules, create GitHub labels, and run Matt Pocock's setup. Run once per repository, in a new repo created from the template or an existing repo adopting it."
disable-model-invocation: true
---

# Project setup

Step 0 of the lifecycle in `docs/agents/lifecycle.md`. Prompt-driven, not a script: explore, present findings, ask one section at a time, show drafts, then write. Never overwrite the user's existing content.

## 1. Explore

Read what exists; do not assume.

- `git remote -v`, the default branch (`git symbolic-ref refs/remotes/origin/HEAD` or `gh repo view --json defaultBranchRef`), and `gh auth status`.
- `template.config.json`: if `"configured": true`, this repository was already set up. Ask whether to change specific answers instead of starting over.
- Is this the template's own fresh copy (placeholders such as `{{PROJECT_NAME}}` present: `grep -rl '{{' --exclude-dir=node_modules --exclude-dir=.git .`) or an existing project adopting it (its own source tree, README, maybe its own `AGENTS.md`/`CLAUDE.md`)?
- Stack and commands: `package.json` scripts, `Makefile`, `pyproject.toml`, `Cargo.toml`, CI files. Find the build/type-check, single-test-file, full-suite and install commands, the lockfile, and dependency folders worth copying into worktrees (`node_modules`, `.venv`).
- Tools: `command -v orca codex claude gh`.
- Matt Pocock's skills: is `setup-matt-pocock-skills` (and `grill-with-docs`, `to-spec`, `to-tickets`, `tdd`, `code-review`, `retro`) in your available skills, `.agents/skills/`, `.claude/skills/` or `~/.claude/skills/`?
- Existing GitHub labels: `gh label list --limit 500`.
- Top-level source folders, to suggest product areas and risky subsystems.

## 2. Present findings, then ask one section at a time

Summarize what is present and missing. Then take the sections in order, one answer each. Lead with your recommended answer so the user can accept it in a word. Skip a section when exploration already settled it.

A. **Identity:** project name; register ID prefix (2–5 capital letters, e.g. `ACME`); branch prefix (default: the GitHub username); `owner/repo`; documentation owner (person or team name for `owner:` in docs).
B. **Commands:** build/type check, one test file, full suite, install command, lockfile, folders to copy into worktrees.
C. **Areas and subsystems:** product areas (`area: …` labels) and subsystems that conflict when edited in parallel (`touches: …` labels). Always keep `touches: schema`, and ask what "schema" means here (saved file format, database schema, public API).
D. **Regression groups and risks:** risky areas with the tests that guard them (for `docs/agents/verification.md`), and project-specific risks for the adversarial reviewer (`docs/agents/review-risks.md`).
E. **Modules:** recommend keeping docs drift, issue register and dependency policy; manuals only if the product has user-facing Help in more than one language (then ask which languages and their text direction).
F. **Tools:** Orca worktrees (recommend yes only if `orca` is installed); Codex GitHub review (yes only if the Codex GitHub app reviews this repository; explain it can be enabled later).
G. **Labels:** for an existing repository with its own labels, recommend `--create-only` so existing label colors and descriptions stay untouched.

## 3. Show drafts

Before writing, show: the filled `template.config.json`; the `AGENTS.md` changes (for an existing file, the exact sections you will add); the label diff from `node scripts/github/bootstrap-labels.mjs --dry-run` after you edit `scripts/github/labels.json`; and the list of files you will delete for disabled modules. Let the user edit.

## 4. Write

1. **Config:** fill `template.config.json` and set `"configured": true`.
2. **Placeholders:** run `node scripts/setup/placeholders.mjs PROJECT_NAME=<name> ID_PREFIX=<prefix> OWNER_REPO=<owner/repo> BRANCH_PREFIX=<prefix> DOC_OWNER=<owner>`. It replaces only those five tokens and skips pinned references, dependencies and binaries. Then `node scripts/setup/placeholders.mjs --check` must report none remaining.
3. **Agent rules, existing repository:** if `AGENTS.md` or `CLAUDE.md` already exists, merge: add the template's sections under their headings and keep every existing rule. If only `CLAUDE.md` exists, move its content into `AGENTS.md` and replace `CLAUDE.md` with a link (`ln -s AGENTS.md CLAUDE.md`), after showing the user. Never silently drop or reword their rules.
4. **Docs:** fill the command table and regression groups in `docs/agents/verification.md`, the risk table in `docs/agents/review-risks.md`, `title` and `directories` in `docs/docs.config.json`, and add the project's real source folders to `trackRoots`. Wire `npm run docs:check` into the project's build or check command if the user agrees.
5. **Disabled modules:** delete their files and every line that points at them:
   - docs drift: `scripts/docs/docs.mjs`, `docs.test.mjs`, `docs/.sync-state.json`, the `docs:*` scripts, and the acknowledgment wording in rule 5 of `AGENTS.md` (keep "docs travel with the change");
   - issue register: `docs/issue-register.md` and its mentions in `AGENTS.md`, `docs/agents/*.md` and the skills (IDs then come from the GitHub issue number);
   - manuals: `scripts/docs/manuals.mjs`, its test, `docs/help-content.example.json`, the manuals section of `docs/documentation-sync.md`; when enabled instead, copy the example to `docs/help-content.json`, set the languages, generate, and add `--check` to `docs:check`;
   - dependency policy: `docs/agents/dependencies.md` and rule 6 in `AGENTS.md`.
6. **Template-only files** in a project's own repository: delete `docs/template-design.md` unless the user wants to keep it. Keep `PLAYBOOK.md`, `NOTICE` and the license notice for the template's files.
7. **Labels:** fill `areas` and `touches` in `scripts/github/labels.json`, show the dry run, and after confirmation run `node scripts/github/bootstrap-labels.mjs` (with `--create-only` when chosen).
8. **Matt Pocock's skills:** if missing, tell the user how to install them and stop this step until they confirm:
   - Claude Code: `claude plugins install mattpocock-skills` (or `/plugin install mattpocock-skills`);
   - Codex and others: `npx skills@latest add mattpocock/skills`, selecting at least `setup-matt-pocock-skills`, `grill-with-docs`, `to-spec`, `to-tickets`, `tdd`, `code-review`, `retro`, `triage`, plus the model-invoked ones they rely on (`grilling`, `domain-modeling`, `codebase-design`, `pr`, `writing-for-agents`).
   Then run `/setup-matt-pocock-skills` (it is user-invoked: ask the user to type it if you cannot invoke it). Recommended answers: GitHub issue tracker; keep the default triage labels (they already exist from step 7); single-context domain docs. It writes `docs/agents/issue-tracker.md`, `triage-labels.md` and `domain.md`, and its `## Agent skills` block lands in `AGENTS.md` through the `CLAUDE.md` link.
9. **Records:** `npm run docs:sync`; review every document the changes touched; acknowledge each by name with a specific note; `npm run docs:check` must pass. Add a dated entry to `docs/log.md` and `changelog.md` naming the choices and the checks run.
10. **Commit** on a setup branch (or on `main` only for a brand-new repository with no other history, if the user agrees): `chore: configure agent project workflow`.

## 5. Report

Tell the user: the choices made, files changed or deleted, labels created or updated, whether Matt's setup ran, the checks that passed, and anything left for them (enable the Codex GitHub app, register the repo in Orca, protect the default branch). Suggest the first real step: `/grill-with-docs` on the first feature.
