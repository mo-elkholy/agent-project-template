import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { runDocs } from "./docs.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-tool-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "docs"));
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(
    path.join(root, "src/example.ts"),
    "export const example=1;\n",
  );
  return root;
}
function write(root, body = "# Example\n", extra = {}) {
  const meta = {
    type: "Architecture",
    title: "Example",
    description: "Example documentation.",
    status: "stable",
    owner: "Example",
    generated: { by: "process:test", at: "2026-09-29T00:00:00Z" },
    tracks: ["src"],
    sources: [],
    ...extra,
  };
  fs.writeFileSync(
    path.join(root, "docs/example.md"),
    "---\n" + JSON.stringify(meta) + "\n---\n" + body,
  );
}
function ack(root) {
  return runDocs(root, "ack", [
    "docs/example.md",
    "--by",
    "process:test",
    "--note",
    "Reviewed fixture change.",
  ]);
}
function clean(root) {
  assert.deepEqual(runDocs(root, "sync").errors, []);
  assert.deepEqual(ack(root).errors, []);
  assert.deepEqual(runDocs(root, "check").errors, []);
}

test("bootstrap indexes, preserve metadata, and require explicit receipts", (t) => {
  const root = fixture(t);
  write(root, "# Example\nSee [index](index.md).\n", {
    extension: { preserve: true },
    verified: { by: "process:fixture", at: "2026-09-29T00:00:00Z" },
  });
  const before = fs.readFileSync(path.join(root, "docs/example.md"), "utf8");
  assert.deepEqual(runDocs(root, "sync").errors, []);
  assert(
    runDocs(root, "check").errors.some((e) =>
      e.includes("no source-change review"),
    ),
  );
  assert.throws(() => runDocs(root, "ack", ["docs/example.md"]), /--by/);
  clean(root);
  assert.equal(
    fs.readFileSync(path.join(root, "docs/example.md"), "utf8"),
    before,
  );
});
test("file modifications, additions and removals trigger drift; sync cannot erase it", (t) => {
  const root = fixture(t);
  write(root);
  clean(root);
  fs.writeFileSync(
    path.join(root, "src/example.ts"),
    "export const example=2;\n",
  );
  runDocs(root, "sync");
  assert(
    runDocs(root, "check").errors.some((e) =>
      e.includes("tracked inputs changed"),
    ),
  );
  ack(root);
  assert.deepEqual(runDocs(root, "check").errors, []);
  fs.writeFileSync(path.join(root, "src/new.ts"), "new input");
  assert(runDocs(root, "check").errors.length);
  ack(root);
  fs.unlinkSync(path.join(root, "src/new.ts"));
  assert(runDocs(root, "check").errors.length);
});
test("prose changes and stale indexes are detected independently", (t) => {
  const root = fixture(t);
  write(root);
  clean(root);
  write(root, "# Changed prose\n");
  assert(runDocs(root, "check").errors.length);
  ack(root);
  fs.appendFileSync(path.join(root, "docs/index.md"), "manual edit\n");
  assert(
    runDocs(root, "check").errors.some((e) => e.includes("index is stale")),
  );
  runDocs(root, "sync");
  assert.deepEqual(runDocs(root, "check").errors, []);
});
test("real local links fail while fenced examples and external URLs are not fetched", (t) => {
  const root = fixture(t);
  write(root, "# Example\n[Missing](absent.md)\n");
  assert(
    runDocs(root, "sync").errors.some((e) => e.includes("broken local link")),
  );
  write(
    root,
    "# Example\n```md\n[Example](absent.md)\n```\n[External](https://example.invalid/test)\n",
  );
  clean(root);
});
test("metadata and tracked paths are validated without following repository escapes", (t) => {
  const root = fixture(t);
  write(root, "# Example\n", { tracks: ["../secret"] });
  assert(
    runDocs(root, "sync").errors.some((e) =>
      e.includes("Unsupported tracked path"),
    ),
  );
  write(root, "# Example\n", {
    generated: { by: "process:test", at: "yesterday" },
  });
  assert(runDocs(root, "sync").errors.some((e) => e.includes("timestamp")));
  fs.writeFileSync(
    path.join(root, "docs/example.md"),
    "---\ntype: x\ntype: y\n---\n",
  );
  assert.throws(() => runDocs(root, "check"), /duplicated/);
});
test("reference snapshots must match their recorded body digest", (t) => {
  const root = fixture(t),
    body = "# Upstream\n[Example](missing-example.md)\n";
  write(root, body, {
    external_snapshot: true,
    upstream_sha256: crypto.createHash("sha256").update(body).digest("hex"),
  });
  clean(root);
  fs.appendFileSync(path.join(root, "docs/example.md"), "changed\n");
  assert(
    runDocs(root, "check").errors.some((e) =>
      e.includes("snapshot hash mismatch"),
    ),
  );
});
test("acknowledgment is atomic and never changes verified metadata", (t) => {
  const root = fixture(t);
  write(root);
  clean(root);
  const before = fs.readFileSync(
    path.join(root, "docs/.sync-state.json"),
    "utf8",
  );
  assert.throws(
    () =>
      runDocs(root, "ack", [
        "docs/example.md",
        "docs/missing.md",
        "--by",
        "process:test",
        "--note",
        "Review",
      ]),
    /Unknown concept/,
  );
  assert.equal(
    fs.readFileSync(path.join(root, "docs/.sync-state.json"), "utf8"),
    before,
  );
  assert(
    !fs
      .readFileSync(path.join(root, "docs/example.md"), "utf8")
      .includes("verified"),
  );
});
test("freshness notices and invalid log headings stay visible", (t) => {
  const root = fixture(t);
  write(root, "# Example\n", { stale_after: "2000-01-01T00:00:00Z" });
  clean(root);
  assert(runDocs(root, "check").warnings.length);
  fs.writeFileSync(path.join(root, "docs/log.md"), "# Updates\n## yesterday\n");
  assert(runDocs(root, "check").errors.some((e) => e.includes("log date")));
});

