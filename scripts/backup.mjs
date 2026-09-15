// Exports every table to backups/<table>.json.
//
//   npm run backup
//
// Output is deterministic - rows sorted by id, stable key order, no
// timestamps - so an unchanged database produces no diff and git history
// only records real changes. Each commit of the backups/ folder is a
// restorable snapshot; see scripts/restore.mjs.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TABLES, fetchTable, requireEnv, stripOmitted } from "./backup-tables.mjs";

const url = requireEnv("SUPABASE_URL").replace(/\/+$/, "");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const outDir = path.resolve("backups");
const allowEmpty = process.argv.includes("--allow-empty");

async function previousCount(file) {
  try {
    return JSON.parse(await readFile(file, "utf8")).length;
  } catch {
    return 0;
  }
}

await mkdir(outDir, { recursive: true });

// Fetch everything before writing anything, so a failure part-way through
// can't leave a half-updated snapshot on disk.
const exports = [];
for (const { name, omit } of TABLES) {
  // Emails are stripped here, before anything reaches disk or the repo.
  const rows = (await fetchTable(url, key, name)).map((row) => stripOmitted(row, omit));
  const file = path.join(outDir, `${name}.json`);
  const before = await previousCount(file);

  // A table that had rows and now returns none is far more likely to be a
  // broken or paused project than a real wipe. Refuse rather than commit an
  // empty backup over a good one.
  if (before > 0 && rows.length === 0 && !allowEmpty) {
    console.error(
      `Refusing to overwrite ${name}: previous backup had ${before} rows, live has 0. ` +
        `If that's genuinely intended, re-run with --allow-empty.`,
    );
    process.exit(1);
  }

  exports.push({ name, file, rows, before });
}

for (const { name, file, rows, before } of exports) {
  await writeFile(file, `${JSON.stringify(rows, null, 2)}\n`);
  const delta = rows.length - before;
  const note = delta === 0 ? "" : ` (${delta > 0 ? "+" : ""}${delta})`;
  console.log(`  ${name.padEnd(14)} ${String(rows.length).padStart(5)} rows${note}`);
}
