import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { color, space } from "../tokens"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { KeyHint } from "../components/KeyHint"
import type { Ingredient, NutrientBasis, NutrientEntry } from "@wc/types"

// --- Modal form state ---
interface IngredientDraft {
  name: string
  category: string
  refQty: string
  refUnit: string
  nutrients: Record<string, string>
}

const FIXED_FIELDS = ["name", "category", "refQty", "refUnit"] as const
type FixedField = typeof FIXED_FIELDS[number]
type ModalField = FixedField | string // registry nutrient ids beyond the fixed four

const EMPTY_DRAFT: IngredientDraft = {
  name: "", category: "", refQty: "100", refUnit: "g", nutrients: {},
}

// Nutrient ids that would shadow a fixed field are skipped in the form.
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

// --- Props ---
interface IngredientsScreenProps {
  active: boolean
  ingredients: Ingredient[]
  nutrients: NutrientEntry[]
  onAdd: (draft: Omit<Ingredient, "id" | "created_at">) => Promise<string>
  onUpdate: (id: string, patch: Partial<Omit<Ingredient, "id" | "created_at">>) => Promise<void>
  onRemove: (id: string) => Promise<void>
  modalOpen: boolean
  confirmOpen: boolean
  onOpenModal: () => void
  onCloseModal: () => void
  onOpenConfirm: () => void
  onCloseConfirm: () => void
  onFlash: (msg: string) => void
}

