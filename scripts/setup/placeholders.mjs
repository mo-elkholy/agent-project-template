#!/usr/bin/env node
// Replace the template's known placeholders across the repository. Used by
// /project-setup. Only the five tokens below are touched; pinned references,
// dependencies, binaries and the setup skill's own instructions are skipped.
// Usage: node scripts/setup/placeholders.mjs PROJECT_NAME=Acme ID_PREFIX=ACME ...
//        node scripts/setup/placeholders.mjs --check   (exit 1 if any remain)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const KEYS = ["PROJECT_NAME", "ID_PREFIX", "OWNER_REPO", "BRANCH_PREFIX", "DOC_OWNER"];
const SKIP = new Set([".git", "node_modules", ".superpowers", ".scratch", ".worktrees", "docs/references", ".agents/skills/project-setup", "scripts/setup"]);
const token = new RegExp(`\\{\\{(${KEYS.join("|")})\\}\\}`, "g");

function textFiles(root, dir = "") {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (SKIP.has(rel) || entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) out.push(...textFiles(root, rel));
    else {
      const buf = fs.readFileSync(path.join(root, rel));
      if (!buf.includes(0)) out.push(rel);
    }
  }
  return out.sort();
}

export function fillPlaceholders(root, values) {
  for (const [k, v] of Object.entries(values)) {
    if (!KEYS.includes(k)) throw new Error(`Unknown placeholder ${k}`);
    if (typeof v !== "string" || !v.trim()) throw new Error(`Empty value for ${k}`);
  }
  const changed = [];
  for (const rel of textFiles(root)) {
    const file = path.join(root, rel);
    const before = fs.readFileSync(file, "utf8");
    const after = before.replace(token, (m, k) => values[k] ?? m);
    if (after !== before) { fs.writeFileSync(file, after); changed.push(rel); }
  }
  return changed;
}

export function remainingPlaceholders(root) {
  return textFiles(root).filter((rel) => {
    token.lastIndex = 0;
    return token.test(fs.readFileSync(path.join(root, rel), "utf8"));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const args = process.argv.slice(2);
  try {
    if (args.includes("--check")) {
      const left = remainingPlaceholders(root);
      if (left.length) { console.error(`Placeholders remain in:\n${left.join("\n")}`); process.exitCode = 1; }
      else console.log("No template placeholders remain.");
    } else {
      const values = Object.fromEntries(args.map((a) => { const i = a.indexOf("="); return [a.slice(0, i), a.slice(i + 1)]; }));
      const changed = fillPlaceholders(root, values);
      console.log(`Filled placeholders in ${changed.length} files:\n${changed.join("\n")}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
