// Pure decision logic for the issue lifecycle scripts. No I/O here, so every
// rule that decides whether work may start is covered by lib.test.mjs.
import path from "node:path";

const refs = (text) => [...(text ?? "").matchAll(/#(\d+)/g)].map((m) => Number(m[1]));

// "Blocked by" = dependency: the issue cannot start until these close.
// "Do not run in parallel with" = conflict: both may be open, not both in progress.
export function parseEdges(body) {
  const blockedBy = new Set();
  const conflicts = new Set();
  let inBlockedSection = false;
  for (const line of (body ?? "").split("\n")) {
    if (/^#{1,6}\s/.test(line)) {
      inBlockedSection = /^#{1,6}\s+blocked by\b/i.test(line);
      continue;
    }
    if (/do not run in parallel with/i.test(line)) refs(line).forEach((n) => conflicts.add(n));
    else if (inBlockedSection || /blocked by/i.test(line)) refs(line).forEach((n) => blockedBy.add(n));
  }
  return { blockedBy, conflicts };
}

// issue: { number, state, labels: string[], body }
// inProgress: [{ number, title, labels: string[], body }]
// openBlockers: issue numbers that block this one and are still open
export function startProblems({ issue, inProgress, openBlockers }) {
  if (issue.state !== "OPEN") return [`#${issue.number} is ${issue.state}.`];
  if (issue.labels.includes("in progress")) return [`#${issue.number} is already claimed (in progress).`];
  const mine = parseEdges(issue.body).conflicts;
  const others = inProgress.filter((o) => o.number !== issue.number);
  return [
    ...openBlockers.map((n) => `blocked by open issue #${n}`),
    ...others
      .filter((o) => mine.has(o.number) || parseEdges(o.body).conflicts.has(issue.number))
      .map((o) => `conflicts with in-progress #${o.number} ${o.title}`),
    ...(issue.labels.includes("touches: schema")
      ? others.filter((o) => o.labels.includes("touches: schema")).map((o) => `schema change already in progress in #${o.number} ${o.title}`)
      : []),
  ];
}

const stopWords = new Set(["and", "the", "of", "for", "to", "a", "an", "as", "at", "by", "from", "into", "with", "through", "in", "on"]);

export function branchName({ title, number, idPrefix, branchPrefix }) {
  const escaped = String(idPrefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const id = title.match(new RegExp(`^(${escaped}-\\d+)`, "i"))?.[1].toLowerCase() ?? `issue-${number}`;
  const rest = title.replace(new RegExp(`^${escaped}-\\d+:\\s*`, "i"), "");
  const slug = rest.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ")
    .filter((w) => w && !stopWords.has(w)).slice(0, 4).join("-");
  const name = slug ? `${id}-${slug}` : id;
  return branchPrefix ? `${branchPrefix}/${name}` : name;
}

// Orca manages its own worktree paths; plain git worktrees go in a sibling
// folder "<repo>-worktrees/<name>" so they never nest inside the main checkout.
export function planWorktree({ useOrca, mainPath, name, branch, base }) {
  if (useOrca) return { kind: "orca", path: null, commands: [] };
  const target = path.join(path.dirname(mainPath), `${path.basename(mainPath)}-worktrees`, name);
  return {
    kind: "git",
    path: target,
    commands: [["git", "-C", mainPath, "worktree", "add", "-b", branch, target, base]],
  };
}

// finish.mjs merges and deletes, so it only acts on the PR whose branch is
// checked out here, with nothing uncommitted and nothing unpushed.
export function finishProblems({ currentBranch, headRefName, dirty, localHead, prHead }) {
  const problems = [];
  if (currentBranch !== headRefName)
    problems.push(`PR belongs to branch ${headRefName}, but this worktree is on ${currentBranch}. Run finish.mjs from the PR's own worktree.`);
  if (dirty) problems.push("This worktree has uncommitted changes; commit or stash them first.");
  if (localHead !== prHead)
    problems.push(`local HEAD ${localHead} does not match the PR head ${prHead}; push or pull first.`);
  return problems;
}

// Single-quote for POSIX shells: nothing inside expands.
export const shellQuote = (text) => `'${String(text).replace(/'/g, "'\\''")}'`;
