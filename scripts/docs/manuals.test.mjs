import { test } from "node:test";
import assert from "node:assert/strict";
import { renderManuals } from "./manuals.mjs";

const sample = () => ({
  updated: "2026-10-05",
  owner: "Example",
  languages: [
    { code: "en", dir: "ltr", title: "User manual", description: "How to use the app." },
    { code: "xx", dir: "rtl", title: "Manual XX", description: "Second language." },
  ],
  topics: [
    {
      id: "getting-started",
      title: { en: "Getting started", xx: "Start XX" },
      hint: { en: "Open the app.", xx: "Hint XX" },
      steps: { en: ["Install it", "Open it"], xx: ["Step XX 1", "Step XX 2"] },
      related: ["saving"],
    },
    {
      id: "saving",
      title: { en: "Saving", xx: "Save XX" },
      hint: { en: "Work is saved.", xx: "Save hint XX" },
      steps: { en: ["Press save"], xx: ["Save step XX"] },
      related: [],
    },
  ],
});

test("renders one manual per language with frontmatter, contents, steps and related links", () => {
  const out = renderManuals(sample());
  assert.deepEqual(Object.keys(out), ["en", "xx"]);
  const en = out.en;
  assert.match(en, /^---\ntype: "User Manual"\ntitle: "User manual"/);
  assert.match(en, /tracks: \["docs\/help-content.json", "scripts\/docs\/manuals.mjs"\]/);
  assert.match(en, /generated: \{"by": "process:manuals", "at": "2026-10-05T00:00:00Z"\}/);
  assert.match(en, /^- \[Getting started\]\(#getting-started\)$/m);
  assert.match(en, /^1\. Install it\n2\. Open it$/m);
  assert.match(en, /^Related: \[Saving\]\(#saving\)$/m);
  assert.match(out.xx, /^dir: "rtl"$/m);
  assert.match(out.xx, /^## Start XX$/m);
});

test("missing translations fail loudly", () => {
  const data = sample();
  delete data.topics[0].title.xx;
  assert.throws(() => renderManuals(data), /missing xx translation for getting-started.title/);
});

test("unknown related topics fail loudly", () => {
  const data = sample();
  data.topics[1].related = ["nope"];
  assert.throws(() => renderManuals(data), /saving: unknown related topic nope/);
});
