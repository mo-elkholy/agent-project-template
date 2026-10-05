import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "bootstrap-labels.mjs");

function withFailingGh(t) {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "gh-fail-"));
  t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
  fs.writeFileSync(path.join(bin, "gh"), "#!/bin/sh\necho 'no git remotes found' >&2\nexit 1\n", { mode: 0o755 });
  return { ...process.env, PATH: `${bin}:${process.env.PATH}` };
}
const run = (env, ...args) => {
  try { return { code: 0, out: execFileSync("node", [script, ...args], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout), err: String(e.stderr) }; }
};

test("dry run without repository access lists every label as to-create", (t) => {
  const r = run(withFailingGh(t), "--dry-run");
  assert.equal(r.code, 0, r.err);
  const plan = JSON.parse(r.out);
  assert.equal(plan.repositoryAccess, false);
  assert(plan.create.includes("ready-for-agent"));
  assert.deepEqual(plan.update, []);
});

test("a real run without repository access fails with a clear message", (t) => {
  const r = run(withFailingGh(t));
  assert.equal(r.code, 1);
  assert.match(r.err, /Cannot read labels.*no git remotes found.*gh repo create/s);
});
