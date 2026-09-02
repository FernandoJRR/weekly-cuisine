import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { color, space } from "../tokens"
import { Tag } from "../components/Tag"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { KeyHint } from "../components/KeyHint"
import { deriveRecipeNutrients } from "@wc/engine"
import type { Recipe, Ingredient, ModalMode, RecipeItem, RecipeStep, CookMode } from "@wc/types"

// ---- Draft form ----
interface RecipeDraft {
  name: string
  yield: string
  tags: string
  description: string
  prepTime: string
  cookTime: string
}

const EMPTY_DRAFT: RecipeDraft = { name: "", yield: "2", tags: "", description: "", prepTime: "", cookTime: "" }
type DraftField = keyof RecipeDraft
const DRAFT_FIELDS: DraftField[] = ["name", "yield", "tags", "description", "prepTime", "cookTime"]

// ---- Item form ----
interface ItemDraft {
  ingredientId: string
  quantity: string
  unit: string
}
const EMPTY_ITEM: ItemDraft = { ingredientId: "", quantity: "", unit: "g" }
type ItemField = keyof ItemDraft
const ITEM_FIELDS: ItemField[] = ["ingredientId", "quantity", "unit"]

// ---- Step form ----
interface StepDraft {
  body: string
  title: string
  timer: string
  itemRefs: string
}
const EMPTY_STEP: StepDraft = { body: "", title: "", timer: "", itemRefs: "" }
type StepField = keyof StepDraft
const STEP_FIELDS: StepField[] = ["body", "title", "timer", "itemRefs"]

