---
type: "Agent Rules"
title: "Verification cadence"
description: "How much to test for each kind of change, and how to report what was actually verified."
status: "stable"
owner: "{{DOC_OWNER}}"
generated: {"by": "claude/opus-5.5", "at": "2026-10-05T20:00:00+00:00"}
tracks: ["package.json"]
sources: [{"resource": "../../AGENTS.md"}]
---
# Verification cadence

Testing is proportionate: enough to trust the change, not a ritual. The cost of over-testing is real (slow batches, ignored output); the cost of under-testing is worse (shipped regressions). These rules set the default. The owner can change them; record changes here with a date.

## Default rules

- Work in small, coherent feature batches. Do not pile unrelated changes on top of unverified ones.
- For routine changes, run the type check or build and the smallest relevant tests (or a visual smoke check for UI). Do not run the full suite after every tweak.
- For risky areas, run the **regression group** for that area (table below) in addition to focused tests.
- Run the **full suite** at release checkpoints, after several completed batches, or when there is concrete evidence of a wider regression. Never run it automatically for every change.
- During diagnosis, rerun only the affected checks. After fixing an isolated failure, rerun the affected checks; widen only when the cause or remaining uncertainty warrants it.
- Group closely related fixes into one review and one package build. Avoid repeated broad reviews for cosmetic adjustments.
- Build the distributable once per ready batch, not per change.
- Never weaken data-integrity or security checks to save time.

These rules take precedence over any skill's generic instruction to run the full suite for every increment.

## Commands

Fill these in during `/project-setup`. Agents use these exact commands.

| Purpose | Command |
| --- | --- |
| Type check / build | `npm run build` |
| Focused unit test (one file) | `npm test -- <file>` |
| Full suite | `npm test` |
| Docs gate | `npm run docs:check` |
| Workflow tooling tests | `npm run test:tools` |

## Regression groups

Areas where a small change often breaks something far away. List each risky area, the tests that guard it, and when to run them.

| Area | Run when you change | Tests |
| --- | --- | --- |
| _example: data format_ | _the saved file format or migrations_ | _`tests/migration.test.ts`, `tests/roundtrip.test.ts`_ |

## Reporting

- Record what changed and what was verified in the changelog, the log, the PR and the issue.
- Distinguish **focused verification** from a **full-suite pass**. Name the commands and their results.
- Never claim a check passed that was not run. "Should pass" is not evidence.
- If a check fails, say so with the output, even when the failure looks unrelated.
