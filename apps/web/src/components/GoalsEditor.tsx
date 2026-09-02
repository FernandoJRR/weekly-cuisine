import type { NutrientEntry } from "@wc/types"
import { FormField } from "./FormField"
import { TextInput } from "./TextInput"
import s from "./GoalsEditor.module.css"

interface GoalsEditorProps {
  /** Full registry; only targetable entries render a row — same filter as the TUI. */
  nutrients: NutrientEntry[]
  tolerance: string
  onToleranceChange: (value: string) => void
  /** Draft target values, keyed by nutrient id. */
  goals: Record<string, string>
  onGoalChange: (nutrientId: string, value: string) => void
}

/**
 * Plan goal editor: a shared tolerance plus one target row per
 * `nutrients.filter(targetable)` — registry-driven, same pattern as the ingredient
 * form's dynamic nutrient rows. A goal with an empty/zero/invalid target is dropped
 * on save rather than sent as a zero goal.
 */
export function GoalsEditor({ nutrients, tolerance, onToleranceChange, goals, onGoalChange }: GoalsEditorProps) {
  const targetable = nutrients.filter(n => n.targetable)

  return (
    <div className={s.editor}>
      <p className={s.sectionLabel}>goals</p>
      <FormField label="tolerance" suffix="%">
        <TextInput
          inputMode="numeric"
          value={tolerance}
          onChange={e => onToleranceChange(e.target.value)}
        />
      </FormField>
      {targetable.map(n => (
        <FormField key={n.id} label={n.name} suffix={n.unit}>
          <TextInput
            inputMode="decimal"
            placeholder="0"
            value={goals[n.id] ?? ""}
            onChange={e => onGoalChange(n.id, e.target.value)}
          />
        </FormField>
      ))}
      {targetable.length === 0 && (
        <p className={s.hintText}>mark a nutrient targetable in the nutrients screen to set a goal here.</p>
      )}
    </div>
  )
}
