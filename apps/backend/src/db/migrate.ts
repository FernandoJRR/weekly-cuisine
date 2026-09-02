import { readdirSync, readFileSync } from "node:fs"
import type { Database } from "bun:sqlite"

const MIGRATIONS_DIR = new URL("../../drizzle", import.meta.url)

/**
 * Applies `drizzle/*.sql` migrations in name order, tracking applied files in
 * `__wc_migrations`. `schema.ts` (+ `bun run db:generate`) is the single
 * source of truth for the database shape.
 *
 * Baseline: if the migrations table is empty but the app tables already
 * exist (a database created by the old inline-DDL boot path), the first
 * migration is marked applied without running it — that migration reproduces
 * exactly the shape those databases already converged to.
 */
export function migrate(sqlite: Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __wc_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TEXT NOT NULL
    );
  `)

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort()

  const applied = new Set(
    (sqlite.query(`SELECT name FROM __wc_migrations`).all() as { name: string }[])
      .map(r => r.name),
  )

  if (applied.size === 0 && files.length > 0 && hasLegacyTables(sqlite)) {
    const baseline = files[0]!
    sqlite
      .query(`INSERT INTO __wc_migrations (name, applied_at) VALUES (?, ?)`)
      .run(baseline, new Date().toISOString())
    applied.add(baseline)
  }

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = readMigration(file)
    sqlite.transaction(() => {
      sqlite.exec(sql)
      sqlite
        .query(`INSERT INTO __wc_migrations (name, applied_at) VALUES (?, ?)`)
        .run(file, new Date().toISOString())
    })()
  }
}

function hasLegacyTables(sqlite: Database): boolean {
  const row = sqlite
    .query(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'ingredients'`)
    .get() as { n: number }
  return row.n > 0
}

function readMigration(file: string): string {
  return readFileSync(new URL(`../../drizzle/${file}`, import.meta.url), "utf8")
}
