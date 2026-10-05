// Reads template.config.json, which /project-setup fills once per repository.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function loadConfig(root) {
  const file = path.join(root, "template.config.json");
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}; run /project-setup first.`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", ...opts }).trim();

export function hasCommand(name) {
  try { run("sh", ["-c", `command -v ${name}`]); return true; } catch { return false; }
}

// The main checkout is always the first entry of `git worktree list`.
export const mainCheckout = () => run("git", ["worktree", "list", "--porcelain"]).split("\n")[0].replace(/^worktree /, "");
