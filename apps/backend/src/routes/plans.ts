import type { PlanRepository } from "../repositories/types.ts"
import { weeklyPlanSchema, updatePlanSchema } from "../validation/schemas.ts"
import { ok, created, noContent, badRequest, notFound, parseBody, idParam } from "./helpers.ts"

export function plansRoutes(planRepo: PlanRepository) {
  return {
    async list() {
      return ok(await planRepo.findAll())
    },

    async get(req: Request) {
      const id = idParam(req)
      const plan = await planRepo.findById(id)
      return plan ? ok(plan) : notFound(`Plan ${id} not found`)
    },

    async create(req: Request) {
      const body = await parseBody(req)
      const parsed = weeklyPlanSchema.safeParse(body)
      if (!parsed.success) return badRequest(parsed.error.message)
      const rawPlan = parsed.data
      const plan = { ...rawPlan, id: rawPlan.id ?? "adhoc" }
      const record = await planRepo.create(plan)
      return created(record)
    },

    async update(req: Request) {
      const id = idParam(req)
      const body = await parseBody(req)
      const parsed = updatePlanSchema.safeParse(body)
      if (!parsed.success) return badRequest(parsed.error.message)
      const updated = await planRepo.update(id, parsed.data)
      return updated ? ok(updated) : notFound(`Plan ${id} not found`)
    },

    async remove(req: Request) {
      const id = idParam(req)
      const deleted = await planRepo.delete(id)
      return deleted ? noContent() : notFound(`Plan ${id} not found`)
    },
  }
}
