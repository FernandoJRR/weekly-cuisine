import type { NutrientGoal, NutrientEntry } from "@wc/types"

export interface CandidateRecipe {
  recipeId: string
  nutrientsPerServing: Record<string, number>
}

export interface DiagnosisItem {
  nutrientId: string
  target: number
  achievableMax: number
  feasible: boolean
  warning?: string
}

export interface SolveResult {
  feasible: boolean
  servings: Record<string, number>
  deviation: number
}

const MAX_SERVINGS_PER_RECIPE = 7

export function diagnose(
  candidates: CandidateRecipe[],
  goals: NutrientGoal[],
  registry: NutrientEntry[],
): DiagnosisItem[] {
  const targetable = new Set(registry.filter(e => e.targetable).map(e => e.id))

  return goals
    .filter(g => targetable.has(g.nutrientId))
    .map(g => {
      const achievableMax = candidates.reduce((sum, c) => {
        const n = c.nutrientsPerServing[g.nutrientId] ?? 0
        return sum + n * MAX_SERVINGS_PER_RECIPE
      }, 0)

      const tolerance = g.target * (g.tolerancePct / 100)
      const feasible = achievableMax >= g.target - tolerance

      return {
        nutrientId: g.nutrientId,
        target: g.target,
        achievableMax,
        feasible,
        warning: feasible
          ? undefined
          : `${g.nutrientId}: target ${g.target} unreachable — max combo is ${achievableMax.toFixed(1)}`,
      }
    })
}

export function solve(
  candidates: CandidateRecipe[],
  goals: NutrientGoal[],
  registry: NutrientEntry[],
): SolveResult {
  if (goals.length === 0 || candidates.length === 0) {
    return { feasible: true, servings: {}, deviation: 0 }
  }

  const targetable = new Set(registry.filter(e => e.targetable).map(e => e.id))
  const activeGoals = goals.filter(g => targetable.has(g.nutrientId))

  const servings: Record<string, number> = Object.fromEntries(
    candidates.map(c => [c.recipeId, 0])
  )

  function totalDeviation(s: Record<string, number>): number {
    return activeGoals.reduce((sum, g) => {
      const actual = candidates.reduce((acc, c) => acc + (c.nutrientsPerServing[g.nutrientId] ?? 0) * (s[c.recipeId] ?? 0), 0)
      const tolerance = g.target * (g.tolerancePct / 100)
      const diff = Math.max(0, Math.abs(actual - g.target) - tolerance)
      return sum + diff
    }, 0)
  }

  // Greedy hill climbing: at each step add the serving that most reduces deviation
  let improved = true
  while (improved) {
    improved = false
    const current = totalDeviation(servings)
    let bestGain = 0
    let bestRecipeId: string | null = null

    for (const c of candidates) {
      if ((servings[c.recipeId] ?? 0) >= MAX_SERVINGS_PER_RECIPE) continue
      const trial = { ...servings, [c.recipeId]: (servings[c.recipeId] ?? 0) + 1 }
      const gain = current - totalDeviation(trial)
      if (gain > bestGain) {
        bestGain = gain
        bestRecipeId = c.recipeId
      }
    }

    if (bestRecipeId !== null) {
      servings[bestRecipeId] = (servings[bestRecipeId] ?? 0) + 1
      improved = true
    }
  }

  const deviation = totalDeviation(servings)
  const feasible = deviation === 0

  return { feasible, servings, deviation }
}
