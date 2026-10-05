---
name: implement-issue
description: "Implement a GitHub issue inside its worktree: setup, test-driven build, focused verification, docs, two-axis code review plus adversarial review, then the PR, optional Codex review and the authorized merge and cleanup. Use when handed \"Implement GitHub issue #N\" or asked to continue, open the PR for, or merge an issue branch."
---

# Implement an issue

Steps 5–7 of `docs/agents/lifecycle.md`. You own the issue until the merge or until the user takes it back. There are **two hard stops** that need the user's explicit authorization: creating the PR, and merging it. Nothing else needs approval unless `AGENTS.md` says so.

If Orca is in use, keep the Orca card current at each checkpoint (`orca worktree set --worktree active --comment "<status>" --json`; failures there are not errors).

## 1. Set up and understand

- Run `scripts/issue/setup-worktree.sh`.
- Read `gh issue view <N> --comments`, `AGENTS.md`, `GLOSSARY.md`, ADRs in the area, the parent spec issue if any, and the docs the issue links.
- The Impact section is an estimate: verify it against the code and correct the issue body when it is wrong.
- If the issue is ambiguous, or its scope conflicts with the code, docs or an ADR, ask the user before building.

## 2. Build and verify

- Agree the test seams if the spec did not: prefer existing seams, as high as possible, as few as possible.
- Build one vertical slice at a time with `/tdd` (red, green, refactor). Commit small, coherent steps.
- Verify per `docs/agents/verification.md`: the type check, the Impact section's focused tests and the ones you add, and regression groups for risky areas. Do not run the full suite unless that document calls for it.
- Update the docs the change affects, Help topics in every language (if the manuals module is on), `docs/log.md`, `changelog.md`, and the register row (status and evidence; link the PR once it exists). `npm run docs:check` must pass; acknowledge only documents you reviewed.
- For a schema change, take the next format or migration version from current `origin/main` (`git fetch && git rebase origin/main` first).

## 3. Review before any PR

Run both reviews; neither replaces the other.

1. **`/code-review`** against `origin/main`: Matt Pocock's two-axis review (Standards, and Spec against the issue) in separate sub-agents.
2. **Adversarial review**: spawn a **fresh** reviewer with none of your reasoning (Claude: the Agent tool; Codex: a sub-agent, or `codex exec --sandbox read-only "<prompt>"`). Use [adversarial-review.md](adversarial-review.md) with the issue number filled in.

For every finding: confirm it against the code. Fix it if it is real, with a test that fails first. If you reject it, write down why. Re-run the affected checks. If the fixes were substantial, run one more adversarial pass on the new diff. At most two passes; after that, raise what is left with the user.

## 4. Stop 1: ready for PR

Report and **wait**:

- what changed, by area;
- the checks you actually ran and their results, focused versus full;
- review findings: what you fixed, what you rejected and why;
- known limits, and any change to the Impact estimate.

Ask: "Ready to create the PR?"

## 5. PR and review (after the user authorizes)

```sh
git fetch origin && git rebase origin/main   # resolve conflicts per docs/agents/parallel-work.md, re-run affected checks
git push -u origin HEAD
gh pr create --title "<issue title>" --body-file <file following .github/pull_request_template.md, ending with Closes #N>
```

Shape the body like Matt Pocock's `pr` skill: the smallest summary that makes the change clear, evidence that it works, and the merge danger (one-way or two-way door, blast radius).

If `template.config.json` has `"codexReview": true`:

```sh
node scripts/issue/wait-codex-review.mjs <PR>
```

- It can take up to 45 minutes. Claude runs it with `run_in_background`; Codex runs it in the foreground with a long timeout. After 10 minutes without a response it posts `@codex review` itself.
- **`clean`:** Codex reacted 👍 with no findings.
- **`review`:** confirm each finding against the code, fix the real ones, and reply in each thread with the fix commit or your reason for rejecting it. Never ignore a finding silently. Push, comment `@codex review`, then run the waiter again with `--since <time of that comment>`. At most three rounds; then report what is left.
- **`timeout`:** tell the user; the Codex GitHub app may not be enabled for this repository.

## 6. Stop 2: ready to merge

Report the PR link, each review finding and how it was resolved, the final verification, and that the PR is mergeable. Ask: "Ready to merge?" and **wait**.

## 7. Merge and clean up (after the user authorizes)

Confirm `gh pr view <PR> --json mergeable,statusCheckRollup` is clean. Give your final report, then run as the very last command:

```sh
node scripts/issue/finish.mjs <PR>
```

It squash-merges, deletes the remote branch, clears the claim labels (GitHub closes the issue through `Closes #N`), fast-forwards the main checkout and removes this worktree and its branch. Removing the worktree ends this session.

## If you stop before finishing

Remove the claim (`gh issue edit <N> --remove-label "in progress" --remove-label "agent: <you>"`), comment where you stopped, and leave the worktree for the user to decide.
