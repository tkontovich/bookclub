// Shared table list for scripts/backup.mjs and scripts/restore.mjs.
//
// Order matters for restore: parents before children, so foreign keys
// resolve (books reference members and rounds; votes and scores reference
// books and members).
//
// `match` is how a backup row is paired with a live row. Most tables use
// their primary key. scores and votes use their natural unique key instead,
// because a score that was deleted and re-entered gets a new id - matching
// on id would then collide with the unique (book_id, member_id) constraint.
//
// `omit` lists columns that must never be written to the backup files. The
// repo is public, and first names and ratings are fine there, but members'
// email addresses are not. They stay in the database only; a restore leaves
// whatever address is already live untouched.
export const TABLES = [
  { name: "members", match: ["id"], omit: ["email"] },
  { name: "rounds", match: ["id"] },
  { name: "books", match: ["id"] },
  { name: "votes", match: ["round_id", "member_id"] },
  { name: "scores", match: ["book_id", "member_id"] },
  { name: "club_settings", match: ["id"] },
];

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Missing ${name}. Locally it comes from .env.local (npm run backup); ` +
        `in GitHub Actions it comes from the repository secret of the same name.`,
    );
    process.exit(1);
  }
  return value;
}

export function supabaseHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

/** Drops the columns a table keeps out of the public backup. */
export function stripOmitted(row, omit) {
  if (!omit || omit.length === 0) return { ...row };
  const copy = { ...row };
  for (const column of omit) delete copy[column];
  return copy;
}

const PAGE_SIZE = 1000;

/** Every row of a table, paged so it keeps working past PostgREST's row cap. */
export async function fetchTable(url, key, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&order=id.asc`, {
      headers: {
        ...supabaseHeaders(key),
        "Range-Unit": "items",
        Range: `${from}-${from + PAGE_SIZE - 1}`,
      },
    });
    if (!res.ok) {
      throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    }
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}
