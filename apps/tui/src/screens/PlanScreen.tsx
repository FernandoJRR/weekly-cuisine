import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { color, space } from "../tokens"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { KeyHint } from "../components/KeyHint"
import type {
  WeeklyPlan, PlanRecord, Recipe, GroceryItem, PlanMode, MealSlot, CookEvent, NutrientEntry, NutrientGoal,
} from "@wc/types"
import type { DiagnosisItem, SolveResult } from "@wc/engine"

// ---- Constants ----
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SLOT_NAMES: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"]

function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(1)
}

// ---- Draft form ----
// Mode + tolerance + a target value per (targetable) nutrient id.
interface PlanDraft {
  mode: PlanMode
  tolerance: string
  goals: Record<string, string>
}

const EMPTY_DRAFT: PlanDraft = { mode: "daily-cook", tolerance: "10", goals: {} }
type DraftField = "mode" | "tolerance" | (string & {}) // beyond the two fixed rows: a nutrient id
const FIXED_FIELDS: DraftField[] = ["mode", "tolerance"]

// ---- Event form ----
interface EventDraft { day: number; slot: MealSlot; yield: string }
const EMPTY_EVENT: EventDraft = { day: 0, slot: "breakfast", yield: "1" }
type EventField = "recipe" | "day" | "slot" | "yield"
const EVENT_FIELDS: EventField[] = ["recipe", "day", "slot", "yield"]
const EVENT_LABELS: Record<EventField, string> = { recipe: "Recipe", day: "Day", slot: "Slot", yield: "Yield" }

type FocusZone = DraftField | "event"

// ---- Props ----
interface PlanScreenProps {
  active: boolean
  plans: PlanRecord[]
  recipes: Recipe[]
  nutrients: NutrientEntry[]
  modalOpen: boolean
  confirmOpen: boolean
  editingId: string | null
  onAdd: (draft: Omit<WeeklyPlan, "id">) => Promise<string>
  onEdit: (id: string, patch: Partial<Omit<WeeklyPlan, "id">>) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onGrocery: (plan: WeeklyPlan) => Promise<GroceryItem[]>
  onSolve: (plan: WeeklyPlan) => Promise<{ diagnosis: DiagnosisItem[]; solution: SolveResult }>
  onOpenAdd: () => void
  onOpenEdit: (id: string) => void
  onCloseModal: () => void
  onOpenConfirm: () => void
  onCloseConfirm: () => void
  onFlash: (msg: string) => void
}

