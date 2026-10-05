#!/usr/bin/env node
// Start work on a GitHub issue: check the claim, open blockers, conflicts and
// the schema lock; create a worktree and branch from origin/<default branch>
// (with Orca when enabled and installed, otherwise plain git); launch or print
// the agent command; record the claim on the issue.
// Usage: node scripts/issue/start.mjs <issue-number> <claude|codex> [--force] [--dry-run]
import { loadConfig, run, hasCommand, mainCheckout } from "../config.mjs";
import { parseEdges, startProblems, branchName, planWorktree } from "./lib.mjs";

const [num, agent, ...rest] = process.argv.slice(2);
const force = rest.includes("--force");
const dryRun = rest.includes("--dry-run");
if (!/^\d+$/.test(num ?? "") || !["claude", "codex"].includes(agent)) {
  console.error("Usage: node scripts/issue/start.mjs <issue-number> <claude|codex> [--force] [--dry-run]");
  process.exit(2);
}
const gh = (...args) => run("gh", args);
const fail = (msg) => { console.error(`Not started: ${msg}`); process.exit(1); };

const main = mainCheckout();
const config = loadConfig(main);
const base = `origin/${config.defaultBranch ?? "main"}`;

const raw = JSON.parse(gh("issue", "view", num, "--json", "number,title,state,labels,body"));
const issue = { ...raw, labels: raw.labels.map((l) => l.name) };
const inProgress = JSON.parse(gh("issue", "list", "--label", "in progress", "--state", "open", "--limit", "200", "--json", "number,title,labels,body"))
  .map((o) => ({ ...o, labels: o.labels.map((l) => l.name) }));

// Blockers come from "Blocked by" lines and from GitHub's native issue dependencies.
const openBlockers = new Set();
for (const n of parseEdges(issue.body).blockedBy) {
  try { if (JSON.parse(gh("issue", "view", String(n), "--json", "state")).state === "OPEN") openBlockers.add(n); }
  catch { openBlockers.add(n); }
}
try {
  const repo = JSON.parse(gh("repo", "view", "--json", "nameWithOwner")).nameWithOwner;
  for (const b of JSON.parse(gh("api", `repos/${repo}/issues/${num}/dependencies/blocked_by`) || "[]"))
    if (b.state === "open") openBlockers.add(b.number);
} catch { /* dependencies API unavailable: rely on the Blocked by lines */ }

const problems = startProblems({ issue, inProgress, openBlockers: [...openBlockers] });
// Closed or already-claimed issues are never overridable, even with --force.
const hard = problems.filter((p) => /^#\d+ is /.test(p));
if (hard.length) fail(hard.join("; "));
if (problems.length && !force) fail(`${problems.join("; ")}. Re-run with --force only if the user approved this overlap.`);

const branch = branchName({ title: issue.title, number: Number(num), idPrefix: config.idPrefix, branchPrefix: config.branchPrefix });
const name = branch.split("/").pop();
const prompt = [
  `Implement GitHub issue #${num} (${issue.title}) in this worktree.`,
  `Follow the implement-issue skill at .agents/skills/implement-issue/SKILL.md and the rules in AGENTS.md.`,
  `Start by running scripts/issue/setup-worktree.sh, then read the issue with: gh issue view ${num} --comments`,
].join(" ");

let useOrca = Boolean(config.orca) && hasCommand("orca");
let orcaRepo = null;
if (useOrca) {
  try {
    orcaRepo = JSON.parse(run("orca", ["repo", "list", "--json"], { stdio: ["ignore", "pipe", "pipe"] })).result.repos.find((r) => r.path === main);
    if (!orcaRepo) { console.error(`Orca has no repo registered at ${main} (orca repo add --path ${main}); using a plain git worktree.`); useOrca = false; }
  } catch (error) {
    console.error(`Orca is not available (${String(error.stderr || error.message).trim()}); using a plain git worktree. Start it with: orca open`);
    useOrca = false;
  }
} else if (config.orca) console.error("Orca is enabled in template.config.json but not installed; using a plain git worktree.");

const plan = planWorktree({ useOrca, mainPath: main, name, branch, base });
const orcaArgs = useOrca ? [
  "worktree", "create", "--repo", `id:${orcaRepo.id}`, "--name", name, "--no-parent",
  "--base-branch", base, "--issue", num, "--agent", agent, "--prompt", prompt,
  "--setup", "skip", "--comment", `#${num}: ${agent} implementing`, "--activate", "--json",
] : null;
const launch = `cd ${JSON.stringify(plan.path ?? "<worktree>")} && ${agent} ${JSON.stringify(prompt)}`;

if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, issue: Number(num), agent, branch, overlaps: problems, kind: plan.kind,
    orca: orcaArgs, commands: plan.commands, launch: plan.kind === "git" ? launch : null }, null, 2));
  process.exit(0);
}

run("git", ["-C", main, "fetch", "--quiet", "origin", config.defaultBranch ?? "main"]);
let worktree = plan.path, actualBranch = branch, terminal = null;
if (useOrca) {
  const created = JSON.parse(run("orca", orcaArgs));
  if (!created.ok) fail(JSON.stringify(created.error ?? created));
  worktree = created.result.worktree.path;
  actualBranch = created.result.worktree.branch.replace(/^refs\/heads\//, "");
  terminal = created.result.agentTerminalHandle ?? created.result.startupTerminal?.handle ?? null;
} else {
  for (const [cmd, ...args] of plan.commands) run(cmd, args);
}

gh("issue", "edit", num, "--add-label", "in progress", "--add-label", `agent: ${agent}`);
gh("issue", "comment", num, "--body",
  `Claimed by **${agent}**.\n\n- Branch: \`${actualBranch}\`\n- Worktree: \`${worktree}\`` +
  (problems.length ? `\n- Started with user-approved overlap: ${problems.join("; ")}` : ""));
console.log(JSON.stringify({ issue: Number(num), agent, branch: actualBranch, worktree, kind: plan.kind,
  agentTerminal: terminal, launch: plan.kind === "git" ? launch : null, overlaps: problems }, null, 2));
if (plan.kind === "git") console.error(`\nLaunch the agent in a new terminal:\n  ${launch}`);
