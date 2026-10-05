---
type: "Issue Register"
title: "Issue register"
description: "Stable {{ID_PREFIX}}- IDs, statuses and completion criteria for tracked work, mirrored to GitHub issues."
status: "stable"
owner: "{{DOC_OWNER}}"
generated: {"by": "claude/opus-5.5", "at": "2026-10-05T20:00:00+00:00"}
tracks: []
sources: [{"resource": "agents/lifecycle.md"}]
---
# Issue register

Optional module. The register gives every piece of tracked work a **stable ID** (`{{ID_PREFIX}}-001`, `{{ID_PREFIX}}-002`, …) that survives renamed titles, moved trackers and closed issues. GitHub issue numbers are the working handle; the register is the long-lived record. Each GitHub issue title starts with its ID.

## Rules

- Next ID = highest existing number + 1. Never reuse or renumber an ID. Append; never delete rows.
- Statuses: `Open`, `In progress`, `Blocked` (with the specific reason), `Done`, `Deferred`, `Unapproved`.
- Mark `Done` only with linked evidence: the merged PR, the verification actually run, and the docs/Help review.
- Expert, hardware or customer acceptance needs real evidence; tests cannot close it (label `needs external acceptance`).
- Priorities: `P0` launch blocker, `P1` next, `P2` later. A priority is not a promise of a date.
- Adding a row is the one change committed directly to the default branch (see [parallel work](agents/parallel-work.md)). Status changes arrive with the implementing pull request.

Current totals: **0 issues = 0 Open / 0 Done**.

## Issues

| ID | Status | Work | Completion criteria | Priority | GitHub |
| --- | --- | --- | --- | --- | --- |

<!-- Example row:
| {{ID_PREFIX}}-001 | Open | Export reports as CSV | A user can download any report as CSV with headers; large reports stream; covered by an export test. | P1 | #12 |
-->

## History

- 2026-10-05: Register created from the agent project template.
