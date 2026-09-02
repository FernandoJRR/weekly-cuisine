export type Screen =
  | "recipes"
  | "ingredients"
  | "nutrients"
  | "search"
  | "plan"

export type ModalMode =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; recipeId: string }

export type CookMode =
  | { open: false }
  | { open: true; recipeId: string; stepIndex: number }

export type TagVariant =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
