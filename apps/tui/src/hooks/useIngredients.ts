import { useState, useCallback, useEffect } from "react"
import type { Ingredient } from "@wc/types"
import { api } from "../api"

export function useIngredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelected] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function refresh() {
    try {
      setIngredients(await api.getIngredients())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const add = useCallback(async (draft: Omit<Ingredient, "id" | "created_at">) => {
    try {
      const created = await api.createIngredient(draft)
      await refresh()
      return created.id
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return ""
    }
  }, [])

  const update = useCallback(async (id: string, patch: Partial<Omit<Ingredient, "id" | "created_at">>) => {
    try {
      await api.updateIngredient(id, patch)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await api.deleteIngredient(id)
      if (selectedId === id) setSelected(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [selectedId])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])
  const openConfirm = useCallback(() => setConfirmOpen(true), [])
  const closeConfirm = useCallback(() => setConfirmOpen(false), [])

  return { ingredients, loading, error, selectedId, setSelected, add, update, remove, modalOpen, confirmOpen, openModal, closeModal, openConfirm, closeConfirm }
}
