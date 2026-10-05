#!/usr/bin/env node
// After the user authorizes the merge: squash-merge the PR, delete the remote
// branch, clear the claim labels, fast-forward the main checkout and remove
// this worktree and its local branch. Run from the issue worktree as the very
// last step; removing the worktree ends the session that runs in it.
// Usage: node scripts/issue/finish.mjs <pr>
import { run, hasCommand, mainCheckout, loadConfig } from "../config.mjs";

const pr = process.argv[2];
if (!/^\d+$/.test(pr ?? "")) { console.error("Usage: finish.mjs <pr>"); process.exit(2); }
const info = JSON.parse(run("gh", ["pr", "view", pr, "--json", "state,mergeable,headRefName,closingIssuesReferences,url"]));
if (info.state !== "OPEN") { console.error(`PR #${pr} is ${info.state}.`); process.exit(1); }
if (info.mergeable === "CONFLICTING") { console.error(`PR #${pr} has merge conflicts; rebase first.`); process.exit(1); }

const main = mainCheckout();
const config = loadConfig(main);
const defaultBranch = config.defaultBranch ?? "main";

run("gh", ["pr", "merge", pr, "--squash", "--delete-branch=false"]);
try { run("git", ["push", "origin", "--delete", info.headRefName]); } catch { console.error(`Remote branch ${info.headRefName} was already deleted.`); }
for (const i of info.closingIssuesReferences ?? []) {
  try { run("gh", ["issue", "edit", String(i.number), "--remove-label", "in progress", "--remove-label", "agent: claude", "--remove-label", "agent: codex"]); } catch {}
}
const here = run("git", ["rev-parse", "--show-toplevel"]);
const mainBranch = run("git", ["-C", main, "branch", "--show-current"]);
if (mainBranch === defaultBranch && !run("git", ["-C", main, "status", "--porcelain"])) run("git", ["-C", main, "pull", "--ff-only", "--quiet"]);
else console.error(`Main checkout not fast-forwarded (branch ${mainBranch} or uncommitted changes); run git pull there.`);
console.log(`Merged ${info.url}.`);
if (here === main) process.exit(0);

console.log(`Removing worktree ${here}…`);
const orcaManaged = Boolean(config.orca) && hasCommand("orca") &&
  (() => { try { return run("orca", ["worktree", "list", "--json"]).includes(JSON.stringify(here).slice(1, -1)); } catch { return false; } })();
if (orcaManaged) run("orca", ["worktree", "rm", "--worktree", `path:${here}`, "--force", "--json"]);
else {
  run("git", ["-C", main, "worktree", "remove", "--force", here]);
  try { run("git", ["-C", main, "branch", "-D", info.headRefName]); } catch {}
}
