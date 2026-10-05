// Integration test: finish.mjs must refuse to merge or delete anything unless
// the PR's branch is the one checked out here, clean and fully pushed.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function setup(t, pr) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "finish-")));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const main = path.join(tmp, "app");
  git(tmp, "init", "-q", main);
  git(main, "symbolic-ref", "HEAD", "refs/heads/main");
  fs.mkdirSync(path.join(main, "scripts"));
  fs.cpSync(path.join(here, ".."), path.join(main, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(main, "template.config.json"), JSON.stringify({ configured: true, defaultBranch: "main", orca: false }));
  git(main, "add", "-A");
  git(main, "commit", "-qm", "init");
  const wt = path.join(tmp, "app-worktrees", "acme-014-x");
  git(main, "worktree", "add", "-q", "-b", "me/acme-014-x", wt);
  const head = git(wt, "rev-parse", "HEAD");
  const bin = path.join(tmp, "bin");
  fs.mkdirSync(bin);
  const log = path.join(tmp, "gh.log");
  const info = { state: "OPEN", mergeable: "MERGEABLE", url: "https://example.invalid/pr/7", closingIssuesReferences: [], headRefName: "me/acme-014-x", headRefOid: head, ...pr };
  fs.writeFileSync(path.join(bin, "gh"), `#!/usr/bin/env node
const fs = require("fs");
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + "\\n");
if (process.argv[2] === "pr" && process.argv[3] === "view") process.stdout.write(${JSON.stringify(JSON.stringify(info))});
`, { mode: 0o755 });
  const finish = () => spawnSync("node", ["scripts/issue/finish.mjs", "7"], { cwd: wt, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: "utf8" });
  const calls = () => fs.readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  return { wt, finish, calls };
}

test("refuses to merge a PR from a different branch and keeps this worktree", (t) => {
  const { wt, finish, calls } = setup(t, { headRefName: "me/acme-016-other" });
  const r = finish();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /PR belongs to branch me\/acme-016-other/);
  assert(!calls().some((c) => c[1] === "merge"));
  assert(fs.existsSync(wt));
});

test("refuses when the worktree has uncommitted changes", (t) => {
  const { wt, finish, calls } = setup(t, {});
  fs.writeFileSync(path.join(wt, "wip.txt"), "unsaved work");
  const r = finish();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /uncommitted changes/);
  assert(!calls().some((c) => c[1] === "merge"));
  assert(fs.existsSync(path.join(wt, "wip.txt")));
});

test("refuses when local commits are not pushed to the PR", (t) => {
  const { finish, calls } = setup(t, { headRefOid: "0000000000000000000000000000000000000000" });
  const r = finish();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /does not match the PR head/);
  assert(!calls().some((c) => c[1] === "merge"));
});
