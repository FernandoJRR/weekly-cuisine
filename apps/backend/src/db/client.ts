import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import * as schema from "./schema.ts"
import { migrate } from "./migrate.ts"
import { backfillSeq } from "../repositories/drizzle/ids.ts"

export const sqlite = new Database(process.env["DB_PATH"] ?? "weekly_cuisine.db")

sqlite.exec("PRAGMA journal_mode = WAL;")
sqlite.exec("PRAGMA foreign_keys = ON;")

migrate(sqlite)

// Continue id sequences from pre-existing rows (no-ops once id_seq is live)
backfillSeq(sqlite, "ING", "ingredients", 5)
backfillSeq(sqlite, "RCP", "recipes", 5)
backfillSeq(sqlite, "PLAN", "plans", 6)

// Registry data seed (schema lives in schema.ts + drizzle/ migrations)
sqlite.exec(`
  INSERT OR IGNORE INTO nutrient_registry (id, name, unit, targetable) VALUES
    ('calories', 'Calories', 'kcal', 1),
    ('protein',  'Protein',  'g',    1),
    ('carbs',    'Carbs',    'g',    1),
    ('fat',      'Fat',      'g',    1);
`)

export const db = drizzle(sqlite, { schema })
