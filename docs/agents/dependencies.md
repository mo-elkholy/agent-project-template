---
type: "Agent Rules"
title: "Dependency policy"
description: "Optional module: no paid runtime dependencies, license checks before bundling, and evaluation is not adoption."
status: "stable"
owner: "{{DOC_OWNER}}"
generated: {"by": "claude/opus-5.5", "at": "2026-10-05T20:00:00+00:00"}
tracks: ["package.json"]
sources: [{"resource": "../../AGENTS.md"}]
---
# Dependency policy

Optional module. `/project-setup` asks whether to keep it. Edit the rules to match the owner's decision and date the change.

- **No paid runtime dependencies.** Do not adopt paid engines, paid SDKs or required hosted services for core features without the owner's explicit decision recorded here.
- **Prefer open-source libraries.** Where none fits, build and maintain a project-owned component.
- **Check licenses before bundling.** Record the license of every new runtime dependency in the pull request. Copyleft licenses (GPL, AGPL) need the owner's approval before they ship in a distributed product.
- **Evaluating is not adopting.** A local trial of a commercial tool is not authorization to integrate it. Stop an evaluation when the owner says so.
- **Pin and review.** Pin exact versions for runtime dependencies and review the changelog before upgrading major versions.

## Decisions

| Date | Decision |
| --- | --- |
| _2026-10-05_ | _Example: no paid PDF engine; use an open-source renderer._ |
