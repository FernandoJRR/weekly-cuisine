import type { WeeklyPlan, Recipe, Ingredient, GroceryItem } from "@wc/types"
import { convert, baseUnit } from "./units.ts"

export function deriveGroceryList(
  plan: WeeklyPlan,
  recipes: Recipe[],
  ingredients: Ingredient[],
): GroceryItem[] {
  const byRecipeId = new Map(recipes.map(r => [r.id, r]))
  const byIngId = new Map(ingredients.map(i => [i.id, i]))

  // Accumulate each ingredient in its base unit (g, ml, or pcs)
  const accumulated = new Map<string, { qty: number; unit: string }>()

  for (const event of plan.cookEvents) {
    const recipe = byRecipeId.get(event.recipeId)
    if (!recipe) continue
    const scale = event.yield / recipe.yield

    for (const item of recipe.items) {
      const ing = byIngId.get(item.ingredientId)
      const base = baseUnit(item.unit)
      const baseQty = convert(item.quantity, item.unit, base, ing) * scale

      const prev = accumulated.get(item.ingredientId)
      if (prev) {
        prev.qty += baseQty
      } else {
        accumulated.set(item.ingredientId, { qty: baseQty, unit: base })
      }
    }
  }

  return Array.from(accumulated.entries()).map(([ingredientId, { qty, unit }]) => {
    const ing = byIngId.get(ingredientId)!
    return { ingredientId, ingredientName: ing.name, quantity: qty, unit }
  })
}