test("log, agent instructions and reference-style links cannot silently break", (t) => {
  const root = fixture(t);
  write(root);
  clean(root);
  fs.writeFileSync(
    path.join(root, "docs/log.md"),
    "# Updates\n## 2026-09-29\n[Missing](absent.md)\n",
  );
  assert(
    runDocs(root, "check").errors.some((e) => e.includes("broken local link")),
  );
  fs.unlinkSync(path.join(root, "docs/log.md"));
  fs.writeFileSync(
    path.join(root, "AGENTS.md"),
    "See [guide][doc].\n[doc]: docs/absent.md\n",
  );
  assert(
    runDocs(root, "check").errors.some((e) => e.includes("broken local link")),
  );
});

test("repository skill edits require explicit review without allowing output or private paths", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, ".agents/skills/example"), { recursive: true });
  fs.writeFileSync(path.join(root, ".agents/skills/example/SKILL.md"), "Initial skill");
  write(root, "# Example\n", { tracks: [".agents/skills/example"] });
  clean(root);
  fs.writeFileSync(path.join(root, ".agents/skills/example/SKILL.md"), "Changed guidance");
  assert(runDocs(root, "check").errors.some((e) => e.includes("tracked inputs changed")));
  for (const target of ["release/skill.zip", "../private", ".agents/../../private"]) {
    write(root, "# Example\n", { tracks: [target] });
    assert(runDocs(root, "sync").errors.some((e) => e.includes("Unsupported tracked path")));
  }
});

