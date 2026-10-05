---
type: "Documentation Specification"
title: "Documentation specification"
description: "This project's profile of Open Knowledge Format v0.2 and its documentation ownership rules."
status: "stable"
owner: "{{DOC_OWNER}}"
generated: {"by": "claude/opus-5.5", "at": "2026-10-05T20:00:00+00:00"}
tracks: ["scripts/docs/docs.mjs", "docs/docs.config.json"]
sources: [{"id": "okf", "resource": "references/okf-spec.md"}]
---
# Documentation specification

This is the project's profile of [Open Knowledge Format v0.2](references/okf-spec.md). The upstream body is kept unchanged under `references/` with its [Apache license](references/OKF-LICENSE.txt); a recorded SHA-256 pins it. Refreshing upstream is a deliberate review, never an automatic overwrite.

## Purpose and boundary

`docs/` is the documentation bundle. Source code and tests stay authoritative for actual behavior; proposals describe intent. Start at [the index](index.md).

OKF is a representation format, not a synchronization service. This project adds a local index generator and a code-to-document drift check, described in [Documentation sync](documentation-sync.md). Documentation lives in the same Git repository as the code, so there is no separate copy to reconcile.

## Project profile

Every concept Markdown file under `docs/` has YAML frontmatter. `index.md` and `log.md` are reserved navigation and history files: the root index declares `okf_version: "0.2"`, and subdirectory indexes and logs have no frontmatter.

Maintained concepts require `type`, `title`, `description`, `status`, `owner`, `generated`, `tracks` and `sources`. Upstream OKF only requires `type`; the rest is **this project's profile**, not a change to the standard. Unknown keys are preserved. Lifecycle states are `draft`, `stable` and `deprecated`. The required keys, statuses, allowed tracked roots and folder descriptions are configured in `docs/docs.config.json`. Files other tools own (for example the `docs/agents/issue-tracker.md`, `triage-labels.md` and `domain.md` that Matt Pocock's setup writes) are listed under `ignore` and are not concepts.

```yaml
---
type: Architecture
title: Example component
description: What this component does and where its behavior is defined.
status: draft
owner: Example team
generated: { by: claude/opus-5.5, at: "2026-10-05T14:00:00Z" }
tracks: [src/example]
sources:
  - { id: implementation, resource: "../src/example/index.ts" }
---
```

`tracks` is a project extension: exact repository-relative files or directories whose changes require reconsidering the document. Directory fingerprints include file names, additions and deletions. No globs. Only source, configuration and documentation inputs belong here; never private data, credentials, logs, build outputs or dependency folders.

`generated.at` changes when prose changes meaningfully, not whenever a script runs. `generated.by` names the actual author (`claude/<model>`, `codex/<model>`, `human:<name>`, `process:<tool>`). Optional `verified` events must describe real checks against the content's sources; a link checker is not proof that a feature works. Never fabricate human approval. Optional `stale_after` takes an explicit UTC-offset timestamp; the checker warns when it passes.

A receipt in `.sync-state.json` means an actor considered the tracked changes and wrote a note. It is a change-review record, **not** an OKF verification and not proof of semantic truth. A passing syntax check must never advance receipts or mark documents verified on its own.

## Sources of truth

Adapt this table when you add canonical documents. Keep exactly one answer per question.

| Question | Canonical document |
| --- | --- |
| How do agents work in this repository? | [`AGENTS.md`](../AGENTS.md) and [docs/agents](agents/index.md) |
| What words mean what? | [`GLOSSARY.md`](../GLOSSARY.md) |
| Why was a hard-to-reverse decision made? | `docs/adr/` (created when the first ADR is needed) |
| What work is tracked, with stable IDs? | [Issue register](issue-register.md) |
| What changed, and what was verified? | [Changelog](../changelog.md) (concise) and [update log](log.md) (detailed) |
| How do docs stay synchronized? | [Documentation sync](documentation-sync.md) |

Keep current feature claims in one status document and link to it from proposals. Dated audit and change records stay dated rather than being silently rewritten. `stable` means usable documentation, not a promise that a proposed feature shipped.

## Links, provenance and history

Prefer relative Markdown links; bundle-root `/...` links also work. Links into code must stay inside the repository. External sources use URLs; the checker never fetches them.

Record a short dated entry in [the update log](log.md) for each coherent batch: what changed, its implementation state, the checks actually run, and open decisions. Never put private data, keys or customer details in docs.

A hosted documentation site, external wiki sync and automated attestation are not part of this setup. Add them only when there is a concrete need.
