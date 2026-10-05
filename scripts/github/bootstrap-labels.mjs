#!/usr/bin/env node
// Create or update the repository's labels from scripts/github/labels.json.
// Idempotent: existing labels are matched by name (case-insensitive) and only
// updated when color or description differ. Never deletes labels.
// --create-only leaves existing labels untouched (use when adopting the
// template in a repository whose labels already mean something).
// Usage: node scripts/github/bootstrap-labels.mjs [--dry-run] [--create-only]
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { run } from "../config.mjs";
import { diffLabels, expandLabels } from "./lib.mjs";

const dryRun = process.argv.includes("--dry-run");
const groups = JSON.parse(fs.readFileSync(fileURLToPath(new URL("./labels.json", import.meta.url)), "utf8"));
const wanted = expandLabels(groups);
const existing = JSON.parse(run("gh", ["label", "list", "--json", "name,color,description", "--limit", "500"]));
const { create, update } = diffLabels(wanted, existing, { createOnly: process.argv.includes("--create-only") });
if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, create: create.map((l) => l.name), update: update.map((l) => l.name) }, null, 2));
  process.exit(0);
}
for (const l of create) run("gh", ["label", "create", l.name, "--color", l.color, "--description", l.description ?? ""]);
for (const l of update) run("gh", ["label", "edit", l.name, "--color", l.color, "--description", l.description ?? ""]);
console.log(`Labels: ${create.length} created, ${update.length} updated, ${wanted.length - create.length - update.length} unchanged.`);
