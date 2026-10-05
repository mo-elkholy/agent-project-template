// Run every scripts/**/*.test.mjs with node --test. Listing files ourselves
// works on every supported Node version (glob support differs between 20 and 22+).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const tests = fs.readdirSync(dir, { recursive: true })
  .filter((f) => f.endsWith(".test.mjs"))
  .map((f) => path.join(dir, f))
  .sort();
const r = spawnSync(process.execPath, ["--test", ...tests], { stdio: "inherit" });
process.exit(r.status ?? 1);
