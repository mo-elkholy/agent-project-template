// Integration test: start.mjs end to end without Orca, against a real git
// repository and a stub `gh` on PATH that answers from fixture JSON.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function setup(t, { issues, inProgress = [], orca = false, orcaStub = null }) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "start-")));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const origin = path.join(tmp, "origin.git");
  const main = path.join(tmp, "app");
  git(tmp, "init", "-q", "--bare", origin);
  git(tmp, "init", "-q", main);
  git(main, "symbolic-ref", "HEAD", "refs/heads/main");
  fs.mkdirSync(path.join(main, "scripts"), { recursive: true });
  fs.cpSync(path.join(here, ".."), path.join(main, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(main, "template.config.json"), JSON.stringify({
    configured: true, idPrefix: "ACME", branchPrefix: "me", defaultBranch: "main", orca,
  }));
  git(main, "add", "-A");
  git(main, "-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-qm", "init");
  git(main, "remote", "add", "origin", origin);
  git(main, "push", "-q", "origin", "main");

  const bin = path.join(tmp, "bin");
  fs.mkdirSync(bin);
  const log = path.join(tmp, "gh.log");
  fs.writeFileSync(path.join(tmp, "fixture.json"), JSON.stringify({ issues, inProgress }));
  fs.writeFileSync(path.join(bin, "gh"), `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + "\\n");
const f = JSON.parse(fs.readFileSync(${JSON.stringify(path.join(tmp, "fixture.json"))}, "utf8"));
if (args[0] === "issue" && args[1] === "view") { process.stdout.write(JSON.stringify(f.issues[args[2]])); process.exit(0); }
if (args[0] === "issue" && args[1] === "list") { process.stdout.write(JSON.stringify(f.inProgress)); process.exit(0); }
if (args[0] === "repo") { process.stdout.write(JSON.stringify({ nameWithOwner: "example/app" })); process.exit(0); }
if (args[0] === "api") { process.stderr.write("dependencies not enabled"); process.exit(1); }
process.exit(0);
`, { mode: 0o755 });
  if (orcaStub) fs.writeFileSync(path.join(bin, "orca"), orcaStub, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const start = (...args) => {
    const r = spawnSync("node", ["scripts/issue/start.mjs", ...args], { cwd: main, env, encoding: "utf8" });
    return { code: r.status, out: r.stdout, err: r.stderr };
  };
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
  return { tmp, main, start, calls };
}

const issue = (number, extra = {}) => ({ number, title: `ACME-00${number}: Export small runs as CSV`, state: "OPEN", labels: [], body: "", ...extra });

test("without Orca, creates a sibling git worktree, claims the issue and prints the launch command", (t) => {
  const { tmp, main, start, calls } = setup(t, { issues: { 4: issue(4) } });
  const dry = start("4", "claude", "--dry-run");
  assert.equal(dry.code, 0);
  const plan = JSON.parse(dry.out);
  assert.equal(plan.kind, "git");
  assert.equal(plan.branch, "me/acme-004-export-small-runs-csv");
  assert(!fs.existsSync(path.join(tmp, "app-worktrees")), "dry run must not create anything");

  const real = start("4", "claude");
  assert.equal(real.code, 0, real.err);
  const result = JSON.parse(real.out);
  const wt = path.join(tmp, "app-worktrees", "acme-004-export-small-runs-csv");
  assert.equal(result.worktree, wt);
  assert.equal(git(wt, "branch", "--show-current"), "me/acme-004-export-small-runs-csv");
  assert.equal(git(wt, "rev-parse", "HEAD"), git(main, "rev-parse", "origin/main"));
  assert.match(result.launch, /claude ".*implement-issue/);
  assert(calls().some((c) => c.join(" ") === "issue edit 4 --add-label in progress --add-label agent: claude"));
  assert(calls().some((c) => c[0] === "issue" && c[1] === "comment" && c[2] === "4"));
});

test("refuses an issue with an open blocker and creates nothing", (t) => {
  const { tmp, start, calls } = setup(t, {
    issues: { 5: issue(5, { body: "## Blocked by\n\n- #4\n" }), 4: issue(4) },
  });
  const r = start("5", "codex");
  assert.equal(r.code, 1);
  assert.match(r.err, /blocked by open issue #4/);
  assert(!fs.existsSync(path.join(tmp, "app-worktrees")));
  assert(!calls().some((c) => c[1] === "edit"));
});

test("--force cannot override an already claimed issue", (t) => {
  const { start } = setup(t, { issues: { 6: issue(6, { labels: [{ name: "in progress" }] }) } });
  const r = start("6", "claude", "--force");
  assert.equal(r.code, 1);
  assert.match(r.err, /already claimed/);
});

test("falls back to a git worktree when Orca is enabled but not running", (t) => {
  const { tmp, start } = setup(t, {
    issues: { 4: issue(4) },
    orca: true,
    orcaStub: "#!/bin/sh\necho 'Orca runtime is not reachable' >&2\nexit 1\n",
  });
  const r = start("4", "claude");
  assert.equal(r.code, 0, r.err);
  assert.equal(JSON.parse(r.out).kind, "git");
  assert.match(r.err, /Orca is not available \(Orca runtime is not reachable\); using a plain git worktree/);
  assert(fs.existsSync(path.join(tmp, "app-worktrees", "acme-004-export-small-runs-csv")));
});
