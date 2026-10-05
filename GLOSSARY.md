# Glossary

The project's shared language. `/grill-with-docs` (through Matt Pocock's `domain-modeling` skill) adds terms here as they are resolved, in the format that skill defines. Use these terms in code, issues, tests and conversation; avoid the synonyms they replace. This file holds definitions only, never implementation details.

## Product terms

_None yet. Run `/grill-with-docs` on your first feature._

## Workflow terms

These come with the template and describe how work moves.

- **Register ID**: the stable `{{ID_PREFIX}}-NNN` identifier of a piece of work. Never reused or renumbered.
- **Impact section**: the part of an issue listing likely files, focused tests, schema risk, shared hotspots, `touches:` labels and conflicting issues. An estimate the implementer corrects.
- **Blocker**: an issue that must be closed before another can start (dependency).
- **Conflict**: an issue that must not be *in progress* at the same time as another, because both edit the same hotspot.
- **Claim**: the `in progress` and `agent: …` labels plus a comment naming the branch.
- **Schema lock**: at most one in-progress issue may change a persisted format or contract.
- **Frontier**: the open tickets whose blockers are all closed; work can start on any of them.
- **Stop**: a point where the agent must wait for the user's explicit authorization (creating the PR, merging it).
- **Focused verification**: the specific tests and checks relevant to a change, as opposed to the full suite.
- **Receipt**: a recorded review of a document after its tracked sources changed. Not proof that the prose is correct.
- **Drift**: a document whose tracked sources changed since its last receipt.