test("config controls tracked roots and index title", (t) => {
  const root = fixture(t);
  fs.writeFileSync(
    path.join(root, "docs/docs.config.json"),
    JSON.stringify({ title: "Acme docs", trackRoots: ["lib"] }),
  );
  fs.mkdirSync(path.join(root, "lib"));
  fs.writeFileSync(path.join(root, "lib/a.js"), "1");
  write(root, "# Example\n", { tracks: ["lib"] });
  clean(root);
  assert.match(fs.readFileSync(path.join(root, "docs/index.md"), "utf8"), /^# Acme docs$/m);
  write(root, "# Example\n", { tracks: ["src"] });
  assert(runDocs(root, "sync").errors.some((e) => e.includes("Unsupported tracked path")));
});

test("works with no config file and uses a neutral title", (t) => {
  const root = fixture(t);
  write(root);
  clean(root);
  assert.match(fs.readFileSync(path.join(root, "docs/index.md"), "utf8"), /^# Project documentation$/m);
});

test("config can add link-checked files", (t) => {
  const root = fixture(t);
  fs.writeFileSync(
    path.join(root, "docs/docs.config.json"),
    JSON.stringify({ trackRoots: ["src"], linkCheckedFiles: ["PLAYBOOK.md"] }),
  );
  write(root);
  clean(root);
  fs.writeFileSync(path.join(root, "PLAYBOOK.md"), "[Missing](docs/absent.md)\n");
  assert(runDocs(root, "check").errors.some((e) => e.includes("broken local link")));
});

test("config describes subdirectories in the root index", (t) => {
  const root = fixture(t);
  fs.writeFileSync(
    path.join(root, "docs/docs.config.json"),
    JSON.stringify({ trackRoots: ["src"], directories: { guides: "How-to guides." } }),
  );
  fs.mkdirSync(path.join(root, "docs/guides"));
  write(root);
  fs.renameSync(path.join(root, "docs/example.md"), path.join(root, "docs/guides/example.md"));
  assert.deepEqual(runDocs(root, "sync").errors, []);
  assert.match(fs.readFileSync(path.join(root, "docs/index.md"), "utf8"), /^- \[guides\]\(guides\/index.md\) - How-to guides\.$/m);
});

test("config ignore list skips files owned by other tools", (t) => {
  const root = fixture(t);
  fs.writeFileSync(
    path.join(root, "docs/docs.config.json"),
    JSON.stringify({ trackRoots: ["src"], ignore: ["docs/agents/issue-tracker.md"] }),
  );
  fs.mkdirSync(path.join(root, "docs/agents"));
  fs.writeFileSync(path.join(root, "docs/agents/issue-tracker.md"), "# Issue tracker: GitHub\n");
  write(root);
  clean(root);
});

test("ordinary dotfiles inside tracked folders are allowed", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "src/.DS_Store"), "finder");
  fs.writeFileSync(path.join(root, "src/.gitkeep"), "");
  write(root);
  clean(root);
});

test("in a git repository, gitignored files never cause drift", (t) => {
  const root = fixture(t);
  execFileSync("git", ["init", "-q"], { cwd: root });
  fs.writeFileSync(path.join(root, ".gitignore"), "__pycache__/\n");
  fs.mkdirSync(path.join(root, "src/__pycache__"));
  fs.writeFileSync(path.join(root, "src/__pycache__/a.pyc"), "1");
  write(root);
  clean(root);
  fs.writeFileSync(path.join(root, "src/__pycache__/a.pyc"), "2");
  fs.writeFileSync(path.join(root, "src/__pycache__/b.pyc"), "3");
  assert.deepEqual(runDocs(root, "check").errors, []);
  fs.writeFileSync(path.join(root, "src/new.ts"), "untracked but not ignored");
  assert(runDocs(root, "check").errors.some((e) => e.includes("tracked inputs changed")));
});

test("tracking an index or the receipt file is still refused", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "docs/index.md"), "# Old index\n");
  write(root, "# Example\n", { tracks: ["docs"] });
  assert(runDocs(root, "sync").errors.some((e) => e.includes("Track explicit documentation files")));
});

test("ignore accepts folders, so an existing docs tree can stay as it is", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "docs/docs.config.json"), JSON.stringify({ trackRoots: ["src"], ignore: ["docs/legacy/"] }));
  fs.mkdirSync(path.join(root, "docs/legacy"));
  fs.writeFileSync(path.join(root, "docs/legacy/guide.md"), "# No frontmatter here\n");
  fs.writeFileSync(path.join(root, "docs/legacy/index.md"), "# Hand-written legacy index\n");
  write(root);
  clean(root);
  assert.equal(fs.readFileSync(path.join(root, "docs/legacy/index.md"), "utf8"), "# Hand-written legacy index\n");
});

test("sync never overwrites a hand-written index", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "docs/index.md"), "# Our mkdocs home page\n");
  write(root);
  const r = runDocs(root, "sync");
  assert(r.errors.some((e) => e.includes("docs/index.md: not generated by docs:sync")));
  assert.equal(fs.readFileSync(path.join(root, "docs/index.md"), "utf8"), "# Our mkdocs home page\n");
});
