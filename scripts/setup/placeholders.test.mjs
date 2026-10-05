import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fillPlaceholders, remainingPlaceholders } from "./placeholders.mjs";

function repo(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "placeholders-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  put("AGENTS.md", "# {{PROJECT_NAME}} rules, IDs {{ID_PREFIX}}-001\n");
  put("docs/references/spec.md", "Keep {{PROJECT_NAME}} and {{ var('x') }} untouched\n");
  put("node_modules/x/README.md", "{{PROJECT_NAME}}\n");
  put("docs/other.md", "Unrelated {{ handlebars }} stays\n");
  put("logo.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x7b, 0x7b]));
  return root;
}

test("fills only known tokens, skips references, dependencies and binaries", (t) => {
  const root = repo(t);
  const changed = fillPlaceholders(root, { PROJECT_NAME: "Acme", ID_PREFIX: "ACME" });
  assert.deepEqual(changed, ["AGENTS.md"]);
  assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), "# Acme rules, IDs ACME-001\n");
  assert.match(fs.readFileSync(path.join(root, "docs/references/spec.md"), "utf8"), /\{\{PROJECT_NAME\}\}/);
  assert.match(fs.readFileSync(path.join(root, "node_modules/x/README.md"), "utf8"), /\{\{PROJECT_NAME\}\}/);
  assert.match(fs.readFileSync(path.join(root, "docs/other.md"), "utf8"), /\{\{ handlebars \}\}/);
});

test("rejects unknown keys and empty values", (t) => {
  const root = repo(t);
  assert.throws(() => fillPlaceholders(root, { NOPE: "x" }), /Unknown placeholder NOPE/);
  assert.throws(() => fillPlaceholders(root, { PROJECT_NAME: "" }), /Empty value for PROJECT_NAME/);
});

test("remainingPlaceholders lists files that still contain known tokens", (t) => {
  const root = repo(t);
  assert.deepEqual(remainingPlaceholders(root), ["AGENTS.md"]);
  fillPlaceholders(root, { PROJECT_NAME: "Acme", ID_PREFIX: "ACME" });
  assert.deepEqual(remainingPlaceholders(root), []);
});
