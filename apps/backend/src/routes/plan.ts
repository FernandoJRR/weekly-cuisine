import type { IngredientRepository, RecipeRepository, NutrientRepository } from "../repositories/types.ts"
import { weeklyPlanSchema, solveRequestSchema } from "../validation/schemas.ts"
import { deriveGroceryList, deriveRecipeNutrients, diagnose, solve } from "@wc/engine"
import type { CandidateRecipe } from "@wc/engine"
import { ok, badRequest, parseBody } from "./helpers.ts"

export function planRoutes(
  ingRepo: IngredientRepository,
  recipeRepo: RecipeRepository,
  nutrientRepo: NutrientRepository,
) {
  return {
    async grocery(req: Request) {
      const body = await parseBody(req)
      const parsed = weeklyPlanSchema.safeParse(body)
      if (!parsed.success) return badRequest(parsed.error.message)

      const rawPlan = parsed.data
      const plan = { ...rawPlan, id: rawPlan.id ?? "adhoc" }
      const recipeIds = [...new Set(plan.cookEvents.map(e => e.recipeId))]
      const [allRecipes, allIngredients] = await Promise.all([
        recipeRepo.findAll(),
        ingRepo.findAll(),
      ])
      const recipes = allRecipes.filter(r => recipeIds.includes(r.id))
      const list = deriveGroceryList(plan, recipes, allIngredients)
      return ok(list)
    },

    async solve(req: Request) {
      const body = await parseBody(req)
      const parsed = solveRequestSchema.safeParse(body)
      if (!parsed.success) return badRequest(parsed.error.message)

      const { plan: rawPlan, registry } = parsed.data
      const plan = { ...rawPlan, id: rawPlan.id ?? "adhoc" }
      const reg = registry ?? (await nutrientRepo.findAll())
      const [allRecipes, allIngredients] = await Promise.all([
        recipeRepo.findAll(),
        ingRepo.findAll(),
      ])

      const candidates: CandidateRecipe[] = allRecipes.map(r => ({
        recipeId: r.id,
        nutrientsPerServing: (() => {
          try { return deriveRecipeNutrients(r, allIngredients) }
          catch { return {} }
        })(),
      }))

      const diagnosis  = diagnose(candidates, plan.goals, reg)
      const solution   = solve(candidates, plan.goals, reg)
      return ok({ diagnosis, solution })
    },
  }
}
