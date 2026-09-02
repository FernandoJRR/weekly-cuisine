import { eq, inArray } from "drizzle-orm"
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite"
import { recipes as table, recipeItems as itemsTable, recipeSteps as stepsTable } from "../../db/schema.ts"
import type { RecipeRepository } from "../types.ts"
import { allocateId } from "./ids.ts"
import { sqlite } from "../../db/client.ts"
import type { Recipe, RecipeItem, RecipeStep } from "@wc/types"

type Schema = typeof import("../../db/schema.ts")
type DB = BunSQLiteDatabase<Schema>

// ---- Row converters ----

function toRow(r: Recipe) {
  return {
    id:          r.id,
    name:        r.name,
    yield:       r.yield,
    tags:        JSON.stringify(r.tags),
    description: r.description ?? null,
    prep_time:   r.prepTime ?? null,
    cook_time:   r.cookTime ?? null,
    created_at:  r.created_at,
    updated_at:  r.updated_at,
  }
}

function toItemRows(recipeId: string, items: RecipeItem[]) {
  return items.map((item, i) => ({
    id:            item.id || `${recipeId}-I${i + 1}`,
    recipe_id:     recipeId,
    ingredient_id: item.ingredientId,
    quantity:      item.quantity,
    unit:          item.unit,
    position:      i,
  }))
}

function toStepRows(recipeId: string, steps: RecipeStep[]) {
  return steps.map((step, i) => ({
    id:        step.id || `${recipeId}-S${i + 1}`,
    recipe_id: recipeId,
    position:  i,
    body:      step.body,
    title:     step.title ?? null,
    timer:     step.timer ?? null,
    item_refs: JSON.stringify(step.itemRefs ?? []),
  }))
}

function assembleRecipe(
  row: typeof table.$inferSelect,
  items: (typeof itemsTable.$inferSelect)[],
  steps: (typeof stepsTable.$inferSelect)[],
): Recipe {
  return {
    id:    row.id,
    name:  row.name,
    items: [...items]
      .sort((a, b) => a.position - b.position)
      .map(it => ({ id: it.id, ingredientId: it.ingredient_id, quantity: it.quantity, unit: it.unit })),
    steps: [...steps]
      .sort((a, b) => a.position - b.position)
      .map(s => ({
        id:       s.id,
        body:     s.body,
        title:    s.title ?? undefined,
        timer:    s.timer ?? undefined,
        itemRefs: JSON.parse(s.item_refs) as string[],
      })),
    yield:       row.yield,
    tags:        JSON.parse(row.tags) as string[],
    description: row.description ?? undefined,
    prepTime:    row.prep_time ?? undefined,
    cookTime:    row.cook_time ?? undefined,
    created_at:  row.created_at,
    updated_at:  row.updated_at,
  }
}

// ---- Repository ----

export class DrizzleRecipeRepository implements RecipeRepository {
  constructor(private db: DB) {}

  async findAll(): Promise<Recipe[]> {
    const rows = await this.db.select().from(table)
    if (rows.length === 0) return []
    const ids = rows.map(r => r.id)
    const [allItems, allSteps] = await Promise.all([
      this.db.select().from(itemsTable).where(inArray(itemsTable.recipe_id, ids)),
      this.db.select().from(stepsTable).where(inArray(stepsTable.recipe_id, ids)),
    ])
    return rows.map(row =>
      assembleRecipe(
        row,
        allItems.filter(it => it.recipe_id === row.id),
        allSteps.filter(s => s.recipe_id === row.id),
      )
    )
  }

  async findById(id: string): Promise<Recipe | null> {
    const rows = await this.db.select().from(table).where(eq(table.id, id))
    if (!rows[0]) return null
    const [items, steps] = await Promise.all([
      this.db.select().from(itemsTable).where(eq(itemsTable.recipe_id, id)),
      this.db.select().from(stepsTable).where(eq(stepsTable.recipe_id, id)),
    ])
    return assembleRecipe(rows[0], items, steps)
  }

  async findReferencingIngredient(ingredientId: string): Promise<Recipe[]> {
    const refs = await this.db
      .select({ recipe_id: itemsTable.recipe_id })
      .from(itemsTable)
      .where(eq(itemsTable.ingredient_id, ingredientId))
    if (refs.length === 0) return []
    const ids = [...new Set(refs.map(r => r.recipe_id))]
    return Promise.all(ids.map(id => this.findById(id).then(r => r!)))
  }

  async create(data: Omit<Recipe, "id" | "created_at" | "updated_at">): Promise<Recipe> {
    const now = new Date().toISOString().slice(0, 10)
    const recipe: Recipe = { ...data, id: allocateId(sqlite, "RCP"), created_at: now, updated_at: now }
    await this.db.insert(table).values(toRow(recipe))
    if (recipe.items.length > 0) {
      await this.db.insert(itemsTable).values(toItemRows(recipe.id, recipe.items))
    }
    if (recipe.steps.length > 0) {
      await this.db.insert(stepsTable).values(toStepRows(recipe.id, recipe.steps))
    }
    return this.findById(recipe.id).then(r => r!)
  }

  async update(id: string, patch: Partial<Omit<Recipe, "id" | "created_at">>): Promise<Recipe | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    // Guard: a step itemRef must resolve to an item that will still exist after the update
    if (patch.items !== undefined) {
      const incomingIds = new Set(patch.items.map(it => it.id).filter(Boolean))
      const steps = patch.steps ?? existing.steps
      for (const step of steps) {
        for (const ref of step.itemRefs ?? []) {
          if (!incomingIds.has(ref)) {
            throw new Error(`Cannot remove item "${ref}" — step "${step.title || step.body}" references it`)
          }
        }
      }
    }

    const updated: Recipe = { ...existing, ...patch, updated_at: new Date().toISOString().slice(0, 10) }
    await this.db.update(table).set(toRow(updated)).where(eq(table.id, id))

    if (patch.items !== undefined) {
      await this.db.delete(itemsTable).where(eq(itemsTable.recipe_id, id))
      if (updated.items.length > 0) {
        await this.db.insert(itemsTable).values(toItemRows(id, updated.items))
      }
    }

    if (patch.steps !== undefined) {
      await this.db.delete(stepsTable).where(eq(stepsTable.recipe_id, id))
      if (updated.steps.length > 0) {
        await this.db.insert(stepsTable).values(toStepRows(id, updated.steps))
      }
    }

    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false
    await this.db.delete(table).where(eq(table.id, id))
    return true
  }
}
