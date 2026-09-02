import { db } from "./db/client.ts"
import { DrizzleIngredientRepository } from "./repositories/drizzle/ingredients.ts"
import { DrizzleRecipeRepository } from "./repositories/drizzle/recipes.ts"
import { DrizzleNutrientRepository } from "./repositories/drizzle/nutrients.ts"
import { DrizzlePlanRepository } from "./repositories/drizzle/plans.ts"
import { ingredientRoutes } from "./routes/ingredients.ts"
import { recipeRoutes } from "./routes/recipes.ts"
import { nutrientRoutes } from "./routes/nutrients.ts"
import { plansRoutes } from "./routes/plans.ts"
import { planRoutes } from "./routes/plan.ts"
import { methodNotAllowed, notFound, preflight, withCors } from "./routes/helpers.ts"

const ingRepo      = new DrizzleIngredientRepository(db)
const recipeRepo   = new DrizzleRecipeRepository(db)
const nutrientRepo = new DrizzleNutrientRepository(db)
const planRepo     = new DrizzlePlanRepository(db)
const ing          = ingredientRoutes(ingRepo, recipeRepo)
const recipe       = recipeRoutes(recipeRepo)
const nutrient     = nutrientRoutes(nutrientRepo)
const plans        = plansRoutes(planRepo)
const plan         = planRoutes(ingRepo, recipeRepo, nutrientRepo)

const PORT = parseInt(process.env["PORT"] ?? "3000")

/** The router, verbatim: every existing branch, unchanged. CORS is applied by the caller. */
async function handle(req: Request): Promise<Response> {
  const url  = new URL(req.url)
  const path = url.pathname
  const m    = req.method

  try {
    // Ingredients
    if (path === "/ingredients") {
      if (m === "GET")  return await ing.list()
      if (m === "POST") return await ing.create(req)
      return methodNotAllowed()
    }
    if (/^\/ingredients\/[^/]+$/.test(path)) {
      if (m === "GET")    return await ing.get(req)
      if (m === "PATCH")  return await ing.update(req)
      if (m === "DELETE") return await ing.remove(req)
      return methodNotAllowed()
    }

    // Recipes
    if (path === "/recipes") {
      if (m === "GET")  return await recipe.list()
      if (m === "POST") return await recipe.create(req)
      return methodNotAllowed()
    }
    if (/^\/recipes\/[^/]+$/.test(path)) {
      if (m === "GET")    return await recipe.get(req)
      if (m === "PATCH")  return await recipe.update(req)
      if (m === "DELETE") return await recipe.remove(req)
      return methodNotAllowed()
    }

    // Plan
    if (path === "/plan/grocery" && m === "POST") return await plan.grocery(req)
    if (path === "/plan/solve"   && m === "POST") return await plan.solve(req)

    // Nutrients
    if (path === "/nutrients") {
      if (m === "GET")  return await nutrient.list()
      if (m === "POST") return await nutrient.create(req)
      return methodNotAllowed()
    }
    if (/^\/nutrients\/[^/]+$/.test(path)) {
      if (m === "GET")    return await nutrient.get(req)
      if (m === "PATCH")  return await nutrient.update(req)
      if (m === "DELETE") return await nutrient.remove(req)
      return methodNotAllowed()
    }

    // Plans
    if (path === "/plans") {
      if (m === "GET")  return await plans.list()
      if (m === "POST") return await plans.create(req)
      return methodNotAllowed()
    }
    if (/^\/plans\/[^/]+$/.test(path)) {
      if (m === "GET")    return await plans.get(req)
      if (m === "PATCH")  return await plans.update(req)
      if (m === "DELETE") return await plans.remove(req)
      return methodNotAllowed()
    }
    return notFound("Not found")

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method === "OPTIONS") return preflight()
    return withCors(await handle(req))
  },
})

console.log(`Backend running on http://localhost:${server.port}`)
