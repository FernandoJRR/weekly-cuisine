import { useState, type KeyboardEvent } from "react"
import type { Ingredient, RecipeItem, RecipeStep } from "@wc/types"
import { Button } from "./Button"
import { TextInput } from "./TextInput"
import s from "./StepsEditor.module.css"

interface StepDraft {
  title: string
  body: string
  timer: string
  itemRefs: string[]
}

const EMPTY: StepDraft = { title: "", body: "", timer: "", itemRefs: [] }

export interface NewRecipeStep {
  body: string
  title?: string
  timer?: number
  itemRefs?: string[]
}

interface StepsEditorProps {
  steps: RecipeStep[]
  /**
   * Items on the *current draft* — itemRefs must resolve to one of these ids, so the
   * picker only ever offers the draft's own items rather than free text (the backend
   * repository rejects a patch whose itemRefs don't resolve).
   */
  items: RecipeItem[]
  /** Resolves item.ingredientId to a display name in the itemRefs picker. */
  ingredients: Ingredient[]
  onAdd: (step: NewRecipeStep) => void
  onRemove: (index: number) => void
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/** Recipe steps sub-form: title/body/timer + itemRefs multi-select. */
export function StepsEditor({ steps, items, ingredients, onAdd, onRemove }: StepsEditorProps) {
  const [draft, setDraft] = useState<StepDraft>(EMPTY)

  function ingredientName(id: string): string {
    return ingredients.find(i => i.id === id)?.name ?? id
  }

  function toggleRef(id: string) {
    setDraft(d => ({
      ...d,
      itemRefs: d.itemRefs.includes(id) ? d.itemRefs.filter(r => r !== id) : [...d.itemRefs, id],
    }))
  }

  function commit() {
    if (!draft.body.trim()) return
    const timer = parseInt(draft.timer, 10)
    onAdd({
      body: draft.body.trim(),
      title: draft.title.trim() || undefined,
      timer: isNaN(timer) || timer <= 0 ? undefined : timer,
      itemRefs: draft.itemRefs.length > 0 ? draft.itemRefs : undefined,
    })
    setDraft(EMPTY)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault()
      event.stopPropagation()
      commit()
    }
  }

  function refLabel(ref: string): string {
    const item = items.find(it => it.id === ref)
    return item ? ingredientName(item.ingredientId) : ref
  }

  return (
    <div className={s.editor}>
      <p className={s.sectionLabel}>steps</p>
      <ol className={s.list}>
        {steps.map((step, i) => (
          <li key={step.id ?? i} className={s.row}>
            <div className={s.rowMain}>
              <span className={s.rowTitle}>
                {step.title ? `${i + 1}. ${step.title}` : `step ${i + 1}`}
                {step.timer ? ` [${formatTimer(step.timer)}]` : ""}
              </span>
              <span className={s.rowBody}>{step.body}</span>
              {step.itemRefs && step.itemRefs.length > 0 && (
                <span className={s.rowRefs}>uses: {step.itemRefs.map(refLabel).join(", ")}</span>
              )}
            </div>
            <button
              type="button"
              className={s.remove}
              onClick={() => onRemove(i)}
              aria-label={`remove step ${i + 1}`}
            >
              ×
            </button>
          </li>
        ))}
        {steps.length === 0 && <li className={s.empty}>no steps yet</li>}
      </ol>

      <div className={s.addForm}>
        <TextInput
          placeholder="title (optional)"
          value={draft.title}
          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
          onKeyDown={onKeyDown}
        />
        <textarea
          className={s.textarea}
          placeholder="instruction"
          value={draft.body}
          onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
        />
        <div className={s.fieldRow}>
          <TextInput
            className={s.timerInput}
            inputMode="numeric"
            placeholder="timer (sec)"
            value={draft.timer}
            onChange={e => setDraft(d => ({ ...d, timer: e.target.value }))}
            onKeyDown={onKeyDown}
          />
          <Button onClick={commit}>add step</Button>
        </div>

        {items.length > 0 && (
          <div className={s.refs}>
            <span className={s.refsLabel}>uses items:</span>
            {items.map(item => (
              <label key={item.id} className={s.refOption}>
                <input
                  type="checkbox"
                  checked={item.id ? draft.itemRefs.includes(item.id) : false}
                  onChange={() => item.id && toggleRef(item.id)}
                />
                {ingredientName(item.ingredientId)}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
