import type { Recipe, Ingredient, WeeklyPlan, PlanRecord, GroceryItem, NutrientEntry } from "@wc/types"
import type { DiagnosisItem, SolveResult } from "@wc/engine"

const BASE = process.env["API_URL"] ?? "http://localhost:3000"

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  getIngredients:   () => req<Ingredient[]>("/ingredients"),
  createIngredient: (data: unknown) => req<Ingredient>("/ingredients", { method: "POST", body: JSON.stringify(data) }),
  updateIngredient: (id: string, data: unknown) => req<Ingredient>(`/ingredients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteIngredient: (id: string) => req<void>(`/ingredients/${id}`, { method: "DELETE" }),

  getRecipes:   () => req<Recipe[]>("/recipes"),
  createRecipe: (data: unknown) => req<Recipe>("/recipes", { method: "POST", body: JSON.stringify(data) }),
  updateRecipe: (id: string, data: unknown) => req<Recipe>(`/recipes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRecipe: (id: string) => req<void>(`/recipes/${id}`, { method: "DELETE" }),

  getPlans:    () => req<PlanRecord[]>("/plans"),
  createPlan:  (data: unknown) => req<PlanRecord>("/plans", { method: "POST", body: JSON.stringify(data) }),
  updatePlan:  (id: string, data: unknown) => req<PlanRecord>(`/plans/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePlan:  (id: string) => req<void>(`/plans/${id}`, { method: "DELETE" }),
  planGrocery: (plan: WeeklyPlan) => req<GroceryItem[]>("/plan/grocery", { method: "POST", body: JSON.stringify(plan) }),
  planSolve:   (plan: WeeklyPlan) => req<{ diagnosis: DiagnosisItem[]; solution: SolveResult }>("/plan/solve", { method: "POST", body: JSON.stringify({ plan }) }),

  getNutrients:    () => req<NutrientEntry[]>("/nutrients"),
  createNutrient:  (data: unknown) => req<NutrientEntry>("/nutrients", { method: "POST", body: JSON.stringify(data) }),
  updateNutrient:  (id: string, data: unknown) => req<NutrientEntry>(`/nutrients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteNutrient:  (id: string) => req<void>(`/nutrients/${id}`, { method: "DELETE" }),
}
