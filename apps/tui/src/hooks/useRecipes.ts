import { useState, useCallback, useEffect } from "react"
import type { Recipe, ModalMode, CookMode } from "@wc/types"
import { api } from "../api"

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelected] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalMode>({ open: false })
  const [cookMode, setCookMode] = useState<CookMode>({ open: false })
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function refresh() {
    try {
      setRecipes(await api.getRecipes())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const add = useCallback(async (draft: Omit<Recipe, "id" | "created_at" | "updated_at">) => {
    try {
      const created = await api.createRecipe(draft)
      await refresh()
      return created.id
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return ""
    }
  }, [])

  const update = useCallback(async (id: string, patch: Partial<Omit<Recipe, "id" | "created_at">>) => {
    try {
      await api.updateRecipe(id, patch)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await api.deleteRecipe(id)
      if (selectedId === id) setSelected(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [selectedId])

  const openAdd  = useCallback(() => setModal({ open: true, mode: "add" }), [])
  const openEdit = useCallback((id: string) => setModal({ open: true, mode: "edit", recipeId: id }), [])
  const closeModal = useCallback(() => setModal({ open: false }), [])
  const openConfirm = useCallback(() => setConfirmOpen(true), [])
  const closeConfirm = useCallback(() => setConfirmOpen(false), [])

  const openCook = useCallback((recipeId: string) => setCookMode({ open: true, recipeId, stepIndex: 0 }), [])
  const closeCook = useCallback(() => setCookMode({ open: false }), [])
  const nextStep = useCallback((total: number) => {
    setCookMode(prev => prev.open ? { ...prev, stepIndex: Math.min(prev.stepIndex + 1, total - 1) } : prev)
  }, [])
  const prevStep = useCallback(() => {
    setCookMode(prev => prev.open ? { ...prev, stepIndex: Math.max(prev.stepIndex - 1, 0) } : prev)
  }, [])

  return {
    recipes, loading, error,
    selectedId, setSelected,
    modal, cookMode, confirmOpen,
    add, update, remove,
    openAdd, openEdit, closeModal,
    openConfirm, closeConfirm,
    openCook, closeCook, nextStep, prevStep,
  }
}
