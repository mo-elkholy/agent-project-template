---
name: Ticket
about: One vertical slice of work, with its Impact for parallel agents
title: "{{ID_PREFIX}}-NNN: "
labels: ["needs-triage"]
---

**Register ID:** {{ID_PREFIX}}-NNN · **Priority:** P0 / P1 / P2 · **Area:** area: …

## What to build

The end-to-end behavior this ticket makes work, from the user's point of view.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- None (can start immediately)

## Impact

- **Likely files:** paths that exist today
- **Focused tests:** unit and end-to-end tests to run
- **Schema change:** yes / likely / no (and which persisted format)
- **Shared hotspots:** files many issues edit
- **Touches:** `touches: …` labels
- **Do not run in parallel with:** #n (reason)

## Working rules

Follow `AGENTS.md`. Claim with `/start-issue`. Two stops: the user authorizes the pull request and the merge. Report focused verification in the PR and the register.
