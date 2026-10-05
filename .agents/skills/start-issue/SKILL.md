---
name: start-issue
description: "Start work on a GitHub issue by checking claims, blockers and conflicts, creating a worktree and branch (Orca or plain git), and handing the issue to a fresh Claude or Codex agent. Use when the user says \"work on issue N\", \"start issue N\" or \"pick up #N\"."
---

# Start an issue

Step 4 of `docs/agents/lifecycle.md`. A **full handoff**: this session creates the workspace and launches (or prepares) the implementer, then stops. It does not implement the issue.

1. Identify the issue number and the agent. If the user did not say `claude` or `codex`, ask. Do not guess.
2. From the main checkout, preview first:

   ```sh
   node scripts/issue/start.mjs <N> <claude|codex> --dry-run
   ```

   The script refuses when the issue is closed or already claimed, when a blocker is still open, when it conflicts with an in-progress issue's "Do not run in parallel with" list (either direction), or when another `touches: schema` issue is in progress. Report any refusal exactly. Add `--force` only if the user explicitly approves that specific overlap after you report it; closed or claimed issues can never be forced.
3. Run it for real without `--dry-run`. On success it has:
   - created a worktree from `origin/<default branch>` on branch `<branch prefix>/<id>-<slug>`: an Orca worktree linked to the issue when Orca is enabled and installed, otherwise a plain git worktree in `<repo>-worktrees/<name>`;
   - launched the agent through Orca with a prompt pointing at `.agents/skills/implement-issue/SKILL.md`, or printed a `launch` command for a new terminal;
   - added the `in progress` and `agent: …` labels and a claim comment.
4. Report the branch, the worktree path, and either the agent terminal handle or the launch command for the user to run. Then stop.

If Orca, `git` or `gh` fails, report the exact error. Do not improvise a different worktree mechanism without telling the user.
