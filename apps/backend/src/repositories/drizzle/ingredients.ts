import { eq } from "drizzle-orm"
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite"
import { ingredients as table } from "../../db/schema.ts"
import type { IngredientRepository } from "../types.ts"
import { allocateId } from "./ids.ts"
import { sqlite } from "../../db/client.ts"
import type { Ingredient, NutrientBasis } from "@wc/types"

type Schema = typeof import("../../db/schema.ts")
type DB = BunSQLiteDatabase<Schema>

function toRow(ing: Ingredient) {
  return {
    id:         ing.id,
    name:       ing.name,
    category:   ing.category,
    basis:      JSON.stringify(ing.basis),
    density:    ing.density ?? null,
    unitWeight: ing.unitWeight ?? null,
    created_at: ing.created_at,
  }
}

function fromRow(row: typeof table.$inferSelect): Ingredient {
  return {
    id:         row.id,
    name:       row.name,
    category:   row.category,
    basis:      JSON.parse(row.basis) as NutrientBasis,
    density:    row.density ?? undefined,
    unitWeight: row.unitWeight ?? undefined,
    created_at: row.created_at,
  }
}

export class DrizzleIngredientRepository implements IngredientRepository {
  constructor(private db: DB) {}

  async findAll(): Promise<Ingredient[]> {
    const rows = await this.db.select().from(table)
    return rows.map(fromRow)
  }

  async findById(id: string): Promise<Ingredient | null> {
    const rows = await this.db.select().from(table).where(eq(table.id, id))
    return rows[0] ? fromRow(rows[0]) : null
  }

  async create(data: Omit<Ingredient, "id" | "created_at">): Promise<Ingredient> {
    const ing: Ingredient = {
      ...data,
      id: allocateId(sqlite, "ING"),
      created_at: new Date().toISOString().slice(0, 10),
    }
    await this.db.insert(table).values(toRow(ing))
    return ing
  }

  async update(id: string, patch: Partial<Omit<Ingredient, "id" | "created_at">>): Promise<Ingredient | null> {
    const existing = await this.findById(id)
    if (!existing) return null
    const updated: Ingredient = { ...existing, ...patch }
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
