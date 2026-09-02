import { useEffect, useState, type FormEvent } from "react"
import type { Ingredient, NutrientBasis, NutrientEntry } from "@wc/types"
import { useFlash } from "../App"
import { useIngredients } from "../hooks/useIngredients"
import { useNutrients } from "../hooks/useNutrients"
import { Button } from "../components/Button"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { DataTable, type DataTableColumn } from "../components/DataTable"
import { FormField } from "../components/FormField"
import { KeyHint } from "../components/KeyHint"
import { Modal } from "../components/Modal"
import { TextInput } from "../components/TextInput"
import s from "./IngredientsScreen.module.css"

interface IngredientDraft {
  name: string
  category: string
  refQty: string
  refUnit: string
  nutrients: Record<string, string>
}

// Reserved: nutrient ids that would shadow one of the four fixed fields never
// render as a generated row, matching apps/tui/src/screens/IngredientsScreen.tsx.
const FIXED_FIELDS = ["name", "category", "refQty", "refUnit"] as const
type FixedField = (typeof FIXED_FIELDS)[number]

const EMPTY_DRAFT: IngredientDraft = { name: "", category: "", refQty: "100", refUnit: "g", nutrients: {} }

const RESERVED: ReadonlySet<string> = new Set<string>(FIXED_FIELDS)

function visibleNutrients(registry: NutrientEntry[]): NutrientEntry[] {
  return registry.filter(n => !RESERVED.has(n.id))
}

function draftToBasis(d: IngredientDraft): NutrientBasis {
  const nutrients: Record<string, number> = {}
  for (const [id, raw] of Object.entries(d.nutrients)) {
    const v = parseFloat(raw)
    if (!isNaN(v) && v >= 0) nutrients[id] = v
  }
  return {
    refQty: parseFloat(d.refQty) || 100,
    refUnit: d.refUnit.trim() || "g",
    nutrients,
  }
}

function ingredientToDraft(ing: Ingredient): IngredientDraft {
  const nutrients: Record<string, string> = {}
  for (const [id, amt] of Object.entries(ing.basis.nutrients)) {
    nutrients[id] = String(amt)
  }
  return {
    name: ing.name,
    category: ing.category,
    refQty: String(ing.basis.refQty),
    refUnit: ing.basis.refUnit,
    nutrients,
  }
}

