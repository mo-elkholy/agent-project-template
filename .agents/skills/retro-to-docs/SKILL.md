---
name: retro-to-docs
description: "After a session or a batch of merged issues, run Matt Pocock's /retro and turn the improvements the user accepts into checks, rules, documentation pointers or issues, recorded in the log and changelog."
disable-model-invocation: true
---

# Retro to docs

Step 8 of `docs/agents/lifecycle.md`. Matt Pocock's `/retro` suggests improvements to the agent's environment (navigation, automated checks, coding standards, steering files, tool economy, information access), most severe first. This skill makes sure the accepted ones actually land.

1. **Run `/retro`** for the session or the range of merged PRs the user names (it is user-invoked; ask the user to type it if you cannot invoke it).
2. **Let the user choose.** Show the candidates as a numbered list with your recommendation for each: accept, defer or reject. Wait for the choice.
3. **Route each accepted item to the cheapest durable form:**
   - a mechanical mistake → an automated check (linter rule, test, pre-commit hook, CI job), never a prose rule;
   - a judgment call reviewers should enforce → `CODING_STANDARDS.md` (create it if missing) or a row in `docs/agents/review-risks.md`;
   - a hard-to-find file or hidden dependency → a navigation pointer in `AGENTS.md` or the relevant doc, kept short;
   - a recurring risky area → a regression group in `docs/agents/verification.md`;
   - a no-op or misplaced instruction in `AGENTS.md` → remove or move it;
   - anything larger than a small change → `/new-issue`.
4. **Make the small changes** on a branch, verify them (run the new check and show it catching the original mistake where possible), and update docs per `docs/documentation-sync.md`.
5. **Record** a dated `docs/log.md` entry ("Retro: …") listing accepted, deferred and rejected items with reasons, and a `changelog.md` entry for the changes made.
6. **Stop** at the usual gates: a PR and a merge each need the user's authorization.
