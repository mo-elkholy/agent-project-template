---
name: new-issue
description: "Turn an agreed feature idea, or tickets just created by /to-tickets, into register-tracked GitHub issues with stable IDs, an Impact section and labels for parallel agents. Use when the user says \"make this a ticket\", \"create an issue\", \"add IDs and impact to these tickets\" or after /to-tickets."
---

# Create or enrich issues

Step 3 of `docs/agents/lifecycle.md`. Only after the user and agent agree on the work; if scope is still open, suggest `/grill-with-docs` first. Use `GLOSSARY.md` vocabulary in titles and bodies, and flag any conflict with an ADR.

There are two modes:

- **Single idea:** one agreed feature becomes one issue.
- **Enrich tickets:** `/to-tickets` already created vertical-slice issues with `What to build`, `Acceptance criteria` and `Blocked by`. Keep all of that, including GitHub's native blocking links, and add what parallel work needs. Get the list from the user or from the spec issue's sub-issues.

## 1. Draft and confirm

For each issue: title `<PREFIX>-NNN: <short imperative>` (prefix from `template.config.json` `idPrefix`), the work, completion criteria, priority (`P0`/`P1`/`P2`) and area. Show the drafts; create nothing until the user agrees.

## 2. Assign IDs

Next ID = highest `<PREFIX>-` number in `docs/issue-register.md` + 1, in dependency order (blockers first). Never reuse or renumber. Without the register module, the ID is `#<issue number>` and the title has no prefix.

## 3. Map impact from the code

Explore the code (a read-only sub-agent helps for several issues). For each issue:

- **Likely files:** only paths that exist today (check each).
- **Focused tests:** the unit and end-to-end tests to run; name new ones to add.
- **Schema change:** yes / likely / no, naming the persisted format.
- **Shared hotspots:** files many issues edit.
- **Touches:** `touches: …` labels from `scripts/github/labels.json`. Add a new subsystem there and run `bootstrap-labels.mjs` if needed.
- **Do not run in parallel with:** open issues that edit the same hotspot (`gh issue list --label "touches: <x>" --state open`). This is a conflict, not a dependency; dependencies stay in `Blocked by`.

The Impact section is an estimate. The implementer corrects it.

## 4. Create or update the GitHub issues

Body sections, in order, following `.github/ISSUE_TEMPLATE/ticket.md`: header line (register ID, priority, area), `## What to build`, `## Acceptance criteria`, `## Blocked by`, `## Impact`, `## Working rules`. Write bodies with a heredoc or `--body-file`.

- New: `gh issue create --title ... --body-file ... --label ...`.
- Enriching: `gh issue edit <n> --title ... --body-file ...`, keeping the existing text and links.

Labels: priority, `area: …`, `touches: …`, `ready-for-agent` when fully specified (Matt's triage role), `needs owner decision` or `needs external acceptance` where they apply. For a new dependency, add a native blocking link (`gh api --method POST repos/<owner>/<repo>/issues/<n>/dependencies/blocked_by -F issue_id=<blocker database id>`; get the id with `gh api repos/<owner>/<repo>/issues/<blocker> --jq .id`) or fall back to the `Blocked by` section.

## 5. Record in the register

This is the only direct commit to the default branch the lifecycle allows. On an up-to-date `main`: add one row per issue to `docs/issue-register.md` with its GitHub link, update the totals and history, add `docs/log.md` and `changelog.md` entries, run `npm run docs:sync`, `npm run docs:check` and `npm run docs:ack` for the documents you reviewed. Commit `docs: add <PREFIX>-NNN (#n)` and push.

## 6. Report

List each issue number, ID, link, labels, blockers and conflicts. Do not start implementation; the user starts it with "work on issue N".
