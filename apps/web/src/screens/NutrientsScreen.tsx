import { useEffect, useState, type FormEvent } from "react"
import type { NutrientEntry } from "@wc/types"
import { useFlash } from "../App"
import { useNutrients } from "../hooks/useNutrients"
import { KeyHint } from "../components/KeyHint"
import s from "./NutrientsScreen.module.css"

interface NutrientDraft {
  id: string
  name: string
  unit: string
  targetable: boolean
}

const EMPTY_DRAFT: NutrientDraft = { id: "", name: "", unit: "", targetable: true }

/** Same slug rule the TUI enforces before POSTing a client-supplied nutrient id. */
const ID_PATTERN = /^[a-z][a-z0-9_]*$/

export function NutrientsScreen() {
  const flash = useFlash()
  const {
    nutrients, loading, error, modalOpen, confirmOpen,
    add, update, remove,
    openModal, closeModal, openConfirm, closeConfirm,
  } = useNutrients()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<NutrientDraft>(EMPTY_DRAFT)

  // The shell owns the flash channel; hook errors surface through it, as in the TUI.
  useEffect(() => { if (error) flash(error) }, [error, flash])

  // Esc closes the topmost overlay (the global keymap proper lands in phase 5).
  useEffect(() => {
    if (!modalOpen && !confirmOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (confirmOpen) closeConfirm()
      else closeModal()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [modalOpen, confirmOpen, closeModal, closeConfirm])

  const selected = nutrients.find(n => n.id === selectedId) ?? nutrients[0] ?? null

  function openAdd() {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    openModal()
  }

  function openEdit(entry: NutrientEntry) {
    setDraft({ id: entry.id, name: entry.name, unit: entry.unit, targetable: entry.targetable })
    setEditingId(entry.id)
    openModal()
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const name = draft.name.trim()
    const unit = draft.unit.trim()
    if (!name) { flash("name is required"); return }
    if (!unit) { flash("unit is required"); return }

    if (editingId) {
      const okd = await update(editingId, { name, unit, targetable: draft.targetable })
      if (okd) flash(`updated "${name}"`)
      closeModal()
      return
    }

    const id = draft.id.trim().toLowerCase().replace(/\s+/g, "_")
    if (!id) { flash("id is required"); return }
    if (!ID_PATTERN.test(id)) { flash("id must be a slug like 'sodium'"); return }
    if (nutrients.some(n => n.id === id)) { flash(`nutrient ${id} already exists`); return }
    const okd = await add({ id, name, unit, targetable: draft.targetable })
    if (okd) { flash(`added "${name}"`); setSelectedId(id) }
    closeModal()
  }

  async function confirmDelete() {
    if (!selected) return
    const { id, name } = selected
    closeConfirm()
    await remove(id)
    setSelectedId(null)
    flash(`deleted "${name}"`)
  }

  return (
    <div className={s.screen}>
      {/* List pane */}
      <section className={s.list}>
        <header className={s.paneHeader}>
          <h1 className={s.paneTitle}>nutrients</h1>
          <span className={s.spacer} />
          <button type="button" className={`${s.button} ${s.buttonPrimary}`} onClick={openAdd}>
            [ ADD ]
          </button>
        </header>
        <div className={s.rows}>
          {nutrients.map(entry => (
            <button
              type="button"
              key={entry.id}
              className={entry.id === selected?.id ? `${s.row} ${s.rowActive}` : s.row}
              onClick={() => setSelectedId(entry.id)}
            >
              <span className={s.rowName}>{entry.name}</span>
              <span className={s.rowMeta}>{entry.id} · {entry.unit}</span>
            </button>
          ))}
        </div>
        <footer className={s.paneFooter}>
          {loading ? "loading…" : `${nutrients.length} ${nutrients.length === 1 ? "entry" : "entries"}`}
        </footer>
      </section>

      {/* Detail pane */}
      <section className={s.detail}>
        {selected ? (
          <div className={s.detailInner}>
            <header className={s.detailHead}>
              <h2 className={s.detailName}>{selected.name}</h2>
              <p className={s.detailMeta}>id: {selected.id}  ·  unit: {selected.unit}</p>
            </header>
            <span className={selected.targetable ? `${s.tag} ${s.tagSuccess}` : s.tag}>
              [{selected.targetable ? "targetable" : "informational"}]
            </span>
            <div className={s.detailActions}>
              <button type="button" className={s.button} onClick={() => openEdit(selected)}>[ EDIT ]</button>
              <button type="button" className={`${s.button} ${s.buttonDanger}`} onClick={openConfirm}>[ DELETE ]</button>
            </div>
          </div>
        ) : (
          <p className={s.empty}>{loading ? "loading…" : "no nutrients yet — add one to get started"}</p>
        )}
      </section>

      {/* Add / edit modal */}
      {modalOpen && (
        <div
          className={s.backdrop}
          role="presentation"
          onClick={closeModal}
        >
          <form
            className={s.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "edit nutrient" : "add nutrient"}
            onClick={e => e.stopPropagation()}
            onSubmit={save}
          >
            <div className={s.dialogTitle}>{editingId ? `edit nutrient ${editingId}` : "add nutrient"}</div>
            <div className={s.dialogBody}>
              <label className={s.field}>
                <span className={s.label}>id</span>
                <input
                  className={s.input}
                  value={draft.id}
                  disabled={editingId !== null}
                  placeholder="e.g. sodium"
                  autoFocus={editingId === null}
                  onChange={e => setDraft(d => ({ ...d, id: e.target.value }))}
                />
                {!editingId && <span className={s.hint}>lowercase slug — letters, digits, underscores</span>}
              </label>
              <label className={s.field}>
                <span className={s.label}>name</span>
                <input
                  className={s.input}
                  value={draft.name}
                  autoFocus={editingId !== null}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                />
              </label>
              <label className={s.field}>
                <span className={s.label}>unit</span>
                <input
                  className={s.input}
                  value={draft.unit}
                  placeholder="e.g. mg"
                  onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}
                />
              </label>
              <label className={s.toggle}>
                <input
                  type="checkbox"
                  checked={draft.targetable}
                  onChange={e => setDraft(d => ({ ...d, targetable: e.target.checked }))}
                />
                targetable
              </label>
            </div>
            <div className={s.dialogFooter}>
              <KeyHint hints={["esc=cancel"]} />
              <span className={s.spacer} />
              <button type="button" className={s.button} onClick={closeModal}>[ CANCEL ]</button>
              <button type="submit" className={`${s.button} ${s.buttonPrimary}`}>[ SAVE ]</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirm */}
      {confirmOpen && selected && (
        <div className={s.backdrop} role="presentation" onClick={closeConfirm}>
          <div
            className={`${s.dialog} ${s.dialogDanger}`}
            role="alertdialog"
            aria-modal="true"
            aria-label="confirm delete"
            onClick={e => e.stopPropagation()}
          >
            <div className={s.dialogTitle}>confirm</div>
            <div className={s.dialogBody}>
              <p className={s.confirmText}>delete &quot;{selected.name}&quot;?</p>
              <p className={s.confirmNote}>this cannot be undone.</p>
            </div>
            <div className={s.dialogFooter}>
              <span className={s.spacer} />
              <button type="button" className={s.button} onClick={closeConfirm}>[ CANCEL ]</button>
              <button type="button" className={`${s.button} ${s.buttonDanger}`} onClick={confirmDelete}>[ DELETE ]</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
