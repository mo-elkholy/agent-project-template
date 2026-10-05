import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "setup-worktree.sh");
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function repo(t, config) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "setup-wt-")));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const main = path.join(tmp, "app");
  git(tmp, "init", "-q", main);
  fs.writeFileSync(path.join(main, "template.config.json"), JSON.stringify(config));
  fs.writeFileSync(path.join(main, "lock.txt"), "v1");
  git(main, "add", "-A");
  git(main, "commit", "-qm", "init");
  const wt = path.join(tmp, "wt");
  git(main, "worktree", "add", "-q", "-b", "feature", wt);
  return { main, wt };
}

test("runs the install command when there is nothing to copy", (t) => {
  const { wt } = repo(t, { worktreeCopy: [], lockfile: "lock.txt", installCommand: "touch installed.txt" });
  const r = spawnSync("bash", [script], { cwd: wt, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert(fs.existsSync(path.join(wt, "installed.txt")));
});

test("copies listed folders from the main checkout when lockfiles match", (t) => {
  const { main, wt } = repo(t, { worktreeCopy: ["deps"], lockfile: "lock.txt", installCommand: "touch installed.txt" });
  fs.mkdirSync(path.join(main, "deps"));
  fs.writeFileSync(path.join(main, "deps/a.js"), "dep");
  const r = spawnSync("bash", [script], { cwd: wt, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(wt, "deps/a.js"), "utf8"), "dep");
  assert(!fs.existsSync(path.join(wt, "installed.txt")));
});
