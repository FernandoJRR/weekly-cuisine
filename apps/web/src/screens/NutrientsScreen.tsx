import { useEffect, useState, type FormEvent } from "react"
import type { NutrientEntry } from "@wc/types"
import { useFlash } from "../App"
import { useNutrients } from "../hooks/useNutrients"
import { Button } from "../components/Button"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { DataTable, type DataTableColumn } from "../components/DataTable"
import { FormField } from "../components/FormField"
import { KeyHint } from "../components/KeyHint"
import { Modal } from "../components/Modal"
import { Tag } from "../components/Tag"
import { TextInput } from "../components/TextInput"
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

  const columns: DataTableColumn<NutrientEntry>[] = [
    { key: "name", header: "name", render: n => n.name },
    { key: "id", header: "id", render: n => n.id },
    { key: "unit", header: "unit", render: n => n.unit, align: "right", width: "20%" },
  ]

  return (
    <div className={s.screen}>
      {/* List pane */}
      <section className={s.list}>
        <header className={s.paneHeader}>
          <h1 className={s.paneTitle}>nutrients</h1>
          <span className={s.spacer} />
          <Button variant="primary" onClick={openAdd}>add</Button>
        </header>
        <DataTable
          columns={columns}
          rows={nutrients}
          rowKey={n => n.id}
          onRowClick={n => setSelectedId(n.id)}
          isActive={n => n.id === selected?.id}
          emptyMessage={loading ? "loading…" : "no nutrients yet"}
          footer={loading ? "loading…" : `${nutrients.length} ${nutrients.length === 1 ? "entry" : "entries"}`}
        />
        <footer className={s.paneFooter}>
          <KeyHint hints={["a=add", "e=edit", "d=delete"]} />
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
            <Tag
              label={selected.targetable ? "targetable" : "informational"}
              variant={selected.targetable ? "success" : "neutral"}
            />
            <div className={s.detailActions}>
              <Button onClick={() => openEdit(selected)}>edit</Button>
              <Button variant="danger" onClick={openConfirm}>delete</Button>
            </div>
          </div>
        ) : (
          <p className={s.empty}>{loading ? "loading…" : "no nutrients yet — add one to get started"}</p>
        )}
      </section>

      {/* Add / edit modal */}
      {modalOpen && (
        <Modal
          title={editingId ? `edit nutrient ${editingId}` : "add nutrient"}
          onClose={closeModal}
          onSubmit={save}
          footerHint={<KeyHint hints={["esc=cancel"]} />}
          footer={
            <>
              <Button onClick={closeModal}>cancel</Button>
              <Button variant="primary" type="submit">save</Button>
            </>
          }
        >
          <FormField
            label="id"
            hint={!editingId ? "lowercase slug — letters, digits, underscores" : undefined}
          >
            <TextInput
              value={draft.id}
              disabled={editingId !== null}
              placeholder="e.g. sodium"
              autoFocus={editingId === null}
              onChange={e => setDraft(d => ({ ...d, id: e.target.value }))}
            />
          </FormField>
          <FormField label="name">
            <TextInput
              value={draft.name}
              autoFocus={editingId !== null}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            />
          </FormField>
          <FormField label="unit">
            <TextInput
              value={draft.unit}
              placeholder="e.g. mg"
              onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}
            />
          </FormField>
          <label className={s.toggle}>
            <input
              type="checkbox"
              checked={draft.targetable}
              onChange={e => setDraft(d => ({ ...d, targetable: e.target.checked }))}
            />
            targetable
          </label>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmOpen && selected && (
        <ConfirmDialog
          itemName={selected.name}
          onConfirm={confirmDelete}
          onCancel={closeConfirm}
        />
      )}
    </div>
  )
}
