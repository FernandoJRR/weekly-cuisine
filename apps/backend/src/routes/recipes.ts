import type { RecipeRepository } from "../repositories/types.ts"
import { createRecipeSchema, updateRecipeSchema } from "../validation/schemas.ts"
import { ok, created, noContent, badRequest, notFound, parseBody, idParam } from "./helpers.ts"

export function recipeRoutes(recipeRepo: RecipeRepository) {
  return {
    async list() {
      return ok(await recipeRepo.findAll())
    },

    async get(req: Request) {
      const id = idParam(req)
      const recipe = await recipeRepo.findById(id)
      return recipe ? ok(recipe) : notFound(`Recipe ${id} not found`)
    },

    async create(req: Request) {
      const body = await parseBody(req)
      const parsed = createRecipeSchema.safeParse(body)
      if (!parsed.success) return badRequest(parsed.error.message)
      const recipe = await recipeRepo.create(parsed.data)
      return created(recipe)
    },

    async update(req: Request) {
      const id = idParam(req)
      const body = await parseBody(req)
      const parsed = updateRecipeSchema.safeParse(body)
      if (!parsed.success) return badRequest(parsed.error.message)
      try {
        const updated = await recipeRepo.update(id, parsed.data)
        return updated ? ok(updated) : notFound(`Recipe ${id} not found`)
      } catch (err) {
        return badRequest(err instanceof Error ? err.message : String(err))
      }
    },

    async remove(req: Request) {
      const id = idParam(req)
      const deleted = await recipeRepo.delete(id)
      return deleted ? noContent() : notFound(`Recipe ${id} not found`)
    },
  }
}
