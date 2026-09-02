import { useState, useCallback, useEffect } from "react"
import type { NutrientEntry } from "@wc/types"
import { api } from "../api"

export function useNutrients() {
  const [nutrients, setNutrients] = useState<NutrientEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function refresh() {
    try {
      const rows = await api.getNutrients()
      setNutrients([...rows].sort((a, b) => a.id.localeCompare(b.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const add = useCallback(async (entry: NutrientEntry): Promise<boolean> => {
    try {
      await api.createNutrient(entry)
      await refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [])

  const update = useCallback(async (id: string, patch: Partial<Pick<NutrientEntry, "name" | "unit" | "targetable">>): Promise<boolean> => {
    try {
      await api.updateNutrient(id, patch)
      await refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await api.deleteNutrient(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

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