const NUTRIENT_LABELS: Record<string, string> = {
  calories: "cal",
  protein: "protein",
  carbs: "carbs",
  fat: "fat",
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// ---- Props ----
interface RecipesScreenProps {
  active: boolean
  recipes: Recipe[]
  ingredients: Ingredient[]
  modal: ModalMode
  cookMode: CookMode
  confirmOpen: boolean
  onAdd: (draft: Omit<Recipe, "id" | "created_at" | "updated_at">) => Promise<string>
  onUpdate: (id: string, patch: Partial<Omit<Recipe, "id" | "created_at">>) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onOpenAdd: () => void
  onOpenEdit: (id: string) => void
  onCloseModal: () => void
  onOpenConfirm: () => void
  onCloseConfirm: () => void
  onOpenCook: (recipeId: string) => void
  onCloseCook: () => void
  onNextStep: (total: number) => void
  onPrevStep: () => void
  onFlash: (msg: string) => void
}

type FocusZone = DraftField | "item" | "step"

export function RecipesScreen({
  active, recipes, ingredients, modal, cookMode, confirmOpen,
  onAdd, onUpdate, onRemove, onOpenAdd, onOpenEdit, onCloseModal,
  onOpenConfirm, onCloseConfirm,
  onOpenCook, onCloseCook, onNextStep, onPrevStep, onFlash,
}: RecipesScreenProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [draft, setDraft] = useState<RecipeDraft>(EMPTY_DRAFT)
  const [draftItems, setDraftItems] = useState<RecipeItem[]>([])
  const [draftSteps, setDraftSteps] = useState<RecipeStep[]>([])
  const [focusedField, setFocusedField] = useState<FocusZone>("name")
  const [itemDraft, setItemDraft] = useState<ItemDraft>(EMPTY_ITEM)
  const [itemFocusedField, setItemFocusedField] = useState<ItemField>("ingredientId")
  const [stepDraft, setStepDraft] = useState<StepDraft>(EMPTY_STEP)
  const [stepFocusedField, setStepFocusedField] = useState<StepField>("body")

  const selected = recipes[selectedIdx] ?? null

  function makeItemId(baseId: string, index: number) {
    return `${baseId}-I${index + 1}`
  }

  function openAddModal() {
    setDraft(EMPTY_DRAFT)
    setDraftItems([])
    setDraftSteps([])
    setItemDraft(EMPTY_ITEM)
    setStepDraft(EMPTY_STEP)
    setFocusedField("name")
    onOpenAdd()
  }

  function openEditModal(recipe: Recipe) {
    setDraft({
      name:        recipe.name,
      yield:       String(recipe.yield),
      tags:        recipe.tags.join(", "),
      description: recipe.description ?? "",
      prepTime:    recipe.prepTime ? String(recipe.prepTime) : "",
      cookTime:    recipe.cookTime ? String(recipe.cookTime) : "",
    })
    setDraftItems(recipe.items)
    setDraftSteps(recipe.steps)
    setItemDraft(EMPTY_ITEM)
    setStepDraft(EMPTY_STEP)
    setFocusedField("name")
    onOpenEdit(recipe.id)
  }

  function saveModal() {
    if (!draft.name.trim()) { onFlash("Name is required"); return }
    const baseId = modal.open && modal.mode === "edit"
      ? modal.recipeId
      : `RCP-${String(recipes.length + 1).padStart(4, "0")}`
    const items = draftItems.map((it, i) => ({ ...it, id: it.id || makeItemId(baseId, i) }))
    const steps = draftSteps.map((s, i) => ({ ...s, id: s.id || `${baseId}-S${i + 1}` }))
    const payload = {
      name:        draft.name.trim(),
      yield:       parseFloat(draft.yield) || 1,
      tags:        draft.tags.split(",").map(t => t.trim()).filter(Boolean),
      description: draft.description.trim() || undefined,
      prepTime:    parseInt(draft.prepTime) || undefined,
      cookTime:    parseInt(draft.cookTime) || undefined,
      items,
      steps,
    }
    if (modal.open && modal.mode === "edit") {
      onUpdate(modal.recipeId, payload)
      onFlash(`Updated "${payload.name}"`)
    } else {
      onAdd(payload)
      onFlash(`Added "${payload.name}"`)
    }
    onCloseModal()
  }

  function addItem() {
    const qty = parseFloat(itemDraft.quantity)
    if (!itemDraft.ingredientId.trim() || isNaN(qty) || qty <= 0 || !itemDraft.unit.trim()) {
      onFlash("Item needs ingredientId, quantity > 0, and unit")
      return
    }
    const baseId = modal.open && modal.mode === "edit" ? modal.recipeId : "new"
    setDraftItems(prev => [
      ...prev,
      {
        id:           makeItemId(baseId, prev.length),
        ingredientId: itemDraft.ingredientId.trim(),
        quantity:     qty,
        unit:         itemDraft.unit.trim(),
      },
    ])
    setItemDraft(EMPTY_ITEM)
    setItemFocusedField("ingredientId")
  }

  function addStep() {
    if (!stepDraft.body.trim()) { onFlash("Step body is required"); return }
    const baseId = modal.open && modal.mode === "edit" ? modal.recipeId : "new"
    const refs = stepDraft.itemRefs.split(",").map(s => s.trim()).filter(Boolean)
    setDraftSteps(prev => [
      ...prev,
      {
        id:       `${baseId}-S${prev.length + 1}`,
        body:     stepDraft.body.trim(),
        title:    stepDraft.title.trim() || undefined,
        timer:    parseInt(stepDraft.timer) || undefined,
        itemRefs: refs.length ? refs : undefined,
      },
    ])
    setStepDraft(EMPTY_STEP)
    setStepFocusedField("body")
  }

  useKeyboard((key) => {
    if (!active) return
    if (confirmOpen) return

    // Cook mode navigation
    if (cookMode.open) {
      if (key.name === "escape") { onCloseCook(); return }
      if (selected) {
        const total = selected.steps.length
        if (key.name === "right" || key.name === "l") { onNextStep(total); return }
        if (key.name === "left" || key.name === "h") { onPrevStep(); return }
      }
      return
    }

    if (modal.open) {
      if (key.name === "escape") { onCloseModal(); return }

      if (focusedField === "step") {
        if (key.name === "return") { addStep(); return }
        if (key.name === "tab" && !key.shift) {
          const idx = STEP_FIELDS.indexOf(stepFocusedField)
          setStepFocusedField(STEP_FIELDS[(idx + 1) % STEP_FIELDS.length]!)
          return
        }
        if (key.name === "tab" && key.shift) { setFocusedField("item"); return }
        return
      }

      if (focusedField === "item") {
        if (key.name === "return") { addItem(); return }
        if (key.name === "tab" && !key.shift) {
          const idx = ITEM_FIELDS.indexOf(itemFocusedField)
          if (idx === ITEM_FIELDS.length - 1) {
            setFocusedField("step")
            setStepFocusedField("body")
          } else {
            setItemFocusedField(ITEM_FIELDS[idx + 1]!)
          }
          return
        }
        if (key.name === "tab" && key.shift) { setFocusedField("cookTime"); return }
        return
      }

      if (key.name === "tab" && !key.shift) {
        const idx = DRAFT_FIELDS.indexOf(focusedField as DraftField)
        if (idx === DRAFT_FIELDS.length - 1) {
          setFocusedField("item")
          setItemFocusedField("ingredientId")
        } else {
          setFocusedField(DRAFT_FIELDS[idx + 1]!)
        }
        return
      }
      if (key.name === "return") { saveModal(); return }
      return
    }

    if (key.name === "up") setSelectedIdx(i => Math.max(0, i - 1))
    if (key.name === "down") setSelectedIdx(i => Math.min(recipes.length - 1, i + 1))
    if (key.name === "a") openAddModal()
    if (key.name === "e" && selected) openEditModal(selected)
    if (key.name === "d" && selected) onOpenConfirm()
    if (key.name === "c" && selected && selected.steps.length > 0) onOpenCook(selected.id)
  })

  const nutrients = selected && ingredients.length > 0
    ? (() => {
        try { return deriveRecipeNutrients(selected, ingredients) }
        catch { return null }
      })()
    : null

  const DRAFT_LABELS: Record<DraftField, string> = {
    name: "Name", yield: "Yield", tags: "Tags (csv)",
    description: "Description", prepTime: "Prep (min)", cookTime: "Cook (min)",
  }
  const ITEM_LABELS: Record<ItemField, string> = { ingredientId: "Ingredient ID", quantity: "Qty", unit: "Unit" }
  const STEP_LABELS: Record<StepField, string> = {
    body: "Instruction", title: "Title", timer: "Timer (sec)", itemRefs: "Item refs (csv IDs)",
  }

  const cookRecipe = cookMode.open ? recipes.find(r => r.id === cookMode.recipeId) ?? null : null
  const cookStep   = cookRecipe && cookMode.open ? cookRecipe.steps[cookMode.stepIndex] ?? null : null

  return (
    <box flexGrow={1} flexDirection="row" backgroundColor={color.bg.base}>
      {/* List pane */}
      <box width={34} flexDirection="column" border={["right"]} borderColor={color.bg.border}>
        <box paddingX={space[2]} paddingY={1} border={["bottom"]} borderColor={color.bg.border}>
          <text fg={color.text.muted} attributes={TextAttributes.BOLD}>Recipes</text>
        </box>
        <select
          flexGrow={1}
          options={recipes.map(r => ({ name: r.name, description: r.tags.join(", ") || r.id }))}
          focused={active && !modal.open && !confirmOpen && !cookMode.open}
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
          <KeyHint hints={["a=add", "e=edit", "d=delete", "c=cook"]} />
        </box>
      </box>

      {/* Detail pane */}
      <box flexGrow={1} flexDirection="column" padding={space[4]}>
        {selected ? (
          <>
            <box border={["bottom"]} borderColor={color.bg.border} paddingBottom={1}>
              <text fg={color.accent.mid} attributes={TextAttributes.BOLD}>{selected.name}</text>
              <text fg={color.text.dim}>{selected.id}</text>
            </box>

            {selected.description && (
              <text fg={color.text.muted} marginBottom={space[2]}>{selected.description}</text>
            )}

            <box flexDirection="row" gap={space[2]} marginBottom={space[3]}>
              {selected.tags.map(t => (
                <box key={t}>
                  <Tag label={t} variant="info" />
                </box>
              ))}
            </box>

            <box flexDirection="row" gap={space[4]} marginBottom={space[2]}>
              <text fg={color.text.muted}>Yield: {selected.yield} serving{selected.yield !== 1 ? "s" : ""}</text>
              {selected.prepTime != null && <text fg={color.text.dim}>Prep: {selected.prepTime}min</text>}
              {selected.cookTime != null && <text fg={color.text.dim}>Cook: {selected.cookTime}min</text>}
            </box>

            <text fg={color.text.muted} attributes={TextAttributes.BOLD} marginTop={space[3]} marginBottom={space[1]}>Items:</text>
            {selected.items.map((item, i) => {
              const ing = ingredients.find(x => x.id === item.ingredientId)
              return (
                <text key={i} fg={color.text.default}>
                  {ing ? ing.name : item.ingredientId}  {item.quantity} {item.unit}
                </text>
              )
            })}

            {selected.steps.length > 0 && (
              <>
                <text fg={color.text.muted} attributes={TextAttributes.BOLD} marginTop={space[3]} marginBottom={space[1]}>
                  Steps ({selected.steps.length}):
                </text>
                {selected.steps.map((step, i) => (
                  <box key={step.id} flexDirection="column" marginBottom={space[1]}>
                    <text fg={color.accent.hi} attributes={TextAttributes.BOLD}>
                      {step.title ? `${i + 1}. ${step.title}` : `Step ${i + 1}`}
                      {step.timer ? `  [${formatTimer(step.timer)}]` : ""}
                    </text>
                    <text fg={color.text.default}>   {step.body}</text>
                  </box>
                ))}
              </>
            )}

            {nutrients && (
              <>
                <text fg={color.text.muted} attributes={TextAttributes.BOLD} marginTop={space[3]} marginBottom={space[1]}>
                  Per serving:
                </text>
                <box flexDirection="row" gap={space[4]}>
                  {Object.entries(nutrients).map(([id, val]) => (
                    <text key={id} fg={color.text.default}>
                      {NUTRIENT_LABELS[id] ?? id}: {val.toFixed(1)}
                    </text>
                  ))}
                </box>
              </>
            )}
          </>
        ) : (
          <text fg={color.text.dim}>Select a recipe</text>
        )}
      </box>

      {/* Add / Edit modal */}
      {modal.open && (
        <box
          position="absolute"
          top={1} left={4} width={72} height={36}
          backgroundColor={color.bg.elevated}
          border={true}
          borderStyle="double"
          borderColor={color.accent.mid}
          title={modal.mode === "edit" ? " Edit Recipe " : " Add Recipe "}
          titleAlignment="center"
          flexDirection="column"
          padding={space[2]}
          gap={1}
        >
          {DRAFT_FIELDS.map(field => (
            <box key={field} flexDirection="row" alignItems="center" gap={space[2]}>
              <text fg={color.text.muted} width={16}>{DRAFT_LABELS[field]}:</text>
              <box flexGrow={1} backgroundColor={focusedField === field ? color.bg.overlay : color.bg.surface}>
                <input
                  flexGrow={1}
                  focused={focusedField === field}
                  value={draft[field]}
                  onInput={v => setDraft(d => ({ ...d, [field]: v }))}
                />
              </box>
            </box>
          ))}

          <text fg={color.text.muted} attributes={TextAttributes.BOLD} marginTop={space[2]}>Items:</text>
          {draftItems.map((item, i) => (
            <text key={i} fg={color.text.default}>  [{item.id}]  {item.ingredientId}  {item.quantity} {item.unit}</text>
          ))}

          <text fg={focusedField === "item" ? color.accent.mid : color.accent.lo} marginTop={1}>
            + Add item (Tab→Step zone, Enter to add):
          </text>
          {ITEM_FIELDS.map(field => {
            const itemActive = focusedField === "item" && itemFocusedField === field
            return (
              <box key={field} flexDirection="row" alignItems="center" gap={space[2]}>
                <text fg={focusedField === "item" ? color.text.muted : color.text.dim} width={16}>
                  {ITEM_LABELS[field]}:
                </text>
                <box flexGrow={1} backgroundColor={itemActive ? color.bg.overlay : color.bg.surface}>
                  <input
                    flexGrow={1}
                    focused={itemActive}
                    value={itemDraft[field]}
                    onInput={v => setItemDraft(d => ({ ...d, [field]: v }))}
                  />
                </box>
              </box>
            )
          })}

          <text fg={focusedField === "step" ? color.accent.mid : color.accent.lo} marginTop={1}>
            + Add step (Enter to add):
          </text>
          {draftSteps.map((step, i) => (
            <text key={i} fg={color.text.default}>
              {step.title ? `  ${i + 1}. ${step.title}` : `  Step ${i + 1}`}: {step.body}
              {step.timer ? ` [${formatTimer(step.timer)}]` : ""}
            </text>
          ))}
          {STEP_FIELDS.map(field => {
            const stepActive = focusedField === "step" && stepFocusedField === field
            return (
              <box key={field} flexDirection="row" alignItems="center" gap={space[2]}>
                <text fg={focusedField === "step" ? color.text.muted : color.text.dim} width={20}>
                  {STEP_LABELS[field]}:
                </text>
                <box flexGrow={1} backgroundColor={stepActive ? color.bg.overlay : color.bg.surface}>
                  <input
                    flexGrow={1}
                    focused={stepActive}
                    value={stepDraft[field]}
                    onInput={v => setStepDraft(d => ({ ...d, [field]: v }))}
                  />
                </box>
              </box>
            )
          })}

          <box marginTop={space[2]}>
            <KeyHint hints={["Tab=next", "Enter=save/add", "Esc=cancel"]} />
          </box>
        </box>
      )}

      {/* Cook mode overlay */}
      {cookMode.open && cookRecipe && (
        <box
          position="absolute"
          top={2} left={6} width={60} height={18}
          backgroundColor={color.bg.elevated}
          border={true}
          borderStyle="double"
          borderColor={color.accent.mid}
          title={` Cook: ${cookRecipe.name} `}
          titleAlignment="center"
          flexDirection="column"
          padding={space[4]}
          gap={1}
        >
          {cookStep ? (
            <>
              <box flexDirection="row" justifyContent="space-between">
                <text fg={color.text.dim}>
                  Step {cookMode.stepIndex + 1} of {cookRecipe.steps.length}
                </text>
                {cookStep.timer != null && (
                  <text fg={color.accent.hi}>{formatTimer(cookStep.timer)}</text>
                )}
              </box>

              <text>
                <span fg={color.accent.mid}>{"█".repeat(cookMode.stepIndex + 1)}</span>
                <span fg={color.bg.border}>{"░".repeat(Math.max(0, cookRecipe.steps.length - cookMode.stepIndex - 1))}</span>
              </text>

              <text fg={color.accent.mid} attributes={TextAttributes.BOLD} marginTop={space[2]}>
                {cookStep.title || `Step ${cookMode.stepIndex + 1}`}
              </text>

              <text fg={color.text.default} marginTop={space[1]}>
                {cookStep.body}
              </text>

              {cookStep.itemRefs && cookStep.itemRefs.length > 0 && (
                <box flexDirection="column" marginTop={space[2]}>
                  <text fg={color.text.muted} attributes={TextAttributes.BOLD}>Uses:</text>
                  {cookStep.itemRefs.map(ref => {
                    const item = cookRecipe.items.find(it => it.id === ref)
                    if (!item) return null
                    const ing = ingredients.find(x => x.id === item.ingredientId)
                    return (
                      <text key={ref} fg={color.text.default}>
                        {ing ? ing.name : item.ingredientId}: {item.quantity} {item.unit}
                      </text>
                    )
                  })}
                </box>
              )}

              <box marginTop={space[3]}>
                <KeyHint hints={["←/h=prev", "→/l=next", "Esc=exit cook mode"]} />
              </box>
            </>
          ) : (
            <text fg={color.text.dim}>No steps</text>
          )}
        </box>
      )}

      {/* Confirm delete */}
      {confirmOpen && selected && (
        <ConfirmDialog
          itemName={selected.name}
          onConfirm={() => {
            onRemove(selected.id)
            onCloseConfirm()
            setSelectedIdx(i => Math.max(0, i - 1))
            onFlash(`Deleted "${selected.name}"`)
          }}
          onCancel={onCloseConfirm}
        />
      )}
    </box>
  )
}
