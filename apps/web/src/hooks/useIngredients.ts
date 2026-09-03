import { useState, useCallback, useEffect } from "react"
import type { Ingredient } from "@wc/types"
import { api } from "../api"

/** Server-state mirror for ingredients. Port of apps/tui/src/hooks/useIngredients.ts. */
export function useIngredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setIngredients(await api.getIngredients())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const add = useCallback(async (draft: Omit<Ingredient, "id" | "created_at">): Promise<string> => {
    try {
      const created = await api.createIngredient(draft)
      await refresh()
      return created.id
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return ""
    }
  }, [refresh])

  const update = useCallback(async (id: string, patch: Partial<Omit<Ingredient, "id" | "created_at">>): Promise<boolean> => {
    try {
      await api.updateIngredient(id, patch)
      await refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    try {
      await api.deleteIngredient(id)
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
    ingredients, loading, error, modalOpen, confirmOpen,
    add, update, remove,
    openModal, closeModal, openConfirm, closeConfirm,
  }
}
