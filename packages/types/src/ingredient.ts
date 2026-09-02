export interface NutrientBasis {
  refQty: number
  refUnit: string
  nutrients: Record<string, number>
}

export interface Ingredient {
  id: string
  name: string
  category: string
  basis: NutrientBasis
  density?: number
  unitWeight?: number
  created_at: string
}
