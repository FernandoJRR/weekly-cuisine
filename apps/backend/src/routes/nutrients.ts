import type { NutrientRepository } from "../repositories/types.ts"
import { createNutrientSchema, updateNutrientSchema } from "../validation/schemas.ts"
import { ok, created, noContent, badRequest, notFound, conflict, parseBody, idParam } from "./helpers.ts"

export function nutrientRoutes(nutrientRepo: NutrientRepository) {
  return {
    async list() {
      return ok(await nutrientRepo.findAll())
    },

    async get(req: Request) {
      const id = idParam(req)
      const nutrient = await nutrientRepo.findById(id)
      return nutrient ? ok(nutrient) : notFound(`Nutrient ${id} not found`)
    },

    async create(req: Request) {
      const body = await parseBody(req)
      const parsed = createNutrientSchema.safeParse(body)
      if (!parsed.success) return badRequest(parsed.error.message)
      const createdEntry = await nutrientRepo.create(parsed.data)
      return createdEntry ? created(createdEntry) : conflict(`Nutrient ${parsed.data.id} already exists`)
    },

    async update(req: Request) {
      const id = idParam(req)
      const body = await parseBody(req)
      const parsed = updateNutrientSchema.safeParse(body)
      if (!parsed.success) return badRequest(parsed.error.message)
      const updated = await nutrientRepo.update(id, parsed.data)
      return updated ? ok(updated) : notFound(`Nutrient ${id} not found`)
    },

    async remove(req: Request) {
      const id = idParam(req)
      const deleted = await nutrientRepo.delete(id)
      return deleted ? noContent() : notFound(`Nutrient ${id} not found`)
    },
  }
}
