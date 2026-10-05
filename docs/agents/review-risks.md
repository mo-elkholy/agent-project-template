---
type: "Agent Rules"
title: "Review risks"
description: "The checklist the adversarial reviewer uses to try to break a change, plus project-specific risks."
status: "stable"
owner: "{{DOC_OWNER}}"
generated: {"by": "claude/opus-5.5", "at": "2026-10-05T20:00:00+00:00"}
tracks: [".agents/skills/implement-issue"]
sources: [{"resource": "../../.agents/skills/implement-issue/adversarial-review.md"}]
---
# Review risks

The adversarial reviewer reads this file. Its job is to **break** the change, not approve it. Matt Pocock's `/code-review` separately checks coding standards and spec fidelity; this list covers what a hostile reader of the diff should hunt for.

## Generic risks

1. **Completion criteria:** does the change meet every criterion in the issue? Is anything claimed but not implemented?
2. **Correctness:** edge cases, error paths, races, undo/redo, cancellation, stale state, empty and huge inputs.
3. **Data integrity:** silent loss or corruption on import, save, migration or export. Where a persisted format changed: is the version bumped, with a migration, and do older builds refuse newer files instead of corrupting them? Do recovery and autosave still work?
4. **Output and compatibility:** do existing outputs (files, APIs, rendered pages) stay the same where they should?
5. **Tests:** do the tests exercise the change? Look for missing negative cases, assertions too weak to fail, and tests that would pass on the old code.
6. **Project rules:** dependency policy respected; docs, Help topics, log and changelog updated; no claims of verification that was not run.
7. **Security:** input validation, path handling, injection, unsafe HTML, secrets in code or logs, privilege boundaries.
8. **Localization and accessibility** (when the project has a UI): text direction, translations kept in sync, keyboard access, contrast.

## Project-specific risks

`/project-setup` seeds this table; add a row whenever a review or retro finds a class of bug worth hunting every time.

| Risk | What to check | Added |
| --- | --- | --- |
| _example: saved-file compatibility_ | _Old files open; new fields have defaults_ | _2026-10-05_ |
