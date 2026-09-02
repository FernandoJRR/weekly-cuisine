import { useState, type KeyboardEvent } from "react"
import type { CookEvent, MealSlot, Recipe } from "@wc/types"
import { Button } from "./Button"
import { TextInput } from "./TextInput"
import s from "./CookEventsEditor.module.css"

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SLOT_NAMES: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"]

interface EventDraft {
  recipeId: string
  day: number
  slot: MealSlot
  yield: string
}

const EMPTY: EventDraft = { recipeId: "", day: 0, slot: "breakfast", yield: "1" }

interface CookEventsEditorProps {
  /** Current draft events. */
  events: CookEvent[]
  /** Registry driving the recipe picker — same "load from live data" pattern as ItemsEditor. */
  recipes: Recipe[]
  onAdd: (event: CookEvent) => void
  onRemove: (index: number) => void
}

/** Plan cook-event sub-form: recipe / day / slot / yield rows. Port of the TUI's inline event form. */
export function CookEventsEditor({ events, recipes, onAdd, onRemove }: CookEventsEditorProps) {
  const [draft, setDraft] = useState<EventDraft>(EMPTY)

  function recipeName(id: string): string {
    return recipes.find(r => r.id === id)?.name ?? id
  }

  function commit() {
    const yield_ = parseFloat(draft.yield)
    if (!draft.recipeId || isNaN(yield_) || yield_ <= 0) return
    onAdd({ recipeId: draft.recipeId, day: draft.day, slot: draft.slot, yield: yield_ })
    setDraft(d => ({ ...EMPTY, recipeId: d.recipeId }))
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
      <p className={s.sectionLabel}>cook events</p>
      <ul className={s.list}>
        {events.map((event, i) => (
          <li key={i} className={s.row}>
            <span className={s.rowName}>
              {DAY_NAMES[event.day]} {event.slot} · {recipeName(event.recipeId)}
            </span>
            <span className={s.rowQty}>×{event.yield}</span>
            <button
              type="button"
              className={s.remove}
              onClick={() => onRemove(i)}
              aria-label={`remove ${recipeName(event.recipeId)} on ${DAY_NAMES[event.day]}`}
            >
              ×
            </button>
          </li>
        ))}
        {events.length === 0 && <li className={s.empty}>no cook events yet</li>}
      </ul>
      <div className={s.addRow} onKeyDown={onKeyDown}>
        <select
          className={s.select}
          value={draft.recipeId}
          onChange={e => setDraft(d => ({ ...d, recipeId: e.target.value }))}
        >
          <option value="">select recipe…</option>
          {recipes.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          className={s.selectNarrow}
          value={draft.day}
          onChange={e => setDraft(d => ({ ...d, day: Number(e.target.value) }))}
        >
          {DAY_NAMES.map((name, i) => (
            <option key={name} value={i}>{name}</option>
          ))}
        </select>
        <select
          className={s.selectNarrow}
          value={draft.slot}
          onChange={e => setDraft(d => ({ ...d, slot: e.target.value as MealSlot }))}
        >
          {SLOT_NAMES.map(slot => (
            <option key={slot} value={slot}>{slot}</option>
          ))}
        </select>
        <TextInput
          className={s.yieldInput}
          inputMode="decimal"
          placeholder="yield"
          value={draft.yield}
          onChange={e => setDraft(d => ({ ...d, yield: e.target.value }))}
        />
        <Button onClick={commit}>add event</Button>
      </div>
      {recipes.length === 0 && (
        <p className={s.hintText}>add recipes in the recipes screen first.</p>
      )}
    </div>
  )
}
