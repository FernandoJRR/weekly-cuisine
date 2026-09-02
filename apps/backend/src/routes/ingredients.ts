import type { IngredientRepository, RecipeRepository } from "../repositories/types.ts"
import { createIngredientSchema, updateIngredientSchema } from "../validation/schemas.ts"
import { ok, created, noContent, badRequest, notFound, conflict, parseBody, idParam } from "./helpers.ts"

export function ingredientRoutes(
  ingRepo: IngredientRepository,
  recipeRepo: RecipeRepository,
) {
  return {
    async list() {
      return ok(await ingRepo.findAll())
    },

    async get(req: Request) {
      const id = idParam(req)
      const ing = await ingRepo.findById(id)
      return ing ? ok(ing) : notFound(`Ingredient ${id} not found`)
    },

    async create(req: Request) {
      const body = await parseBody(req)
      const parsed = createIngredientSchema.safeParse(body)
      if (!parsed.success) return badRequest(parsed.error.message)
      const ing = await ingRepo.create(parsed.data)
      return created(ing)
    },

    async update(req: Request) {
      const id = idParam(req)
      const body = await parseBody(req)
      const parsed = updateIngredientSchema.safeParse(body)
      if (!parsed.success) return badRequest(parsed.error.message)
      const updated = await ingRepo.update(id, parsed.data)
      return updated ? ok(updated) : notFound(`Ingredient ${id} not found`)
    },

    async remove(req: Request) {
      const id = idParam(req)
      const referencing = await recipeRepo.findReferencingIngredient(id)
      if (referencing.length > 0) {
        return conflict(`Ingredient ${id} is referenced by ${referencing.length} recipe(s). Delete those first.`)
      }
      const deleted = await ingRepo.delete(id)
      return deleted ? noContent() : notFound(`Ingredient ${id} not found`)
    },
  }
}
