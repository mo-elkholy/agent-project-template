#!/usr/bin/env node
// Check that every Matt Pocock skill this template calls by name still exists
// upstream (outside the deprecated bucket). Run before publishing template
// changes and when his repository announces renames.
// Usage: node scripts/setup/upstream.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export function missingSkills(names, treePaths) {
  const live = new Set(
    treePaths
      .map((p) => p.match(/^skills\/([^/]+)\/([^/]+)\/SKILL\.md$/))
      .filter((m) => m && m[1] !== "deprecated")
      .map((m) => m[2]),
  );
  return names.filter((n) => !live.has(n));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const list = JSON.parse(fs.readFileSync(fileURLToPath(new URL("./upstream-skills.json", import.meta.url)), "utf8"));
  const paths = execFileSync("gh", ["api", `repos/${list.repo}/git/trees/HEAD?recursive=1`, "--jq", ".tree[].path"], { encoding: "utf8" }).split("\n");
  const missing = missingSkills(list.skills, paths);
  if (missing.length) { console.error(`Missing or deprecated upstream: ${missing.join(", ")}`); process.exitCode = 1; }
  else console.log(`All ${list.skills.length} referenced skills exist in ${list.repo}.`);
}
