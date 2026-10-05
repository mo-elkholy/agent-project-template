// Pure label logic for bootstrap-labels.mjs.
const key = (name) => name.toLowerCase();
const same = (a, b) => a.color.toLowerCase() === b.color.toLowerCase() && (a.description ?? "") === (b.description ?? "");

export function diffLabels(wanted, existing, { createOnly = false } = {}) {
  const byName = new Map(existing.map((l) => [key(l.name), l]));
  const create = [], update = [];
  for (const w of wanted) {
    const have = byName.get(key(w.name));
    if (!have) create.push(w);
    else if (!createOnly && !same(w, have)) update.push(w);
  }
  return { create, update };
}

// labels.json groups fixed labels by purpose; "areas" and "touches" are plain
// names that become "area: x" and "touches: x".
export function expandLabels(groups) {
  const out = [];
  for (const [group, items] of Object.entries(groups)) {
    if (group.startsWith("_")) continue;
    for (const item of items) {
      if (group === "areas") out.push({ name: `area: ${item}`, color: "1d76db", description: `Product area: ${item}` });
      else if (group === "touches") out.push({ name: `touches: ${item}`, color: "ededed", description: `Changes the ${item} subsystem; check before parallel work` });
      else out.push(item);
    }
  }
  return out;
}
