import { test } from "node:test";
import assert from "node:assert/strict";
import { diffLabels, expandLabels } from "./lib.mjs";

const label = (name, color = "ededed", description = "") => ({ name, color, description });

test("diffLabels creates labels that do not exist", () => {
  assert.deepEqual(diffLabels([label("P0")], []), { create: [label("P0")], update: [] });
});

test("diffLabels updates a label whose color or description changed", () => {
  const d = diffLabels([label("P0", "b60205", "Blocker")], [label("P0", "ffffff", "Blocker")]);
  assert.deepEqual(d, { create: [], update: [label("P0", "b60205", "Blocker")] });
});

test("diffLabels is a no-op when labels already match, ignoring name case and color case", () => {
  assert.deepEqual(diffLabels([label("Bug", "D73A4A")], [label("bug", "d73a4a")]), { create: [], update: [] });
});

test("expandLabels turns areas and touches into prefixed labels", () => {
  const all = expandLabels({ priority: [label("P0")], areas: ["web"], touches: ["schema"] });
  assert.deepEqual(all.map((l) => l.name), ["P0", "area: web", "touches: schema"]);
  assert.match(all[2].description, /check before parallel work/);
});

test("diffLabels in create-only mode never touches existing labels", () => {
  const d = diffLabels([label("P0", "b60205"), label("P9")], [label("P0", "ffffff")], { createOnly: true });
  assert.deepEqual(d, { create: [label("P9")], update: [] });
});