export function PlanScreen({
  active, plans, recipes, nutrients, modalOpen, confirmOpen, editingId,
  onAdd, onEdit, onRemove, onGrocery, onSolve,
  onOpenAdd, onOpenEdit, onCloseModal, onOpenConfirm, onCloseConfirm, onFlash,
}: PlanScreenProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [view, setView] = useState<"detail" | "grocery" | "solve">("detail")
  const [busy, setBusy] = useState(false)
  const [groceryItems, setGroceryItems] = useState<GroceryItem[] | null>(null)
  const [solveResult, setSolveResult] = useState<{ diagnosis: DiagnosisItem[]; solution: SolveResult } | null>(null)
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT)
  const [focusedField, setFocusedField] = useState<FocusZone>("mode")
  const [eventRecipeIdx, setEventRecipeIdx] = useState(0)
  const [eventDraft, setEventDraft] = useState<EventDraft>(EMPTY_EVENT)
  const [eventFocusedField, setEventFocusedField] = useState<EventField>("recipe")
  const [draftEvents, setDraftEvents] = useState<CookEvent[]>([])

  const selected = plans[selectedIdx] ?? null

  const goalNutrients = nutrients.filter(n => n.targetable)
  const draftFields: DraftField[] = [...FIXED_FIELDS, ...goalNutrients.map(n => n.id)]

  const labelById = new Map(nutrients.map(n => [n.id, n.name]))
  const unitById = new Map(nutrients.map(n => [n.id, n.unit]))
  const nutrientLabel = (id: string): string => labelById.get(id) ?? id

  function resetEventDraft() {
    setEventDraft(EMPTY_EVENT)
    setEventRecipeIdx(0)
    setEventFocusedField("recipe")
  }

  function openAddModal() {
    setDraft(EMPTY_DRAFT)
    setDraftEvents([])
    resetEventDraft()
    setFocusedField("mode")
    onOpenAdd()
  }

  function openEditModal(plan: PlanRecord) {
    setDraft({
      mode: plan.mode,
      tolerance: String(plan.goals[0]?.tolerancePct ?? 10),
      goals: Object.fromEntries(plan.goals.map(g => [g.nutrientId, String(g.target)])),
    })
    setDraftEvents(plan.cookEvents.map(e => ({ ...e })))
    resetEventDraft()
    setFocusedField("mode")
    onOpenEdit(plan.id)
  }

  function addEvent() {
    if (recipes.length === 0) { onFlash("Add recipes first"); return }
    const recipe = recipes[eventRecipeIdx]!
    const yield_ = parseFloat(eventDraft.yield)
    if (isNaN(yield_) || yield_ <= 0) { onFlash("Yield must be > 0"); return }
    setDraftEvents(prev => [
      ...prev,
      { recipeId: recipe.id, yield: yield_, day: eventDraft.day, slot: eventDraft.slot },
    ])
    resetEventDraft()
  }

  function removeLastEvent() {
    if (draftEvents.length === 0) { onFlash("No events to remove"); return }
    setDraftEvents(prev => prev.slice(0, -1))
  }

  function buildGoals(tol: number): NutrientGoal[] {
    return goalNutrients
      .map(n => ({ id: n.id, target: parseFloat(draft.goals[n.id] ?? "") }))
      .filter(g => !isNaN(g.target) && g.target > 0)
      .map(g => ({ nutrientId: g.id, target: g.target, tolerancePct: tol }))
  }

  function saveModal() {
    if (draftEvents.length === 0) { onFlash("Add at least one cook event"); return }
    const tol = Math.min(100, Math.max(0, parseInt(draft.tolerance) || 10))
    const goals = buildGoals(tol)
    const payload = { mode: draft.mode, cookEvents: draftEvents, goals }
    if (editingId) {
      onEdit(editingId, payload)
      onFlash(`Updated plan ${editingId}`)
    } else {
      onAdd(payload)
      onFlash("Created plan")
    }
    onCloseModal()
  }

  async function runGrocery() {
    if (busy || !selected) return
    setBusy(true)
    try {
      const items = await onGrocery(selected)
      setGroceryItems(items)
      setView("grocery")
    } catch (err) {
      onFlash(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function runSolve() {
    if (busy || !selected) return
    setBusy(true)
    try {
      const result = await onSolve(selected)
      setSolveResult(result)
      setView("solve")
    } catch (err) {
      onFlash(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  useKeyboard((key) => {
    if (!active) return
    if (confirmOpen) return

    if (modalOpen) {
      if (key.name === "escape") { onCloseModal(); return }

      if (focusedField === "event") {
        if (key.name === "return") { addEvent(); return }
        if (key.name === "x") { removeLastEvent(); return }
        if (key.name === "tab" && !key.shift) {
          const idx = EVENT_FIELDS.indexOf(eventFocusedField)
          setEventFocusedField(EVENT_FIELDS[(idx + 1) % EVENT_FIELDS.length]!)
          return
        }
        if (key.name === "tab" && key.shift) {
          setFocusedField(draftFields[draftFields.length - 1]!)
          return
        }
        if (key.name === "up" || key.name === "down") {
          const dir = key.name === "up" ? -1 : 1
          if (eventFocusedField === "recipe") {
            if (recipes.length === 0) { onFlash("Add recipes first"); return }
            setEventRecipeIdx(i => Math.min(recipes.length - 1, Math.max(0, i + dir)))
            return
          }
          if (eventFocusedField === "day") {
            setEventDraft(d => ({ ...d, day: Math.min(6, Math.max(0, d.day + dir)) }))
            return
          }
          if (eventFocusedField === "slot") {
            setEventDraft(d => {
              const idx = SLOT_NAMES.indexOf(d.slot)
              return { ...d, slot: SLOT_NAMES[(idx + dir + SLOT_NAMES.length) % SLOT_NAMES.length]! }
            })
            return
          }
        }
        return
      }

      if (key.name === "tab" && !key.shift) {
        const idx = draftFields.indexOf(focusedField as DraftField)
        if (idx === draftFields.length - 1) {
          setFocusedField("event")
          setEventFocusedField("recipe")
        } else {
          setFocusedField(draftFields[idx + 1]!)
        }
        return
      }
      if (key.name === "tab" && key.shift) {
        const idx = draftFields.indexOf(focusedField as DraftField)
        if (idx > 0) setFocusedField(draftFields[idx - 1]!)
        return
      }
      if ((key.name === "up" || key.name === "down") && focusedField === "mode") {
        setDraft(d => ({ ...d, mode: d.mode === "daily-cook" ? "meal-prep" : "daily-cook" }))
        return
      }
      if (key.name === "return") { saveModal(); return }
      return
    }

    if (view !== "detail" && key.name === "escape") { setView("detail"); return }

    if (key.name === "up") setSelectedIdx(i => Math.max(0, i - 1))
    if (key.name === "down") setSelectedIdx(i => Math.min(plans.length - 1, i + 1))
    if (key.name === "a") openAddModal()
    if (key.name === "e" && selected) openEditModal(selected)
    if (key.name === "d" && selected) onOpenConfirm()
    if (key.name === "g" && selected) { void runGrocery() }
    if (key.name === "s" && selected) { void runSolve() }
  })

  return (
    <box flexGrow={1} flexDirection="row" backgroundColor={color.bg.base}>
      {/* List pane */}
      <box width={34} flexDirection="column" border={["right"]} borderColor={color.bg.border}>
        <box paddingX={space[2]} paddingY={1} border={["bottom"]} borderColor={color.bg.border}>
          <text fg={color.text.muted} attributes={TextAttributes.BOLD}>Plans</text>
        </box>
        <select
          flexGrow={1}
          options={plans.map(p => ({
            name: p.id,
            description: `${p.mode} · ${p.cookEvents.length} ev · ${p.goals.length} goals`,
          }))}
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
          <KeyHint hints={["a=new", "e=edit", "d=delete", "g=grocery", "s=solve"]} />
        </box>
      </box>

      {/* Detail pane */}
      <box flexGrow={1} flexDirection="column" padding={space[4]}>
        {!selected ? (
          <text fg={color.text.dim}>Select a plan (a=new)</text>
        ) : view === "detail" ? (
          <>
            <box border={["bottom"]} borderColor={color.bg.border} paddingBottom={1} marginBottom={space[2]}>
              <text fg={color.accent.mid} attributes={TextAttributes.BOLD}>{selected.id}</text>
              <text fg={color.text.dim}>{selected.mode} · created {selected.created_at}</text>
            </box>

            <text fg={color.text.muted} attributes={TextAttributes.BOLD} marginBottom={space[1]}>Cook events:</text>
            {selected.cookEvents.length === 0 && (
              <text fg={color.text.dim}>  none</text>
            )}
            {selected.cookEvents.map((event, i) => {
              const recipeName = recipes.find(r => r.id === event.recipeId)?.name ?? event.recipeId
              return (
                <text key={i} fg={color.text.default}>
                  {DAY_NAMES[event.day]} {event.slot} · {recipeName} ×{event.yield}
                </text>
              )
            })}

            <text fg={color.text.muted} attributes={TextAttributes.BOLD} marginTop={space[3]} marginBottom={space[1]}>Goals:</text>
            {selected.goals.length === 0 && (
              <text fg={color.text.dim}>  none</text>
            )}
            {selected.goals.map((goal, i) => (
              <text key={i} fg={color.text.default}>
                {nutrientLabel(goal.nutrientId)} → {goal.target} {unitById.get(goal.nutrientId) ?? ""} (±{goal.tolerancePct}%)
              </text>
            ))}
          </>
        ) : view === "grocery" ? (
          <>
            <box border={["bottom"]} borderColor={color.bg.border} paddingBottom={1} marginBottom={space[2]}>
              <text fg={color.accent.mid} attributes={TextAttributes.BOLD}>Grocery list</text>
            </box>
            {busy && <text fg={color.text.dim}>Loading…</text>}
            {!busy && groceryItems && groceryItems.length === 0 && (
              <text fg={color.text.dim}>  nothing to buy</text>
            )}
            {!busy && groceryItems?.map((item, i) => (
              <text key={i} fg={color.text.default}>
                {item.ingredientName} — {formatQty(item.quantity)} {item.unit}
              </text>
            ))}
          </>
        ) : (
          <>
            <box border={["bottom"]} borderColor={color.bg.border} paddingBottom={1} marginBottom={space[2]}>
              <text fg={color.accent.mid} attributes={TextAttributes.BOLD}>Solver</text>
            </box>
            {busy && <text fg={color.text.dim}>Loading…</text>}
            {!busy && solveResult && (
              <>
                <text fg={solveResult.solution.feasible ? color.status.success : color.status.error} marginBottom={space[1]}>
                  Feasible: {solveResult.solution.feasible ? "yes" : "no"} · deviation: {solveResult.solution.deviation.toFixed(2)}
                </text>

                <text fg={color.text.muted} attributes={TextAttributes.BOLD} marginBottom={space[1]}>Diagnosis:</text>
                {solveResult.diagnosis.map((item, i) => (
                  <text key={i} fg={item.feasible ? color.text.default : color.status.error}>
                    {nutrientLabel(item.nutrientId)}: target {item.target} · max {item.achievableMax.toFixed(1)} · {item.feasible ? "ok" : item.warning ?? "infeasible"}
                  </text>
                ))}
                {solveResult.diagnosis.length === 0 && (
                  <text fg={color.text.dim}>  no targetable goals</text>
                )}

                <text fg={color.text.muted} attributes={TextAttributes.BOLD} marginTop={space[3]} marginBottom={space[1]}>Servings:</text>
                {Object.entries(solveResult.solution.servings).filter(([, v]) => v > 0).map(([recipeId, v]) => (
                  <text key={recipeId} fg={color.text.default}>
                    {recipes.find(r => r.id === recipeId)?.name ?? recipeId} × {v}
                  </text>
                ))}
              </>
            )}
          </>
        )}
      </box>

      {/* View hint bar */}
      {view !== "detail" && !busy && (
        <box
          position="absolute"
          bottom={0}
          left={34}
          width={72}
          paddingX={space[3]}
          paddingY={1}
        >
          <KeyHint hints={["g=grocery", "s=solve", "esc=detail"]} />
        </box>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <box
          position="absolute"
          top={1} left={4} width={72}
          height={Math.min(44, 12 + draftFields.length + Math.max(3, draftEvents.length) + 6)}
          backgroundColor={color.bg.elevated}
          border={true}
          borderStyle="double"
          borderColor={color.accent.mid}
          title={editingId ? " Edit Plan " : " New Plan "}
          titleAlignment="center"
          flexDirection="column"
          padding={space[2]}
          gap={1}
        >
          <box flexDirection="row" alignItems="center" gap={space[2]}>
            <text fg={color.text.muted} width={16}>Mode:</text>
            <box flexGrow={1} backgroundColor={focusedField === "mode" ? color.bg.overlay : color.bg.surface}>
              <text fg={focusedField === "mode" ? color.text.bright : color.text.default}>  {draft.mode}</text>
            </box>
          </box>
          <box flexDirection="row" alignItems="center" gap={space[2]}>
            <text fg={color.text.muted} width={16}>Tolerance %:</text>
            <box flexGrow={1} backgroundColor={focusedField === "tolerance" ? color.bg.overlay : color.bg.surface}>
              <input
                flexGrow={1}
                focused={focusedField === "tolerance"}
                value={draft.tolerance}
                onInput={v => setDraft(d => ({ ...d, tolerance: v }))}
              />
            </box>
          </box>

          {goalNutrients.map(n => {
            const rowFocused = focusedField === n.id
            const label = n.unit ? `${n.name} (${n.unit})` : n.name
            return (
              <box key={n.id} flexDirection="row" alignItems="center" gap={space[2]}>
                <text fg={color.text.muted} width={16}>{label}:</text>
                <box flexGrow={1} backgroundColor={rowFocused ? color.bg.overlay : color.bg.surface}>
                  <input
                    flexGrow={1}
                    focused={rowFocused}
                    value={draft.goals[n.id] ?? ""}
                    onInput={v => setDraft(d => ({ ...d, goals: { ...d.goals, [n.id]: v } }))}
                  />
                </box>
              </box>
            )
          })}

          <text fg={color.text.muted} attributes={TextAttributes.BOLD} marginTop={space[2]}>Cook events:</text>
          {draftEvents.map((event, i) => {
            const recipeName = recipes.find(r => r.id === event.recipeId)?.name ?? event.recipeId
            return (
              <text key={i} fg={color.text.default}>
                {DAY_NAMES[event.day]} {event.slot} · {recipeName} ×{event.yield}
              </text>
            )
          })}

          <text fg={focusedField === "event" ? color.accent.mid : color.accent.lo} marginTop={1}>
            + Add event (Enter to add, x removes last):
          </text>
          {EVENT_FIELDS.map(field => {
            const eventActive = focusedField === "event" && eventFocusedField === field
            const value =
              field === "recipe"
                ? recipes.length > 0 ? recipes[eventRecipeIdx]!.name : "no recipes"
                : field === "day"
                  ? DAY_NAMES[eventDraft.day]
                  : field === "slot"
                    ? eventDraft.slot
                    : eventDraft.yield
            return (
              <box key={field} flexDirection="row" alignItems="center" gap={space[2]}>
                <text fg={focusedField === "event" ? color.text.muted : color.text.dim} width={16}>
                  {EVENT_LABELS[field]}:
                </text>
                {field === "yield" ? (
                  <box flexGrow={1} backgroundColor={eventActive ? color.bg.overlay : color.bg.surface}>
                    <input
                      flexGrow={1}
                      focused={eventActive}
                      value={eventDraft.yield}
                      onInput={v => setEventDraft(d => ({ ...d, yield: v }))}
                    />
                  </box>
                ) : (
                  <box flexGrow={1} backgroundColor={eventActive ? color.bg.overlay : color.bg.surface}>
                    <text fg={eventActive ? color.text.bright : field === "recipe" && recipes.length === 0 ? color.text.dim : color.text.default}>
                      {"  "}{value}
                    </text>
                  </box>
                )}
              </box>
            )
          })}

          <box marginTop={space[2]}>
            <KeyHint hints={["Tab=next", "↑↓=change", "Enter=save/add", "Esc=cancel"]} />
          </box>
        </box>
      )}

      {/* Confirm delete */}
      {confirmOpen && selected && (
        <ConfirmDialog
          itemName={selected.id}
          onConfirm={() => {
            onCloseConfirm()
            onRemove(selected.id)
            setSelectedIdx(i => Math.max(0, Math.min(i, plans.length - 2)))
          }}
          onCancel={onCloseConfirm}
        />
      )}
    </box>
  )
}
