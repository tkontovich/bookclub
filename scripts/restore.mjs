// Restores the database from backups/<table>.json.
//
//   npm run restore             preview only - writes nothing
//   npm run restore -- --apply  actually write
//
// To restore an older snapshot, check out that commit's backups first:
//   git checkout <commit> -- backups/
//
// Restore upserts: rows missing from the live database are re-created and
// rows that differ are reset to the backup. It never deletes - rows that
// exist live but not in the backup are listed and left alone, so a restore
// can't wipe data added after the snapshot was taken.
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  TABLES,
  fetchTable,
  requireEnv,
  stripOmitted,
  supabaseHeaders,
} from "./backup-tables.mjs";

const url = requireEnv("SUPABASE_URL").replace(/\/+$/, "");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const apply = process.argv.includes("--apply");
const BATCH_SIZE = 500;

const matchKey = (row, match) => match.map((col) => String(row[col])).join("|");

// When matching on a natural key, the id is allowed to differ, so leave it
// out of both the comparison and the write. Columns the backup deliberately
// omits (member emails) come off both sides too: a live email the backup
// never held is not a difference, and a restore must not blank it out.
function comparable(row, match, omit) {
  const copy = stripOmitted(row, omit);
  if (!match.includes("id")) delete copy.id;
  return copy;
}

const sameRow = (a, b) =>
  JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());

async function upsert(table, match, omit, rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row) => comparable(row, match, omit));
    const res = await fetch(`${url}/rest/v1/${table}?on_conflict=${match.join(",")}`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(key),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    }
  }
}

console.log(apply ? "Restoring from backups/ ...\n" : "Preview - nothing will be written.\n");

const plan = [];
for (const { name, match, omit } of TABLES) {
  const backup = JSON.parse(await readFile(path.resolve("backups", `${name}.json`), "utf8"));
  const live = await fetchTable(url, key, name);
  const liveByKey = new Map(live.map((row) => [matchKey(row, match), row]));
  const backupKeys = new Set(backup.map((row) => matchKey(row, match)));

  const missing = [];
  const changed = [];
  for (const row of backup) {
    const current = liveByKey.get(matchKey(row, match));
    if (!current) missing.push(row);
    else if (!sameRow(comparable(row, match, omit), comparable(current, match, omit)))
      changed.push(row);
  }
  const extra = live.filter((row) => !backupKeys.has(matchKey(row, match))).length;

  plan.push({ name, match, omit, writes: [...missing, ...changed] });
  console.log(
    `  ${name.padEnd(14)} ${String(missing.length).padStart(4)} to re-create  ` +
      `${String(changed.length).padStart(4)} to reset  ` +
      `${String(extra).padStart(4)} newer (kept)`,
  );
}

const total = plan.reduce((sum, t) => sum + t.writes.length, 0);

if (total === 0) {
  console.log("\nLive database already matches the backup. Nothing to do.");
} else if (!apply) {
  console.log(`\n${total} rows would be written. Re-run with --apply to restore.`);
} else {
  // TABLES is parent-first, so foreign keys resolve as we go.
  for (const { name, match, omit, writes } of plan) {
    if (writes.length > 0) await upsert(name, match, omit, writes);
  }
  console.log(`\nRestored ${total} rows.`);
}
