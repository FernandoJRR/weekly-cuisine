import type { Database } from "bun:sqlite"

/**
 * Atomically allocates the next prefixed id (e.g. "ING-0003") from the
 * `id_seq` table. A single synchronous UPSERT..RETURNING statement is
 * serialized by SQLite, so concurrent creates can never observe the same
 * value. Ids never go backwards when rows are deleted.
 */
export function allocateId(sqlite: Database, prefix: string): string {
  const row = sqlite
    .query(
      `INSERT INTO id_seq (name, next) VALUES (?, 1)
       ON CONFLICT(name) DO UPDATE SET next = next + 1
       RETURNING next`,
    )
    .get(prefix) as { next: number }
  return `${prefix}-${String(row.next).padStart(4, "0")}`
}

/**
 * Seeds a sequence from the highest existing id suffix so the allocator
 * continues (never repeats) ids created before `id_seq` existed.
 * `offset` is 1 + prefix length + 1 for the "-" (substr is 1-indexed).
 */
export function backfillSeq(sqlite: Database, prefix: string, table: string, substrFrom: number): void {
  const live = sqlite.query(`SELECT 1 AS x FROM id_seq WHERE name = ?`).get(prefix)
  if (live) return // sequence already running; never reset it
  sqlite
    .query(
      `INSERT INTO id_seq (name, next)
       SELECT ?, COALESCE(MAX(CAST(substr(id, ?) AS INTEGER)), 0) FROM ${table}`,
    )
    .run(prefix, substrFrom)
}
