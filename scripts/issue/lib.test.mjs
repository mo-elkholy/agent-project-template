import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { parseEdges, startProblems, branchName, planWorktree } from "./lib.mjs";

test("parseEdges returns empty sets when an issue has no edge lines", () => {
  assert.deepEqual(parseEdges(""), { blockedBy: new Set(), conflicts: new Set() });
  assert.deepEqual(parseEdges(undefined), { blockedBy: new Set(), conflicts: new Set() });
});

test("parseEdges reads blocked-by and do-not-run-in-parallel lines", () => {
  const e = parseEdges("Blocked by: #3, #4\n- **Do not run in parallel with:** #7 (schema)\n## Blocked by\n- #5");
  assert.deepEqual([...e.blockedBy].sort(), [3, 4, 5]);
  assert.deepEqual([...e.conflicts], [7]);
});

test("parseEdges treats 'None' as no blockers", () => {
  assert.deepEqual([...parseEdges("## Blocked by\n\n- None (can start immediately)\n\n## Impact\n- #9 elsewhere").blockedBy], []);
});

test("startProblems reports open blockers, conflicts both ways and the schema lock", () => {
  const issue = { number: 5, state: "OPEN", labels: ["touches: schema"], body: "Do not run in parallel with: #9" };
  const inProgress = [
    { number: 9, title: "A", labels: [], body: "" },
    { number: 8, title: "B", labels: ["touches: schema"], body: "Do not run in parallel with: #5" },
  ];
  const problems = startProblems({ issue, inProgress, openBlockers: [2] });
  assert.equal(problems.length, 4);
  assert(problems.some((p) => p.includes("#2")));
  assert(problems.some((p) => p.includes("conflicts with in-progress #9")));
  assert(problems.some((p) => p.includes("conflicts with in-progress #8")));
  assert(problems.some((p) => p.includes("schema change already in progress in #8")));
});

test("startProblems refuses closed or claimed issues", () => {
  const base = { number: 5, state: "OPEN", labels: [], body: "" };
  assert.match(startProblems({ issue: { ...base, labels: ["in progress"] }, inProgress: [], openBlockers: [] })[0], /claimed/);
  assert.match(startProblems({ issue: { ...base, state: "CLOSED" }, inProgress: [], openBlockers: [] })[0], /CLOSED/);
  assert.deepEqual(startProblems({ issue: base, inProgress: [], openBlockers: [] }), []);
});

test("branchName uses the register ID and a short slug", () => {
  assert.equal(
    branchName({ title: "ACME-012: Add the CSV export for reports", number: 40, idPrefix: "ACME", branchPrefix: "me" }),
    "me/acme-012-add-csv-export-reports",
  );
  assert.equal(branchName({ title: "ACME-004: Export small runs as CSV", number: 4, idPrefix: "ACME", branchPrefix: "me" }), "me/acme-004-export-small-runs-csv");
  assert.equal(branchName({ title: "Fix login", number: 7, idPrefix: "ACME", branchPrefix: "me" }), "me/issue-7-fix-login");
  assert.equal(branchName({ title: "ACME-1: Ünïcode — only!!", number: 3, idPrefix: "ACME", branchPrefix: "" }), "acme-1-n-code-only");
});

test("planWorktree falls back to plain git worktrees beside the main checkout", () => {
  const p = planWorktree({ useOrca: false, mainPath: "/w/app", name: "acme-012-x", branch: "me/acme-012-x", base: "origin/main" });
  assert.equal(p.kind, "git");
  assert.equal(p.path, "/w/app-worktrees/acme-012-x");
  assert.deepEqual(p.commands[0], ["git", "-C", "/w/app", "worktree", "add", "-b", "me/acme-012-x", "/w/app-worktrees/acme-012-x", "origin/main"]);
  assert.equal(planWorktree({ useOrca: true, mainPath: "/w/app", name: "n", branch: "b", base: "origin/main" }).kind, "orca");
});

import { finishProblems, shellQuote } from "./lib.mjs";

test("finishProblems refuses a PR that does not belong to this worktree", () => {
  const ok = { currentBranch: "me/acme-014-x", headRefName: "me/acme-014-x", dirty: false, localHead: "abc", prHead: "abc" };
  assert.deepEqual(finishProblems(ok), []);
  assert.match(finishProblems({ ...ok, headRefName: "me/acme-016-y" })[0], /belongs to branch me\/acme-016-y/);
  assert.match(finishProblems({ ...ok, dirty: true })[0], /uncommitted changes/);
  assert.match(finishProblems({ ...ok, localHead: "def" })[0], /local HEAD def does not match the PR head abc/);
});

test("shellQuote makes untrusted text inert in a POSIX shell", () => {
  assert.equal(shellQuote("plain"), "'plain'");
  assert.equal(shellQuote("it's"), "'it'\\''s'");
  const nasty = "Fix `whoami` and $(echo INJECTED) $HOME";
  const out = execFileSync("sh", ["-c", `printf %s ${shellQuote(nasty)}`], { encoding: "utf8" });
  assert.equal(out, nasty);
});
