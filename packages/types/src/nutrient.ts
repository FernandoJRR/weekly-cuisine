export interface NutrientEntry {
  id: string
  name: string
  unit: string
  targetable: boolean
}

export interface NutrientGoal {
  nutrientId: string
  target: number
  tolerancePct: number
}
