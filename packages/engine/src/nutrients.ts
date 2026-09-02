import type { Recipe, Ingredient } from "@wc/types"
import { convert } from "./units.ts"

export function deriveRecipeNutrients(
  recipe: Recipe,
  ingredients: Ingredient[],
): Record<string, number> {
  const byId = new Map(ingredients.map(i => [i.id, i]))
  const totals: Record<string, number> = {}

  for (const item of recipe.items) {
    const ing = byId.get(item.ingredientId)
    if (!ing) throw new Error(`Ingredient ${item.ingredientId} not found for recipe ${recipe.id}`)

    const qtyInRefUnit = convert(item.quantity, item.unit, ing.basis.refUnit, ing)
    const scale = qtyInRefUnit / ing.basis.refQty

    for (const [nutrientId, amount] of Object.entries(ing.basis.nutrients)) {
      totals[nutrientId] = (totals[nutrientId] ?? 0) + amount * scale
    }
  }

  const perServing: Record<string, number> = {}
  for (const [id, total] of Object.entries(totals)) {
    perServing[id] = total / recipe.yield
  }
  return perServing
}