export function IngredientsScreen({
  active, ingredients, nutrients, onAdd, onUpdate, onRemove, onFlash,
  modalOpen, confirmOpen, onOpenModal, onCloseModal, onOpenConfirm, onCloseConfirm,
}: IngredientsScreenProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<IngredientDraft>(EMPTY_DRAFT)
  const [focusedField, setFocusedField] = useState<ModalField>("name")

  const selected = ingredients[selectedIdx] ?? null

  const rows = visibleNutrients(nutrients)
  const fieldOrder: ModalField[] = [...FIXED_FIELDS, ...rows.map(r => r.id)]

  function openAdd() {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setFocusedField("name")
    onOpenModal()
  }

  function openEdit(ing: Ingredient) {
    setDraft(ingredientToDraft(ing))
    setEditingId(ing.id)
    setFocusedField("name")
    onOpenModal()
  }

  function saveModal() {
    if (!draft.name.trim()) { onFlash("Name is required"); return }
    const basis = draftToBasis(draft)
    if (editingId) {
      onUpdate(editingId, { name: draft.name.trim(), category: draft.category.trim(), basis })
      onFlash(`Updated "${draft.name.trim()}"`)
    } else {
      onAdd({ name: draft.name.trim(), category: draft.category.trim(), basis })
      onFlash(`Added "${draft.name.trim()}"`)
    }
    onCloseModal()
  }

  useKeyboard((key) => {
    if (!active) return

    if (confirmOpen) return // ConfirmDialog handles its own keys

    if (modalOpen) {
      if (key.name === "escape") { onCloseModal(); return }
      if (key.name === "tab" && !key.shift) {
        const idx = fieldOrder.indexOf(focusedField)
        setFocusedField(fieldOrder[(idx + 1) % fieldOrder.length]!)
        return
      }
      if (key.name === "tab" && key.shift) {
        const idx = fieldOrder.indexOf(focusedField)
        setFocusedField(fieldOrder[(idx - 1 + fieldOrder.length) % fieldOrder.length]!)
        return
      }
      if (key.name === "return") { saveModal(); return }
      return
    }

    if (key.name === "up") setSelectedIdx(i => Math.max(0, i - 1))
    if (key.name === "down") setSelectedIdx(i => Math.min(ingredients.length - 1, i + 1))
    if (key.name === "a") openAdd()
    if (key.name === "e" && selected) openEdit(selected)
    if (key.name === "d" && selected) onOpenConfirm()
  })

  function fieldValue(field: ModalField): string {
    if (field === "name" || field === "category" || field === "refQty" || field === "refUnit") {
      return draft[field]
    }
    return draft.nutrients[field] ?? ""
  }

  function setField(field: ModalField, value: string) {
    if (field === "name" || field === "category" || field === "refQty" || field === "refUnit") {
      setDraft(d => ({ ...d, [field]: value }))
    } else {
      setDraft(d => ({ ...d, nutrients: { ...d.nutrients, [field]: value } }))
    }
  }

  const LABELS: Record<FixedField, string> = {
    name: "Name", category: "Category",
    refQty: "Ref qty", refUnit: "Ref unit",
  }

  const modalHeight = 14 + fieldOrder.length

  return (
    <box flexGrow={1} flexDirection="row" backgroundColor={color.bg.base}>
      {/* List pane */}
      <box
        width={34}
        flexDirection="column"
        border={["right"]}
        borderColor={color.bg.border}
      >
        <box
          paddingX={space[2]}
          paddingY={1}
          border={["bottom"]}
          borderColor={color.bg.border}
        >
          <text fg={color.text.muted} attributes={TextAttributes.BOLD}>Ingredients</text>
        </box>
        <select
          flexGrow={1}
          options={ingredients.map(i => ({ name: i.name, description: i.category }))}
          focused={active && !modalOpen && !confirmOpen}
          selectedIndex={selectedIdx}
          showDescription={true}
          onChange={(idx) => setSelectedIdx(idx)}
          backgroundColor={color.bg.base}
          textColor={color.text.default}
          focusedBackgroundColor={color.bg.elevated}
          focusedTextColor={color.accent.mid}
          selectedBackgroundColor={color.bg.elevated}
          selectedTextColor={color.accent.mid}
          descriptionColor={color.text.dim}
          selectedDescriptionColor={color.text.muted}
        />
        <box padding={space[2]}>
          <KeyHint hints={["a=add", "e=edit", "d=delete"]} />
        </box>
      </box>

      {/* Detail pane */}
      <box flexGrow={1} flexDirection="column" padding={space[4]}>
        {selected ? (
          <>
            <box border={["bottom"]} borderColor={color.bg.border} paddingBottom={1} marginBottom={space[2]}>
              <text fg={color.accent.mid} attributes={TextAttributes.BOLD}>{selected.name}</text>
              <text fg={color.text.dim}>ID: {selected.id}  ·  Category: {selected.category}</text>
            </box>
            <text fg={color.text.muted} attributes={TextAttributes.BOLD} marginBottom={space[2]}>
              Nutrient Basis (per {selected.basis.refQty} {selected.basis.refUnit}):
            </text>
            {Object.entries(selected.basis.nutrients).map(([id, amt]) => (
              <text key={id} fg={color.text.default}>
                {nutrients.find(n => n.id === id)?.name ?? id}: {typeof amt === "number" ? amt.toFixed(1) : amt}
              </text>
            ))}
            {selected.density !== undefined && (
              <text fg={color.text.dim} marginTop={space[2]}>Density: {selected.density} g/ml</text>
            )}
            {selected.unitWeight !== undefined && (
              <text fg={color.text.dim}>Unit weight: {selected.unitWeight} g/piece</text>
            )}
          </>
        ) : (
          <text fg={color.text.dim}>Select an ingredient</text>
        )}
      </box>

      {/* Add / Edit modal */}
      {modalOpen && (
        <box
          position="absolute"
          top={1} left={4} width={60} height={modalHeight}
          backgroundColor={color.bg.elevated}
          border={true}
          borderStyle="double"
          borderColor={color.accent.mid}
          title={editingId ? " Edit Ingredient " : " Add Ingredient "}
          titleAlignment="center"
          flexDirection="column"
          padding={space[2]}
          gap={1}
        >
          {FIXED_FIELDS.map(field => (
            <box key={field} flexDirection="row" alignItems="center" gap={space[2]}>
              <text fg={color.text.muted} width={16}>{LABELS[field]}:</text>
              <box flexGrow={1} backgroundColor={focusedField === field ? color.bg.overlay : color.bg.surface}>
                <input
                  flexGrow={1}
                  focused={focusedField === field}
                  value={draft[field]}
                  onInput={v => setField(field, v)}
                />
              </box>
            </box>
          ))}
          {rows.map(n => {
            const label = n.unit ? `${n.name} (${n.unit})` : n.name
            return (
              <box key={n.id} flexDirection="row" alignItems="center" gap={space[2]}>
                <text fg={color.text.muted} width={16}>{label}:</text>
                <box flexGrow={1} backgroundColor={focusedField === n.id ? color.bg.overlay : color.bg.surface}>
                  <input
                    flexGrow={1}
                    focused={focusedField === n.id}
                    value={fieldValue(n.id)}
                    onInput={v => setField(n.id, v)}
                  />
                </box>
              </box>
            )
          })}
          {rows.length === 0 && (
            <text fg={color.text.dim}>Add nutrients in the Nutrients tab to see rows here.</text>
          )}
          <box marginTop={space[2]}>
            <KeyHint hints={["Tab=next field", "Enter=save", "Esc=cancel"]} />
          </box>
        </box>
      )}

      {/* Confirm delete dialog */}
      {confirmOpen && selected && (
        <ConfirmDialog
          itemName={selected.name}
          onConfirm={() => {
            const name = selected.name
            onRemove(selected.id)
            onCloseConfirm()
            setSelectedIdx(i => Math.max(0, i - 1))
            onFlash(`Deleted "${name}"`)
          }}
          onCancel={onCloseConfirm}
        />
      )}
    </box>
  )
}
