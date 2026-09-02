import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core"

export const ingredients = sqliteTable("ingredients", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  category:    text("category").notNull(),
  basis:       text("basis").notNull(),       // JSON: NutrientBasis
  density:     real("density"),               // g/ml, nullable
  unitWeight:  real("unit_weight"),           // g/piece, nullable
  created_at:  text("created_at").notNull(),
})

export const recipes = sqliteTable("recipes", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  yield:       real("yield").notNull(),
  tags:        text("tags").notNull(),        // JSON: string[]
  description: text("description"),
  prep_time:   integer("prep_time"),          // minutes, nullable
  cook_time:   integer("cook_time"),          // minutes, nullable
  created_at:  text("created_at").notNull(),
  updated_at:  text("updated_at").notNull(),
})

export const recipeItems = sqliteTable("recipe_items", {
  id:            text("id").primaryKey(),
  recipe_id:     text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  ingredient_id: text("ingredient_id").notNull(),
  quantity:      real("quantity").notNull(),
  unit:          text("unit").notNull(),
  position:      integer("position").notNull(),
})

export const recipeSteps = sqliteTable("recipe_steps", {
  id:        text("id").primaryKey(),
  recipe_id: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  position:  integer("position").notNull(),
  body:      text("body").notNull(),
  title:     text("title"),
  timer:     integer("timer"),                // seconds, nullable
  item_refs: text("item_refs").notNull(),     // JSON: string[]
})

export const nutrientRegistry = sqliteTable("nutrient_registry", {
  id:         text("id").primaryKey(),
  name:       text("name").notNull(),
  unit:       text("unit").notNull(),
  targetable: integer("targetable").notNull(), // 0/1 boolean
})

export const plans = sqliteTable("plans", {
  id:          text("id").primaryKey(),
  mode:        text("mode").notNull(),
  cook_events: text("cook_events").notNull(), // JSON: CookEvent[]
  goals:       text("goals").notNull(),       // JSON: NutrientGoal[]
  created_at:  text("created_at").notNull(),
  updated_at:  text("updated_at").notNull(),
})

export const idSeq = sqliteTable("id_seq", {
  name: text("name").primaryKey(),
  next: integer("next").notNull(),
})
