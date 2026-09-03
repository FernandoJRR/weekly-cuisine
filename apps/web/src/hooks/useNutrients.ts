import { useState, useCallback, useEffect } from "react"
import type { NutrientEntry } from "@wc/types"
import { api } from "../api"

/** Server-state mirror for the nutrient registry. Port of apps/tui/src/hooks/useNutrients.ts. */
export function useNutrients() {
  const [nutrients, setNutrients] = useState<NutrientEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const rows = await api.getNutrients()
      setNutrients([...rows].sort((a, b) => a.id.localeCompare(b.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const add = useCallback(async (entry: NutrientEntry): Promise<boolean> => {
    try {
      await api.createNutrient(entry)
      await refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [refresh])

  const update = useCallback(async (id: string, patch: Partial<Pick<NutrientEntry, "name" | "unit" | "targetable">>): Promise<boolean> => {
    try {
      await api.updateNutrient(id, patch)
      await refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    try {
      await api.deleteNutrient(id)
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
    nutrients, loading, error, modalOpen, confirmOpen,
    add, update, remove,
    openModal, closeModal, openConfirm, closeConfirm,
  }
}
