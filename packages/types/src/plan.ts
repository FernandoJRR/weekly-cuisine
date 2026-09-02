import type { Measurable } from "./common"
import type { NutrientGoal } from "./nutrient"

export type PlanMode = "daily-cook" | "meal-prep"

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner"

export interface CookEvent {
  recipeId: string
  yield: number
  day: number
  slot: MealSlot
}

export interface WeeklyPlan {
  id: string
  mode: PlanMode
  cookEvents: CookEvent[]
  goals: NutrientGoal[]
}

export interface PlanRecord extends WeeklyPlan {
  created_at: string
  updated_at: string
}

export interface GroceryItem extends Measurable {
  ingredientId: string
  ingredientName: string
}
