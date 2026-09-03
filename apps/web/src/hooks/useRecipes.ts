import { useState, useCallback, useEffect } from "react"
import type { CookMode, Recipe } from "@wc/types"
import { api } from "../api"

/**
 * Server-state mirror for recipes. Port of apps/tui/src/hooks/useRecipes.ts — the
 * add/edit modal keeps the boolean modalOpen/confirmOpen shape shared with
 * useIngredients/useNutrients, but cook mode is ported verbatim as the same
 * CookMode state machine the TUI uses (@wc/types), since it is bespoke enough that
 * collapsing it into a boolean would lose the recipeId/stepIndex it carries.
 */
export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cookMode, setCookMode] = useState<CookMode>({ open: false })

  const refresh = useCallback(async () => {
    try {
      setRecipes(await api.getRecipes())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const add = useCallback(async (draft: Omit<Recipe, "id" | "created_at" | "updated_at">): Promise<string> => {
    try {
      const created = await api.createRecipe(draft)
      await refresh()
      return created.id
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return ""
    }
  }, [refresh])

  const update = useCallback(async (id: string, patch: Partial<Omit<Recipe, "id" | "created_at">>): Promise<boolean> => {
    try {
      await api.updateRecipe(id, patch)
      await refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    try {
      await api.deleteRecipe(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [refresh])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])
  const openConfirm = useCallback(() => setConfirmOpen(true), [])
  const closeConfirm = useCallback(() => setConfirmOpen(false), [])

  // Cook mode: verbatim port of apps/tui/src/hooks/useRecipes.ts. nextStep/prevStep
  // clamp against the recipe's step count so the caller never has to guard bounds.
  const openCook = useCallback((recipeId: string) => setCookMode({ open: true, recipeId, stepIndex: 0 }), [])
  const closeCook = useCallback(() => setCookMode({ open: false }), [])
  const nextStep = useCallback((total: number) => {
    setCookMode(prev => prev.open ? { ...prev, stepIndex: Math.min(prev.stepIndex + 1, total - 1) } : prev)
  }, [])
  const prevStep = useCallback(() => {
    setCookMode(prev => prev.open ? { ...prev, stepIndex: Math.max(prev.stepIndex - 1, 0) } : prev)
  }, [])

  return {
    recipes, loading, error, modalOpen, confirmOpen,
    add, update, remove,
    openModal, closeModal, openConfirm, closeConfirm,
    cookMode, openCook, closeCook, nextStep, prevStep,
  }
}
