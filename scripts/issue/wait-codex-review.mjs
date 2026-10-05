#!/usr/bin/env node
// Wait for the Codex GitHub review of a pull request.
// Usage: node scripts/issue/wait-codex-review.mjs <pr> [--since ISO] [--nudge-min 10] [--timeout-min 45]
// --since defaults to the latest commit's push time. If Codex has not responded
// after --nudge-min minutes, posts "@codex review" once. Exits 0 with a JSON
// result: status "review" (findings to read), "clean" (Codex reacted 👍 with no
// review) or exits 1 with status "timeout".
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const pr = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
if (!/^\d+$/.test(pr ?? "")) { console.error("Usage: wait-codex-review.mjs <pr> [--since ISO] [--nudge-min N] [--timeout-min N]"); process.exit(2); }
const gh = (...a) => JSON.parse(execFileSync("gh", a, { encoding: "utf8" }) || "null");
const repo = gh("repo", "view", "--json", "nameWithOwner").nameWithOwner;
const api = (p) => gh("api", "--paginate", "--slurp", `repos/${repo}/${p}`).flat();
const isCodex = (u) => /codex/i.test(u?.login ?? "") && (u?.type === "Bot" || /\[bot\]$/.test(u?.login ?? ""));

const commits = api(`pulls/${pr}/commits`);
const since = new Date(opt("--since", commits.at(-1)?.commit?.committer?.date ?? new Date().toISOString()));
const nudgeMs = Number(opt("--nudge-min", 10)) * 60e3;
const deadline = Date.now() + Number(opt("--timeout-min", 45)) * 60e3;
const start = Date.now();
let nudged = false;
const after = (t) => new Date(t) > since;

for (;;) {
  const reviews = api(`pulls/${pr}/reviews`).filter((r) => isCodex(r.user) && after(r.submitted_at));
  const inline = api(`pulls/${pr}/comments`).filter((c) => isCodex(c.user) && after(c.created_at));
  const comments = api(`issues/${pr}/comments`).filter((c) => isCodex(c.user) && after(c.created_at));
  const thumbs = api(`issues/${pr}/reactions`).filter((r) => isCodex(r.user) && r.content === "+1" && after(r.created_at));
  if (reviews.length || inline.length || comments.length) {
    console.log(JSON.stringify({ status: "review", pr: Number(pr), since,
      reviews: reviews.map((r) => ({ state: r.state, body: r.body, url: r.html_url })),
      inline: inline.map((c) => ({ path: c.path, line: c.line ?? c.original_line, body: c.body, url: c.html_url, id: c.id })),
      comments: comments.map((c) => ({ body: c.body, url: c.html_url })) }, null, 2));
    process.exit(0);
  }
  if (thumbs.length) { console.log(JSON.stringify({ status: "clean", pr: Number(pr), since, note: "Codex reacted 👍 without findings." })); process.exit(0); }
  if (!nudged && Date.now() - start > nudgeMs) {
    execFileSync("gh", ["pr", "comment", pr, "--body", "@codex review"]);
    nudged = true;
    console.error(`No Codex response after ${nudgeMs / 60e3} min; requested "@codex review".`);
  }
  if (Date.now() > deadline) { console.log(JSON.stringify({ status: "timeout", pr: Number(pr), since, nudged })); process.exit(1); }
  await new Promise((r) => setTimeout(r, 60e3));
}
