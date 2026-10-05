import { test } from "node:test";
import assert from "node:assert/strict";
import { missingSkills } from "./upstream.mjs";

const tree = ["skills/engineering/tdd/SKILL.md", "skills/productivity/grilling/SKILL.md", "skills/deprecated/to-prd/SKILL.md"];

test("finds skills in any promoted bucket", () => {
  assert.deepEqual(missingSkills(["tdd", "grilling"], tree), []);
});

test("deprecated or absent skills count as missing", () => {
  assert.deepEqual(missingSkills(["to-prd", "nope", "tdd"], tree), ["to-prd", "nope"]);
});
