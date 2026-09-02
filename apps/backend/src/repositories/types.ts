import type { Ingredient, Recipe, NutrientEntry, WeeklyPlan } from "@wc/types"

export interface IngredientRepository {
  findAll(): Promise<Ingredient[]>
  findById(id: string): Promise<Ingredient | null>
  create(data: Omit<Ingredient, "id" | "created_at">): Promise<Ingredient>
  update(id: string, patch: Partial<Omit<Ingredient, "id" | "created_at">>): Promise<Ingredient | null>
  delete(id: string): Promise<boolean>
}

export interface RecipeRepository {
  findAll(): Promise<Recipe[]>
  findById(id: string): Promise<Recipe | null>
  findReferencingIngredient(ingredientId: string): Promise<Recipe[]>
  create(data: Omit<Recipe, "id" | "created_at" | "updated_at">): Promise<Recipe>
  update(id: string, patch: Partial<Omit<Recipe, "id" | "created_at">>): Promise<Recipe | null>
  delete(id: string): Promise<boolean>
}

export interface NutrientRepository {
  findAll(): Promise<NutrientEntry[]>
  findById(id: string): Promise<NutrientEntry | null>
  create(entry: NutrientEntry): Promise<NutrientEntry | null> // null if id exists
  update(id: string, patch: Partial<Pick<NutrientEntry, "name" | "unit" | "targetable">>): Promise<NutrientEntry | null>
  delete(id: string): Promise<boolean>
}

import type { PlanRecord } from "@wc/types"
export type { PlanRecord }

export interface PlanRepository {
  findAll(): Promise<PlanRecord[]>
  findById(id: string): Promise<PlanRecord | null>
  create(plan: WeeklyPlan): Promise<PlanRecord> // assigns PLAN-####, overwriting plan.id
  update(id: string, patch: Partial<Pick<WeeklyPlan, "mode" | "cookEvents" | "goals">>): Promise<PlanRecord | null>
  delete(id: string): Promise<boolean>
}
