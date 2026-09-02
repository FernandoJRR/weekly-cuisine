import { useState, useCallback, useEffect } from "react"
import type { WeeklyPlan, PlanRecord, GroceryItem } from "@wc/types"
import type { DiagnosisItem, SolveResult } from "@wc/engine"
import { api } from "../api"

export function usePlans() {
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function refresh() {
    try {
      setPlans(await api.getPlans())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const add = useCallback(async (draft: Omit<WeeklyPlan, "id">): Promise<string> => {
    try {
      const created = await api.createPlan(draft)
      await refresh()
      return created.id
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return ""
    }
  }, [])

  const update = useCallback(async (id: string, patch: Partial<Omit<WeeklyPlan, "id">>): Promise<void> => {
    try {
      await api.updatePlan(id, patch)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await api.deletePlan(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const grocery = useCallback(async (plan: WeeklyPlan): Promise<GroceryItem[]> => {
    return api.planGrocery(plan)
  }, [])

  const solve = useCallback(async (plan: WeeklyPlan): Promise<{ diagnosis: DiagnosisItem[]; solution: SolveResult }> => {
    return api.planSolve(plan)
  }, [])

  const openAdd = useCallback(() => {
    setEditingId(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((id: string) => {
    setEditingId(id)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingId(null)
  }, [])

  const openConfirm = useCallback(() => setConfirmOpen(true), [])
  const closeConfirm = useCallback(() => setConfirmOpen(false), [])

  return {
    plans, loading, error, modalOpen, confirmOpen, editingId,
    add, update, remove, grocery, solve,
    openAdd, openEdit, closeModal, openConfirm, closeConfirm,
  }
}
