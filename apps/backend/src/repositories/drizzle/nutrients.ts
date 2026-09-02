import { eq } from "drizzle-orm"
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite"
import { nutrientRegistry as table } from "../../db/schema.ts"
import type { NutrientRepository } from "../types.ts"
import type { NutrientEntry } from "@wc/types"

type Schema = typeof import("../../db/schema.ts")
type DB = BunSQLiteDatabase<Schema>

function toRow(entry: NutrientEntry) {
  return {
    id:         entry.id,
    name:       entry.name,
    unit:       entry.unit,
    targetable: entry.targetable ? 1 : 0,
  }
}

function fromRow(row: typeof table.$inferSelect): NutrientEntry {
  return {
    id:         row.id,
    name:       row.name,
    unit:       row.unit,
    targetable: Boolean(row.targetable),
  }
}

export class DrizzleNutrientRepository implements NutrientRepository {
  constructor(private db: DB) {}

  async findAll(): Promise<NutrientEntry[]> {
    const rows = await this.db.select().from(table)
    return rows.map(fromRow)
  }

  async findById(id: string): Promise<NutrientEntry | null> {
    const rows = await this.db.select().from(table).where(eq(table.id, id))
    return rows[0] ? fromRow(rows[0]) : null
  }

  async create(entry: NutrientEntry): Promise<NutrientEntry | null> {
    if (await this.findById(entry.id)) return null
    await this.db.insert(table).values(toRow(entry))
    return entry
  }

  async update(id: string, patch: Partial<Pick<NutrientEntry, "name" | "unit" | "targetable">>): Promise<NutrientEntry | null> {
    const existing = await this.findById(id)
    if (!existing) return null
    const updated: NutrientEntry = { ...existing, ...patch }
    await this.db.update(table).set(toRow(updated)).where(eq(table.id, id))
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false
    await this.db.delete(table).where(eq(table.id, id))
    return true
  }
}
