import { z } from "zod"

// ---- Shared ----

const nutrientBasisSchema = z.object({
  refQty:    z.number().positive(),
  refUnit:   z.string().min(1),
  nutrients: z.record(z.string(), z.number()),
})

const recipeItemSchema = z.object({
  id:           z.string().optional(),
  ingredientId: z.string().min(1),
  quantity:     z.number().positive(),
  unit:         z.string().min(1),
})

const recipeStepSchema = z.object({
  id:       z.string().optional(),
  body:     z.string().min(1),
  title:    z.string().optional(),
  timer:    z.number().int().positive().optional(),
  itemRefs: z.array(z.string()).optional(),
})

// ---- Ingredient ----

export const createIngredientSchema = z.object({
  name:       z.string().min(1),
  category:   z.string().min(1),
  basis:      nutrientBasisSchema,
  density:    z.number().positive().optional(),
  unitWeight: z.number().positive().optional(),
})

export const updateIngredientSchema = createIngredientSchema.partial()

// ---- Recipe ----

export const createRecipeSchema = z.object({
  name:        z.string().min(1),
  items:       z.array(recipeItemSchema).min(1),
  steps:       z.array(recipeStepSchema).default([]),
  yield:       z.number().positive(),
  tags:        z.array(z.string()).default([]),
  prepTime:    z.number().int().positive().optional(),
  cookTime:    z.number().int().positive().optional(),
  description: z.string().optional(),
})

export const updateRecipeSchema = createRecipeSchema.partial()

// ---- Plan ----

const cookEventSchema = z.object({
  recipeId: z.string().min(1),
  yield:    z.number().positive(),
  day:      z.number().int().min(0).max(6),
  slot:     z.enum(["breakfast", "lunch", "snack", "dinner"]),
})

const nutrientGoalSchema = z.object({
  nutrientId:   z.string().min(1),
  target:       z.number().positive(),
  tolerancePct: z.number().min(0).max(100),
})

export const weeklyPlanSchema = z.object({
  id:          z.string().min(1).optional(),
  mode:        z.enum(["daily-cook", "meal-prep"]),
  cookEvents:  z.array(cookEventSchema),
  goals:       z.array(nutrientGoalSchema).default([]),
})

export const updatePlanSchema = z.object({
  mode:       z.enum(["daily-cook", "meal-prep"]).optional(),
  cookEvents: z.array(cookEventSchema).optional(),
  goals:      z.array(nutrientGoalSchema).optional(),
})

export const solveRequestSchema = z.object({
  plan:     weeklyPlanSchema,
  registry: z.array(z.object({
    id:         z.string(),
    name:       z.string(),
    unit:       z.string(),
    targetable: z.boolean(),
  })).optional(),
})

// ---- Nutrient ----

export const createNutrientSchema = z.object({
  id:         z.string().min(1),
  name:       z.string().min(1),
  unit:       z.string().min(1),
  targetable: z.boolean(),
})

export const updateNutrientSchema = createNutrientSchema.omit({ id: true }).partial()

// ---- Helpers ----

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>
export type CreateRecipeInput     = z.infer<typeof createRecipeSchema>
export type UpdateRecipeInput     = z.infer<typeof updateRecipeSchema>
export type WeeklyPlanInput       = z.infer<typeof weeklyPlanSchema>
export type SolveRequestInput     = z.infer<typeof solveRequestSchema>
export type UpdatePlanInput        = z.infer<typeof updatePlanSchema>
export type CreateNutrientInput    = z.infer<typeof createNutrientSchema>
export type UpdateNutrientInput    = z.infer<typeof updateNutrientSchema>
