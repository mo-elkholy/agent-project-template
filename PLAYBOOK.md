# Playbook

The complete guide to the agent project workflow: what to do, in what order, and why each rule exists. The [README](README.md) is the short version; [AGENTS.md](AGENTS.md) is what agents read every session; this is what people read once, properly.

## Contents

1. [Philosophy](#1-philosophy)
2. [Prerequisites](#2-prerequisites)
3. [From an empty folder to the first push](#3-from-an-empty-folder-to-the-first-push)
4. [Project structure](#4-project-structure)
5. [One-time setup with /project-setup](#5-one-time-setup-with-project-setup)
6. [The lifecycle, walked through one feature](#6-the-lifecycle-walked-through-one-feature)
7. [Parallel work](#7-parallel-work)
8. [Reviews](#8-reviews)
9. [Verification and honest reporting](#9-verification-and-honest-reporting)
10. [The documentation system](#10-the-documentation-system)
11. [Labels](#11-labels)
12. [Adopting in an existing repository](#12-adopting-in-an-existing-repository)
13. [Troubleshooting](#13-troubleshooting)
14. [Lessons learned](#14-lessons-learned)
15. [Customizing](#15-customizing)
16. [Glossary of the method](#16-glossary-of-the-method)
17. [Credits](#17-credits)

---

## 1. Philosophy

Five ideas carry the whole method. Every rule later in this guide serves one of them.

**Align before you build.** The most common failure with coding agents is not bad code; it is good code for the wrong thing. So every non-trivial change starts with an interview (`/grill-with-docs`) that keeps asking until the agent understands what you want, and writes down the words you agreed on (`GLOSSARY.md`) and the decisions that would surprise a future reader (ADRs). A shared vocabulary also makes agents shorter and sharper: "the materialization cascade" instead of three sentences.

**Small, verified batches.** Agents can produce code faster than anyone can check it. The speed limit is feedback, so work is cut into vertical slices that each run end to end and can be tested alone. Tests come first (red, green, refactor), and verification is proportionate: focused checks for most changes, regression groups for risky areas, the full suite at checkpoints.

**Parallel, but never colliding.** Two or more agents can work at once if each one owns one issue, one branch and one worktree, and if the system knows which issues must not run together. Dependencies ("blocked by") and conflicts ("do not run in parallel with") are different things and are tracked separately.

**Humans hold two keys.** An agent may plan, build, test, review and fix on its own. It may not open a pull request or merge one without your explicit yes for that issue. On a private repository without enforced branch protection, those two stops are the only gate, so they are written as hard rules.

**Honest records travel with the code.** Every batch says what changed and what was actually verified, including what was not run. Documentation lives in the repository, declares which source files it describes, and flags itself when those files change. Nobody (human or agent) may mark a document reviewed without reviewing it.

---

## 2. Prerequisites

### Accounts and tools

| Tool | Why | Install / check |
| --- | --- | --- |
| Git | Branches and worktrees | `git --version` (2.28+ recommended for `git init -b main`) |
| GitHub account and the GitHub CLI | Issues, labels, PRs from the terminal | `brew install gh` (or see cli.github.com), then `gh auth login` |
| Node.js 20+ | Runs the workflow scripts (any project stack is fine) | `node --version` |
| Claude Code | One of the two agents | claude.com/claude-code |
| Codex CLI | The other agent | `npm i -g @openai/codex` or see github.com/openai/codex |
| Orca (optional) | Manages one worktree per issue and launches agents in it | github.com/stablyai/orca |
| Codex GitHub app (optional) | Automatic review comments on every PR | Enable code review for the repository in Codex settings |

You can use only one agent. Everything works with Claude alone or Codex alone; the parallel rules simply matter less.

### Orca (optional)

Orca runs each issue in its own worktree with its own agent terminal, and shows them side by side. The scripts use it when `"orca": true` in `template.config.json` and the `orca` command is installed; otherwise they fall back to plain git worktrees.

1. Install Orca, then `orca open` and `orca status` to confirm the runtime is reachable.
2. Sign in Claude and/or Codex (`orca account add`, or in the app).
3. Register the repository: `orca repo add --path <repo>`; confirm with `orca repo list`. `start.mjs` matches the registered path to your main checkout.
4. Optional: `orca skills install` adds Orca's CLI skill so agents can update their workspace card (`orca worktree set --worktree active --comment "<status>"`), which `/implement-issue` does at each checkpoint.

What changes with Orca on:

| Step | With Orca | Without Orca |
| --- | --- | --- |
| `/start-issue` | `orca worktree create … --issue N --agent claude --prompt …` creates a linked workspace and launches the agent | `git worktree add` in `<repo>-worktrees/<name>`; you start the agent with the printed command |
| Watching progress | Orca sidebar or `orca worktree ps` | Your terminals; `git worktree list` |
| Finishing | `finish.mjs` runs `orca worktree rm`, which also deletes the local branch | `finish.mjs` runs `git worktree remove` and deletes the branch |

### Matt Pocock's skills

The alignment and planning half of this method comes from [Matt Pocock's skills](https://github.com/mattpocock/skills). They are **installed, not copied**, so you receive his improvements. Pick one installation route; installing both gives you every skill twice.

- **Claude Code plugin** (managed, read-only, auto-updating): `claude plugins install mattpocock-skills`, or `/plugin install mattpocock-skills` inside a session.
- **skills.sh** (editable copies in your project, any agent including Codex): `npx skills@latest add mattpocock/skills`. Choose at least `setup-matt-pocock-skills`, `grill-with-docs`, `grilling`, `domain-modeling`, `to-spec`, `to-tickets`, `tdd`, `code-review`, `codebase-design`, `pr`, `retro`, `writing-for-agents` and `triage`. Update later with `npx skills update`.

The skills this template uses, and where:

| Skill | Kind | Used in |
| --- | --- | --- |
| `/setup-matt-pocock-skills` | user-invoked | Step 0, run by `/project-setup` |
| `/grill-with-docs` (uses `grilling` and `domain-modeling`) | user-invoked | Step 1, align |
| `/to-spec` | user-invoked | Step 2, spec |
| `/to-tickets` | user-invoked | Step 3, tickets |
| `tdd` | model-invoked | Step 5, build |
| `code-review` | model-invoked | Step 5, review |
| `pr` | model-invoked | Step 6, PR body shape |
| `/retro` (uses `writing-for-agents`) | user-invoked | Step 8, improve |
| `/triage`, `/improve-codebase-architecture`, `/wayfinder`, `diagnosing-bugs`, `prototype` | mixed | Any time; they fit around the lifecycle |

"User-invoked" skills run only when you type them. When a skill in this template says "run `/retro`", the agent asks you to type it if it cannot invoke it itself.

---

## 3. From an empty folder to the first push

You can skip this section when you click **Use this template**. It records what that button saves you, and what to do when you start without it.

1. **Create the repository.** `gh repo create <owner>/<name> --private --clone` (or `--public`). Private is the safe default for product code. Public suits templates and libraries.
2. **Ignore before you add.** Write `.gitignore` before the first `git add`. Exclude dependency and build folders, logs, local scratch (`.scratch/`, `.worktrees/`), environment files (`.env`, `.env.*` but keep `.env.example`), and key material (`*.pem`, `*.key`, `*.p12`, `*.pfx`). Add your project's private data folders (customer files, manuscripts, exports) explicitly.
3. **Scan before the first push.** History is forever; check what you are about to publish:

   ```sh
   git add -A && git status --short           # read the list
   git ls-files -z | xargs -0 du -k | sort -rn | head   # any huge files?
   git grep -nIE '(ghp_|github_pat_|sk-[A-Za-z0-9]{20}|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|EC) PRIVATE)' # any secrets?
   ```

4. **One rule file for both agents.** Claude Code reads `CLAUDE.md`; Codex reads `AGENTS.md`. Keep one file and link the other: `ln -s AGENTS.md CLAUDE.md`. Do the same for skills: keep them in `.agents/skills/` and link `.claude/skills` to it (`mkdir -p .claude && ln -s ../.agents/skills .claude/skills`). Check that both paths show the same content.
5. **Start the records.** Create `changelog.md` with a first entry ("Repository created; checks run: …") and add the upkeep rule to `AGENTS.md`.
6. **First commit and push.** `git commit -m "Initial source and documentation"`, `git push -u origin main`, then confirm `git rev-parse HEAD` matches `gh api repos/<owner>/<name>/commits/main --jq .sha`.
7. **Protect the default branch if your plan allows it** (Settings → Branches). On free private repositories GitHub may not enforce protection; then the two stops in `AGENTS.md` are your only gate, which is why they are hard rules.

---

## 4. Project structure

```
.
├── AGENTS.md                 Hard rules + pointers; every agent reads it every session. Keep it short.
├── CLAUDE.md -> AGENTS.md    Same file for Claude Code.
├── PLAYBOOK.md               This guide.
├── README.md                 What this is and the quick start.
├── GLOSSARY.md               Shared language; grows during /grill-with-docs.
├── changelog.md              Concise history: what changed + what was verified.
├── template.config.json      Your /project-setup answers; scripts read it.
├── package.json              Workflow scripts (docs:*, test:tools) and js-yaml.
├── .agents/skills/           Our skills (Codex reads here).
├── .claude/skills -> ../.agents/skills   Same skills for Claude Code.
├── .github/
│   ├── ISSUE_TEMPLATE/ticket.md      Ticket body with the Impact section.
│   └── pull_request_template.md      Summary, evidence, review outcome, merge danger.
├── scripts/
│   ├── config.mjs                    Shared helpers: config, commands.
│   ├── issue/                        start, setup-worktree, wait-codex-review, finish (+ lib + tests)
│   ├── github/                       bootstrap-labels + labels.json (+ lib + tests)
│   ├── docs/                         docs.mjs drift tool, manuals.mjs (+ tests)
│   └── setup/                        placeholders.mjs, upstream.mjs (+ tests)
└── docs/
    ├── index.md                      Generated: every document with its description.
    ├── SPEC.md                       The documentation profile (rules for docs).
    ├── documentation-sync.md         How to keep docs in step with code.
    ├── log.md                        Detailed, dated history.
    ├── issue-register.md             Stable IDs for tracked work.
    ├── docs.config.json              Docs tool settings.
    ├── .sync-state.json              Review receipts (generated by docs:ack).
    ├── agents/                       Rules agents follow (pointed to from AGENTS.md):
    │   ├── verification.md           Testing cadence, commands, regression groups.
    │   ├── parallel-work.md          Claims, blockers, conflicts, schema lock.
    │   ├── lifecycle.md              The steps and the two stops.
    │   ├── review-risks.md           What the adversarial reviewer hunts for.
    │   ├── dependencies.md           Dependency policy (optional module).
    │   └── issue-tracker.md, triage-labels.md, domain.md   Written by Matt's setup.
    ├── adr/                          Architecture decisions (created when the first is needed).
    └── references/                   Pinned upstream specs with their licenses.
```

Why it is split this way:

- **`AGENTS.md` is expensive.** Every agent loads it into context every session. Rules that only matter during review belong in `docs/agents/review-risks.md`; testing detail belongs in `verification.md`. `AGENTS.md` keeps the rules an agent must never break, and pointers.
- **Skills hold procedures; docs hold rules.** A skill is a step-by-step routine an agent follows when a trigger fires ("work on issue 12"). A rule document is what the routine checks against. Skills point at docs so a rule lives in exactly one place.
- **Scripts hold anything mechanical.** Checking whether an issue is claimed, blocked or conflicting is not a judgment call, so it is code with tests, not prose an agent might skim.
- **Generated files say so.** `docs/index.md`, generated manuals and `.sync-state.json` are produced by tools. Never edit or hand-merge them; regenerate.

---

## 5. One-time setup with /project-setup

Run `/project-setup` once per repository in Claude Code or Codex. It explores the repository, then asks one section at a time with a recommended answer you can accept in a word:

| Section | Question | Why it matters |
| --- | --- | --- |
| A. Identity | Project name, ID prefix (e.g. `ACME`), branch prefix, `owner/repo`, documentation owner | IDs and branch names are permanent; pick short, stable ones |
| B. Commands | Build/type check, one test file, full suite, install, lockfile, folders to copy into worktrees | Agents run exactly these; new worktrees reuse dependencies instead of reinstalling |
| C. Areas and subsystems | Product areas; subsystems that conflict when edited in parallel; what "schema" means here | Becomes `area:` and `touches:` labels that make overlap visible |
| D. Regression groups and risks | Risky areas and their guard tests; project-specific review risks | Focused verification without guessing; reviewers hunt your real failure modes |
| E. Modules | Docs drift, issue register, bilingual manuals, dependency policy | Keep only what helps; disabled modules are deleted, not left as dead text |
| F. Tools | Orca on/off; Codex GitHub review on/off | Scripts adapt: plain `git worktree` without Orca; no review wait without Codex |
| G. Labels | Create-only for existing repositories? | Never repaint labels that already mean something |

It then shows drafts, writes the files, replaces every `{{PLACEHOLDER}}`, creates the labels, runs `/setup-matt-pocock-skills` (GitHub tracker, default triage labels, single-context domain docs), records the setup in the log and changelog, and makes sure `npm run docs:check` passes.

---

## 6. The lifecycle, walked through one feature

A worked example. The project is "Acme", ID prefix `ACME`, two agents, Orca off. The feature: *users can export any report as CSV*.

### Step 1. Align: `/grill-with-docs`

You: "I want users to export reports as CSV." The agent interviews you, one question at a time, each with its recommended answer: Which reports? All, including scheduled ones? What about reports with 2 million rows? Should the export include hidden columns? Is "report" the saved definition or one run of it?

That last question is the domain modeling part. You decide that a **Report** is the saved definition and a **Report run** is one execution; exports happen on a run. The agent writes both terms to `GLOSSARY.md` immediately. You also decide to stream large exports rather than build them in memory. That is hard to reverse, surprising without context and a real trade-off, so the agent offers an ADR: `docs/adr/0001-stream-report-exports.md`.

### Step 2. Spec: `/to-spec`

The agent does not interview again; it synthesizes the conversation into a spec issue: problem, solution, a long list of user stories, implementation decisions (modules and interfaces, no file paths), testing decisions (the seams: "test through the export service's public interface"), and what is out of scope (Excel format). It checks the test seams with you, then publishes the issue with the `spec` label. Skip this step for a change that is one ticket anyway.

### Step 3. Tickets: `/to-tickets`, then `/new-issue`

`/to-tickets` proposes vertical slices, each one demoable end to end:

1. Export a small run as CSV (download button, service, CSV writer, one test). Blocked by: none.
2. Stream large runs. Blocked by: 1.
3. Include or exclude hidden columns. Blocked by: 1.

You check the granularity and the edges, then it creates three issues with native "blocked by" links and the `ready-for-agent` label.

`/new-issue` then enriches them for parallel work:

- IDs from the register: `ACME-014`, `ACME-015`, `ACME-016`, added to each title.
- An **Impact** section per issue, mapped from the code: likely files (only paths that exist), focused tests to run, schema change (no), shared hotspots (`src/reports/service.ts`), `touches: reports`, and conflicts. Issues 15 and 16 both rewrite the same writer function, so each says `Do not run in parallel with: #other`.
- Labels: `P1`, `area: reports`, `touches: reports`.
- Register rows, a log line and a changelog line, committed directly to `main`: the one direct commit the lifecycle allows.

### Step 4. Start: `/start-issue 14 claude`

The skill runs `node scripts/issue/start.mjs 14 claude --dry-run`, shows you the plan, then runs it for real. The script checks: open, not claimed, no open blockers, no conflict with an in-progress issue, no second schema change in progress. It creates branch `me/acme-014-export-small-run-csv` in `../acme-worktrees/acme-014-export-small-run-csv`, labels the issue `in progress` and `agent: claude`, comments with the branch, and prints:

```
cd "../acme-worktrees/acme-014-export-small-run-csv" && claude "Implement GitHub issue #14 … Follow the implement-issue skill …"
```

With Orca on, the same command creates an Orca worktree and launches the agent in it directly. Either way the coordinating session stops here.

Meanwhile `/start-issue 15 codex` is refused: issue 15 is blocked by 14. When 14 merges, 15 and 16 are both unblocked, but they conflict, so only one can be in progress at a time.

### Step 5. Build and review: `/implement-issue`

In the new worktree, the agent runs `scripts/issue/setup-worktree.sh` (dependencies are copied from the main checkout in seconds when the lockfiles match), reads the issue, glossary and ADR, and corrects the Impact section if the code says otherwise.

It builds with `/tdd`: a failing test through the export service's interface, the code to pass it, a refactor, and the next slice of behavior. It runs the focused tests from the Impact section and the type check, not the full suite. It updates the docs, log, changelog and register row, and `npm run docs:check` passes.

Then two reviews:

- `/code-review` against `origin/main`: one sub-agent checks the diff against coding standards (and a baseline of code smells), another checks it against the issue. They report separately.
- A fresh adversarial reviewer with `adversarial-review.md` hunts for ways to break it: empty runs, a column name containing a comma, a run deleted mid-export.

The comma case is real: the agent writes a failing test, fixes the quoting, and reruns the tests. It rejects one finding (a style preference) and writes down why.

### Stop 1

The agent reports what changed, the checks it ran (focused: 3 test files, type check; full suite not run), the review findings fixed and rejected, and known limits. It asks: **"Ready to create the PR?"** and waits.

### Step 6. PR and Codex review

You say yes. The agent rebases on `origin/main`, pushes, and opens the PR from the template: summary, evidence, review outcome, merge danger ("two-way door; affects the reports page only"), `Closes #14`. With Codex review on, it waits with `wait-codex-review.mjs`, answers or fixes every finding in its thread, and asks for another review when it pushed fixes.

### Stop 2

The agent reports the PR link, how each Codex finding was resolved, and that the PR is mergeable. It asks: **"Ready to merge?"** and waits.

### Step 7. Merge: `finish.mjs`

You say yes. `node scripts/issue/finish.mjs <PR>` squash-merges, deletes the remote branch, removes the claim labels, fast-forwards your main checkout and removes the worktree and its branch. GitHub closes issue 14 through `Closes #14`, which unblocks 15 and 16.

### Step 8. Improve: `/retro`, then `/retro-to-docs`

After a few merged issues, run `/retro`. Suppose it notices that agents twice forgot to quote CSV fields. It suggests an automated check, not a prose rule. `/retro-to-docs` turns your accepted items into a lint rule or test, a new row in `review-risks.md`, or a new issue, and logs the decisions.

---

## 7. Parallel work

The full rules are in [docs/agents/parallel-work.md](docs/agents/parallel-work.md). The reasoning:

- **Claims prevent double work.** Two agents picking the same issue waste a session each and produce two conflicting branches. The `in progress` and `agent: …` labels plus a branch comment make ownership visible on GitHub, where both agents look.
- **Blockers and conflicts are different.** "15 needs 14's code" is a dependency: 15 cannot even start. "15 and 16 rewrite the same function" is a conflict: either can go first, not both at once. Mixing them up either serializes everything or produces painful merges. `/to-tickets` writes blockers; `/new-issue` writes conflicts into the Impact section; `start.mjs` enforces both.
- **The schema lock.** Two branches that each bump the saved-file format to "version 42" both pass their tests and break each other on merge. So only one schema-changing issue is in progress at a time, and the version number is taken from the default branch when merging, not when starting.
- **Impact is an estimate.** It is written from reading the code before work starts. The implementer corrects it, and the correction helps the next person decide what can run in parallel.
- **Generated and shared files conflict often.** Logs, changelogs, receipts and indexes change in almost every branch. Resolve by keeping both entries and regenerating; a hand-merged generated file is wrong in ways no one notices.
- **Overrides are explicit.** `--force` exists for when you decide two issues can overlap after all. The claim comment records that you approved it.

---

## 8. Reviews

Four layers, cheapest first. Each catches what the others miss.

| Layer | Who | Catches |
| --- | --- | --- |
| Tests written first (`/tdd`) | The implementing agent | Behavior that does not match the agreed interface; regressions |
| `/code-review` | Two fresh sub-agents: **Standards** and **Spec** | Violations of documented standards and common code smells; missing, partial or unrequested behavior versus the issue |
| Adversarial review | A fresh reviewer with no access to the implementer's reasoning | Inputs and states that break the change; data loss; security; tests that cannot fail |
| Codex GitHub review (optional) | A different model, on the PR | A second opinion from a different model family |

How to handle a finding:

1. **Confirm it against the code.** Reviewers are sometimes wrong, and sometimes right for the wrong reason.
2. **If it is real, prove it:** write a test that fails because of it, then fix it.
3. **If you reject it, say why** in writing: in the stop report, or as a reply in the PR thread. Never ignore a finding silently.
4. **Limit the loops.** At most two adversarial passes and three Codex rounds; after that, the user decides what is left.

Why fresh reviewers? An implementer who reviews their own diff shares its blind spots. A reviewer that only sees the diff has the least context pressure, which also makes it the right place to enforce coding standards, rather than loading every standard into the implementer's context.

---

## 9. Verification and honest reporting

The cadence is in [docs/agents/verification.md](docs/agents/verification.md). The principle: test enough to trust the change, and say exactly what you tested.

- **Focused checks** for most changes: the type check or build, plus the tests named in the issue's Impact section and the ones you add.
- **Regression groups** for risky areas: a named set of tests for each part of the system where small changes break distant things (file formats, import and export, pagination, billing). You list them during setup and add to them after retros.
- **The full suite** at checkpoints: before a release, after several batches, or when something suggests a wider regression. Running it after every tweak trains everyone to ignore its output and makes batches slow.
- **The distributable** is built once per ready batch.

Reporting rules, in the changelog, log, PR and register:

- Name each command and its result.
- Say "focused" or "full suite".
- Say what was **not** run and why ("no application code changed, so the app was not rebuilt").
- Never write that a check passed if it did not run in this batch. "Should pass" is not evidence.

---

## 10. The documentation system

Optional module, on by default. Details: [docs/SPEC.md](docs/SPEC.md) and [docs/documentation-sync.md](docs/documentation-sync.md).

**Format.** Docs follow [Open Knowledge Format v0.2](docs/references/okf-spec.md): Markdown files with YAML frontmatter, in the repository, readable with nothing but a text editor. This project requires `type`, `title`, `description`, `status`, `owner`, `generated`, `tracks` and `sources`.

**Tracking.** `tracks` lists the source files or folders a document describes. `npm run docs:check` fingerprints them. When any of them changes, or the document itself changes, the check fails until someone reviews the document and runs:

```sh
npm run docs:ack -- docs/<doc>.md --by claude/opus-5.5 --note "What I checked and what changed"
```

The receipt is a record that a review happened, not proof that the prose is right. There is no `--all`: acknowledging documents you did not read only hides drift.

**Indexes.** `npm run docs:sync` regenerates `docs/index.md` and each folder's index from the frontmatter, so navigation never goes stale.

**Two histories.**

| File | Audience | Content |
| --- | --- | --- |
| `changelog.md` | Anyone skimming | Newest first; what changed by area; one verification line |
| `docs/log.md` | Future maintainers and agents | Dated detail: implementation state, every check run, open decisions, known gaps |

**Build gate.** Add `npm run docs:check` to your build or check command, so stale docs stop a build within seconds.

**Bilingual manuals (optional).** If your product has in-app Help in more than one language, keep the text in `docs/help-content.json` and generate `docs/manual-<lang>.md` with `node scripts/docs/manuals.mjs`. The generator refuses missing translations, and `--check` catches stale manuals. Keep interface language, Help language and content language independent, and test right-to-left languages separately for layout and fonts before enabling them.

---

## 11. Labels

Created by `node scripts/github/bootstrap-labels.mjs` from `scripts/github/labels.json`. Safe to rerun; `--dry-run` previews; `--create-only` never changes existing labels.

| Group | Labels | Purpose |
| --- | --- | --- |
| Priority | `P0`, `P1`, `P2` | Launch blocker, next, later |
| Area | `area: <name>` | Product area, for filtering and planning |
| Conflict filter | `touches: <subsystem>`, always `touches: schema` | Spot overlap before starting; schema lock |
| Claims | `in progress`, `agent: claude`, `agent: codex` | Who is working on what |
| Triage (Matt Pocock's roles) | `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` | Used by `/triage`, `/to-spec`, `/to-tickets` |
| Gates | `needs owner decision`, `needs external acceptance` | Work that tests alone cannot close |
| Spec | `spec` | Umbrella spec issues from `/to-spec` |

---

## 12. Adopting in an existing repository

1. Create a branch: `git checkout -b chore/agent-workflow`.
2. Copy in the template's files: `AGENTS.md` (if you have none), `.agents/`, `.github/ISSUE_TEMPLATE/ticket.md` and `pull_request_template.md`, `scripts/`, `docs/` (merge with an existing `docs/` folder), `template.config.json`, `GLOSSARY.md`, `changelog.md` (if you have none), `PLAYBOOK.md`, `NOTICE`. Add the `docs:*` and `test:tools` scripts and the `js-yaml` dependency to your `package.json` (create a tools-only one if your project is not Node).
3. Create the links: `ln -s AGENTS.md CLAUDE.md` (only if `CLAUDE.md` does not exist yet; otherwise let `/project-setup` merge them) and `mkdir -p .claude && ln -s ../.agents/skills .claude/skills`.
4. Run `/project-setup`. It detects an existing project, merges your agent rules instead of replacing them, recommends `--create-only` for labels, and adds your real source folders to the docs tool's tracked roots.
5. Backfill the register only for open work you want tracked: create issues with `/new-issue` (or mirror existing issues by adding IDs to their titles and rows to the register). Do not invent history.
6. Open a PR for the setup itself and merge it the usual way.

---

## 13. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `gh: command not found` or `HTTP 401` | Install the GitHub CLI and run `gh auth login`; check `gh auth status` |
| `Not started: blocked by open issue #n` | Finish or close the blocker first. `--force` only if you decide the dependency is not real |
| `Not started: conflicts with in-progress #n` | Wait for #n, or approve the overlap and pass `--force`; rebase carefully afterwards |
| `Orca is enabled … but not installed; using a plain git worktree` | Expected without Orca. Set `"orca": false` in `template.config.json` to silence it |
| `Orca has no repo registered at …` | `orca repo add --path <main checkout>`, or set `"orca": false` |
| `Orca is not available (…); using a plain git worktree` | Orca is not running: `orca open`, then check `orca status`. The issue already started in a git worktree; that is fine |
| Label dry run says `No repository access` | The repository has no GitHub remote yet: `gh repo create <owner>/<name> --private --source . --push`, then rerun |
| Worktree setup is slow | Lockfiles differ from the main checkout, so it runs the install command. Pull `main` in the main checkout first |
| Codex waiter returns `timeout` | The Codex GitHub app is not reviewing this repository. Enable it, or set `"codexReview": false` |
| `index is stale; run npm run docs:sync` | Run it; commit the regenerated indexes |
| `document or tracked inputs changed` | Read the document against the change, fix the prose if needed, then `docs:ack` it with a real note |
| `broken local link` | Fix the link; the check covers `docs/`, `AGENTS.md`, `README.md`, `PLAYBOOK.md`, `GLOSSARY.md` and `changelog.md` |
| Merge conflict in `docs/log.md`, `changelog.md` or `.sync-state.json` | Keep both sides, run `npm run docs:sync`, re-acknowledge only what you reviewed |
| `finish.mjs` says the main checkout was not fast-forwarded | The main checkout has local changes or is on another branch; pull there by hand |
| A skill says to run `/retro` or `/setup-matt-pocock-skills` but nothing happens | User-invoked skills only run when you type them; type the command yourself |

---

## 14. Lessons learned

This workflow was first built for a desktop application developed by one owner with Claude and Codex working dozens of GitHub issues in parallel. These are the lessons that shaped the rules:

- **Agents will happily mark docs reviewed to turn a check green.** Hence named, reasoned acknowledgments, no bulk mode, and a rule against acknowledging unread documents.
- **"Tests pass" without a command is not a fact.** Records now name commands and distinguish focused checks from full runs, and say what was not run.
- **Running the full suite after every tweak slowed everything and taught everyone to skim failures.** Proportionate verification with regression groups replaced it.
- **Two schema changes in parallel produce the same version number twice.** Hence the schema lock and "take the version at merge time".
- **Generated files merged by hand were silently wrong.** Hence "keep both entries, regenerate".
- **Impact estimates were wrong surprisingly often.** Hence "verify against the code and correct the issue".
- **A private repository without enforced branch protection has no gate but your rules.** Hence the two stops written as hard rules, repeated in the skills.
- **One rule file per agent drifts.** Hence `CLAUDE.md` as a link to `AGENTS.md`, and one skills folder linked for both.
- **Evaluating a paid tool is not deciding to adopt it.** Hence the dependency policy's "evaluation is not adoption".
- **Big rule files get skimmed.** Hence a short `AGENTS.md` with pointers, and Matt Pocock's advice to push standards to the reviewer and mechanical rules into automated checks.

---

## 15. Customizing

- **Add a review risk** whenever a bug class slips through: a row in `docs/agents/review-risks.md`.
- **Add a regression group** for each fragile area: a row in `docs/agents/verification.md`.
- **Add a subsystem** to `touches` in `scripts/github/labels.json` and rerun the label script.
- **Track only folders you own.** Matt Pocock's skills install into the same `.agents/skills/` folder as ours. Docs should track our skill folders by name, never the whole folder, or every `npx skills update` shows up as drift.
- **Add canonical documents** under `docs/` with frontmatter and `tracks`, then `docs:sync` and `docs:ack`. List them in the sources-of-truth table in `docs/SPEC.md`.
- **Add CI later:** a job that runs `npm ci && npm run test:tools && npm run docs:check` is a fast first gate.
- **Change the stops:** do not remove them. If you want fewer interruptions, batch several small issues into one PR rather than letting agents merge alone.
- **Keep up with Matt Pocock's skills:** run `node scripts/setup/upstream.mjs` after updating them; it fails if a skill this template calls was renamed or deprecated upstream. Update the skills and docs that name it.
- **Different tracker:** Matt's setup supports local Markdown files and GitLab; our scripts assume GitHub. Swap `gh` calls in `scripts/issue/start.mjs` and `finish.mjs` if you move.

---

## 16. Glossary of the method

| Term | Meaning |
| --- | --- |
| Grilling | An interview in which the agent asks one question at a time, with a recommended answer, until every branch of the design is settled |
| Glossary | `GLOSSARY.md`: the project's canonical terms and the synonyms to avoid |
| ADR | Architecture decision record: a short note for a decision that is hard to reverse, surprising and a real trade-off |
| Spec | The umbrella issue from `/to-spec`: problem, solution, user stories, decisions, testing decisions, out of scope |
| Vertical slice / tracer bullet | A ticket that cuts through every layer and is demoable alone |
| Seam | The interface at which a feature is tested; prefer few, high, existing seams |
| Register ID | `PREFIX-NNN`: the stable identifier of a piece of work |
| Impact section | Likely files, focused tests, schema risk, hotspots, `touches:` and conflicts for one issue |
| Blocker | An issue that must close before another can start |
| Conflict | Issues that must not be in progress at the same time |
| Frontier | Open tickets whose blockers are all closed |
| Claim | `in progress` + `agent: …` labels and a branch comment |
| Schema lock | At most one in-progress issue changing a persisted format |
| Focused verification | The checks relevant to a change, as opposed to the full suite |
| Regression group | The named tests guarding one fragile area |
| Stop | A point where the agent must wait for the user's explicit authorization |
| Receipt | A recorded review of a document after its tracked sources changed |
| Drift | A document whose tracked sources changed since its last receipt |
| Merge danger | Whether a change is a one-way or two-way door, and its blast radius |

---

## 17. Credits

- **Matt Pocock**, [Skills For Real Engineers](https://github.com/mattpocock/skills) (MIT): the alignment, spec, ticket, TDD, code review, PR and retro skills this workflow calls by name. Install them from his repository; they are not copied here.
- **Open Knowledge Format v0.2** (Apache-2.0), from [GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog): the documentation format. A pinned copy and its license are in `docs/references/`.
- **Orca** by Stably ([stablyai/orca](https://github.com/stablyai/orca)): optional worktree and agent management.
- The rest of the template is MIT licensed; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
