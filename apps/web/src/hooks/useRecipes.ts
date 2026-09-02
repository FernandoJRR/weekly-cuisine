import { useState, useCallback, useEffect } from "react"
import type { Recipe } from "@wc/types"
import { api } from "../api"

/**
 * Server-state mirror for recipes. Port of apps/tui/src/hooks/useRecipes.ts, minus
 * the ModalMode/CookMode state machines — this phase uses the same boolean
 * modalOpen/confirmOpen shape as useIngredients/useNutrients; cook-mode state lands
 * in Phase 5.
 */
export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

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

  return {
    recipes, loading, error, modalOpen, confirmOpen,
    add, update, remove,
    openModal, closeModal, openConfirm, closeConfirm,
  }
}
