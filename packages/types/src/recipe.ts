import type { Measurable } from "./common"

export interface RecipeItem extends Measurable {
  id?: string   // assigned by backend on create; always present after retrieval
  ingredientId: string
}

export interface RecipeStep {
  id?: string   // assigned by backend on create; always present after retrieval
  body: string
  title?: string
  timer?: number      // seconds
  itemRefs?: string[] // item IDs
}

export interface Recipe {
  id: string
  name: string
  items: RecipeItem[]
  steps: RecipeStep[]
  yield: number
  tags: string[]
  prepTime?: number   // minutes
  cookTime?: number   // minutes
  description?: string
  created_at: string
  updated_at: string
}
