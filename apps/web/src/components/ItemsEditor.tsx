import { useState, type KeyboardEvent } from "react"
import type { Ingredient, RecipeItem } from "@wc/types"
import { Button } from "./Button"
import { TextInput } from "./TextInput"
import s from "./ItemsEditor.module.css"

interface ItemDraft {
  ingredientId: string
  quantity: string
  unit: string
}

const EMPTY: ItemDraft = { ingredientId: "", quantity: "", unit: "g" }

export interface NewRecipeItem {
  ingredientId: string
  quantity: number
  unit: string
}

interface ItemsEditorProps {
  /** Current draft items, already carrying client-assigned ids. */
  items: RecipeItem[]
  /** Registry driving the ingredient picker — same "load from live data" pattern as everywhere else. */
  ingredients: Ingredient[]
  onAdd: (item: NewRecipeItem) => void
  onRemove: (index: number) => void
}

/** Recipe items sub-form: ingredient select + qty + unit. Port of the TUI's inline item form. */
export function ItemsEditor({ items, ingredients, onAdd, onRemove }: ItemsEditorProps) {
  const [draft, setDraft] = useState<ItemDraft>(EMPTY)

  function ingredientName(id: string): string {
    return ingredients.find(i => i.id === id)?.name ?? id
  }

  function commit() {
    const qty = parseFloat(draft.quantity)
    if (!draft.ingredientId || isNaN(qty) || qty <= 0 || !draft.unit.trim()) return
    onAdd({ ingredientId: draft.ingredientId, quantity: qty, unit: draft.unit.trim() })
    setDraft(EMPTY)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault()
      event.stopPropagation()
      commit()
    }
  }

  return (
    <div className={s.editor}>
      <p className={s.sectionLabel}>items</p>
      <ul className={s.list}>
        {items.map((item, i) => (
          <li key={item.id ?? i} className={s.row}>
            <span className={s.rowName}>{ingredientName(item.ingredientId)}</span>
            <span className={s.rowQty}>{item.quantity} {item.unit}</span>
            <button
              type="button"
              className={s.remove}
              onClick={() => onRemove(i)}
              aria-label={`remove ${ingredientName(item.ingredientId)}`}
            >
              ×
            </button>
          </li>
        ))}
        {items.length === 0 && <li className={s.empty}>no items yet</li>}
      </ul>
      <div className={s.addRow} onKeyDown={onKeyDown}>
        <select
          className={s.select}
          value={draft.ingredientId}
          onChange={e => setDraft(d => ({ ...d, ingredientId: e.target.value }))}
        >
          <option value="">select ingredient…</option>
          {ingredients.map(ing => (
            <option key={ing.id} value={ing.id}>{ing.name}</option>
          ))}
        </select>
        <TextInput
          className={s.qtyInput}
          inputMode="decimal"
          placeholder="qty"
          value={draft.quantity}
          onChange={e => setDraft(d => ({ ...d, quantity: e.target.value }))}
        />
        <TextInput
          className={s.unitInput}
          placeholder="unit"
          value={draft.unit}
          onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}
        />
        <Button onClick={commit}>add item</Button>
      </div>
      {ingredients.length === 0 && (
        <p className={s.hintText}>add ingredients in the ingredients screen first.</p>
      )}
    </div>
  )
}