export function IngredientsScreen() {
  const flash = useFlash()
  const {
    ingredients, loading, error, modalOpen, confirmOpen,
    add, update, remove,
    openModal, closeModal, openConfirm, closeConfirm,
  } = useIngredients()
  const { nutrients } = useNutrients()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<IngredientDraft>(EMPTY_DRAFT)

  useEffect(() => { if (error) flash(error) }, [error, flash])

  const selected = ingredients.find(i => i.id === selectedId) ?? ingredients[0] ?? null
  const rows = visibleNutrients(nutrients)

  function openAdd() {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    openModal()
  }

  function openEdit(ing: Ingredient) {
    setDraft(ingredientToDraft(ing))
    setEditingId(ing.id)
    openModal()
  }

  function setFixed(field: FixedField, value: string) {
    setDraft(d => ({ ...d, [field]: value }))
  }

  function setNutrient(id: string, value: string) {
    setDraft(d => ({ ...d, nutrients: { ...d.nutrients, [id]: value } }))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const name = draft.name.trim()
    if (!name) { flash("name is required"); return }
    const basis = draftToBasis(draft)

    if (editingId) {
      const okd = await update(editingId, { name, category: draft.category.trim(), basis })
      if (okd) flash(`updated "${name}"`)
      closeModal()
      return
    }

    const newId = await add({ name, category: draft.category.trim(), basis })
    if (newId) { flash(`added "${name}"`); setSelectedId(newId) }
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

  const columns: DataTableColumn<Ingredient>[] = [
    { key: "name", header: "name", render: i => i.name },
    { key: "category", header: "category", render: i => i.category, width: "40%" },
  ]

  return (
    <div className={s.screen}>
      <section className={s.list}>
        <header className={s.paneHeader}>
          <h1 className={s.paneTitle}>ingredients</h1>
          <span className={s.spacer} />
          <Button variant="primary" onClick={openAdd}>add</Button>
        </header>
        <DataTable
          columns={columns}
          rows={ingredients}
          rowKey={i => i.id}
          onRowClick={i => setSelectedId(i.id)}
          isActive={i => i.id === selected?.id}
          emptyMessage={loading ? "loading…" : "no ingredients yet"}
          footer={loading ? "loading…" : `${ingredients.length} ${ingredients.length === 1 ? "entry" : "entries"}`}
        />
        <footer className={s.paneFooter}>
          <KeyHint hints={["a=add", "e=edit", "d=delete"]} />
        </footer>
      </section>

      <section className={s.detail}>
        {selected ? (
          <div className={s.detailInner}>
            <header className={s.detailHead}>
              <h2 className={s.detailName}>{selected.name}</h2>
              <p className={s.detailMeta}>id: {selected.id}  ·  category: {selected.category}</p>
            </header>
            <p className={s.sectionLabel}>nutrient basis (per {selected.basis.refQty} {selected.basis.refUnit})</p>
            <ul className={s.nutrientList}>
              {Object.entries(selected.basis.nutrients).map(([id, amt]) => (
                <li key={id} className={s.nutrientRow}>
                  <span>{nutrients.find(n => n.id === id)?.name ?? id}</span>
                  <span className={s.nutrientValue}>{typeof amt === "number" ? amt.toFixed(1) : amt}</span>
                </li>
              ))}
              {Object.keys(selected.basis.nutrients).length === 0 && (
                <li className={s.empty}>no nutrient values set</li>
              )}
            </ul>
            {selected.density !== undefined && <p className={s.meta}>density: {selected.density} g/ml</p>}
            {selected.unitWeight !== undefined && <p className={s.meta}>unit weight: {selected.unitWeight} g/piece</p>}
            <div className={s.detailActions}>
              <Button onClick={() => openEdit(selected)}>edit</Button>
              <Button variant="danger" onClick={openConfirm}>delete</Button>
            </div>
          </div>
        ) : (
          <p className={s.empty}>{loading ? "loading…" : "no ingredients yet — add one to get started"}</p>
        )}
      </section>

      {modalOpen && (
        <Modal
          title={editingId ? `edit ${editingId}` : "add ingredient"}
          onClose={closeModal}
          onSubmit={save}
          width={480}
          footerHint={<KeyHint hints={["esc=cancel"]} />}
          footer={
            <>
              <Button onClick={closeModal}>cancel</Button>
              <Button variant="primary" type="submit">save</Button>
            </>
          }
        >
          <FormField label="name">
            <TextInput
              autoFocus
              value={draft.name}
              onChange={e => setFixed("name", e.target.value)}
            />
          </FormField>
          <FormField label="category">
            <TextInput value={draft.category} onChange={e => setFixed("category", e.target.value)} />
          </FormField>
          <div className={s.fieldRow}>
            <FormField label="ref qty">
              <TextInput
                inputMode="decimal"
                value={draft.refQty}
                onChange={e => setFixed("refQty", e.target.value)}
              />
            </FormField>
            <FormField label="ref unit">
              <TextInput value={draft.refUnit} onChange={e => setFixed("refUnit", e.target.value)} />
            </FormField>
          </div>

          {rows.length > 0 && <p className={s.sectionLabel}>nutrients (per ref qty)</p>}
          {rows.map(n => (
            <FormField key={n.id} label={n.name} suffix={n.unit}>
              <TextInput
                inputMode="decimal"
                placeholder="0"
                value={draft.nutrients[n.id] ?? ""}
                onChange={e => setNutrient(n.id, e.target.value)}
              />
            </FormField>
          ))}
          {rows.length === 0 && (
            <p className={s.hintText}>add nutrients in the nutrients screen to see rows here.</p>
          )}
        </Modal>
      )}

      {confirmOpen && selected && (
        <ConfirmDialog
          itemName={selected.name}
          note="ingredients referenced by a recipe cannot be deleted."
          onConfirm={confirmDelete}
          onCancel={closeConfirm}
        />
      )}
    </div>
  )
}
