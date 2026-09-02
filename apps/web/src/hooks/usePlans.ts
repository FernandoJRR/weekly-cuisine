import { useState, useCallback, useEffect } from "react"
import type { WeeklyPlan, PlanRecord, GroceryItem } from "@wc/types"
import type { DiagnosisItem, SolveResult } from "@wc/engine"
import { api } from "../api"

/**
 * Server-state mirror for plans. Port of apps/tui/src/hooks/usePlans.ts, kept in the
 * same modalOpen/confirmOpen shape as useIngredients/useRecipes/useNutrients (the
 * screen owns editingId, same as RecipesScreen/IngredientsScreen).
 *
 * grocery()/solve() deliberately do NOT catch. Every other mutator here swallows its
 * error into `error` and never re-throws, but a failed computation needs to flash
 * without looking like a stale list error, so these two propagate to the caller —
 * matching apps/tui/src/hooks/usePlans.ts, where PlanScreen does its own try/catch.
 */
export function usePlans() {
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setPlans(await api.getPlans())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const add = useCallback(async (draft: Omit<WeeklyPlan, "id">): Promise<string> => {
    try {
      const created = await api.createPlan(draft)
      await refresh()
      return created.id
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return ""
    }
  }, [refresh])

  const update = useCallback(async (id: string, patch: Partial<Omit<WeeklyPlan, "id">>): Promise<boolean> => {
    try {
      await api.updatePlan(id, patch)
      await refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    try {
      await api.deletePlan(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [refresh])

  const grocery = useCallback((plan: WeeklyPlan): Promise<GroceryItem[]> => {
    return api.planGrocery(plan)
  }, [])

  const solve = useCallback((plan: WeeklyPlan): Promise<{ diagnosis: DiagnosisItem[]; solution: SolveResult }> => {
    return api.planSolve(plan)
  }, [])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])
  const openConfirm = useCallback(() => setConfirmOpen(true), [])
  const closeConfirm = useCallback(() => setConfirmOpen(false), [])

  return {
    plans, loading, error, modalOpen, confirmOpen,
    add, update, remove, grocery, solve,
    openModal, closeModal, openConfirm, closeConfirm,
  }
}
