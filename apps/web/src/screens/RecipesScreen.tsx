import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { deriveRecipeNutrients } from "@wc/engine"
import type { Recipe, RecipeItem, RecipeStep } from "@wc/types"
import { useFlash } from "../App"
import { useRecipes } from "../hooks/useRecipes"
import { useIngredients } from "../hooks/useIngredients"
import { useNutrients } from "../hooks/useNutrients"
import { Button } from "../components/Button"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { DataTable, type DataTableColumn } from "../components/DataTable"
import { FormField } from "../components/FormField"
import { ItemsEditor, type NewRecipeItem } from "../components/ItemsEditor"
import { KeyHint } from "../components/KeyHint"
import { Modal } from "../components/Modal"
import { StepsEditor, type NewRecipeStep } from "../components/StepsEditor"
import { Tag } from "../components/Tag"
import { TextInput } from "../components/TextInput"
import s from "./RecipesScreen.module.css"

interface RecipeDraft {
  name: string
  yield: string
  tags: string
  description: string
  prepTime: string
  cookTime: string
}

const EMPTY_DRAFT: RecipeDraft = { name: "", yield: "2", tags: "", description: "", prepTime: "", cookTime: "" }

function recipeToDraft(recipe: Recipe): RecipeDraft {
  return {
    name: recipe.name,
    yield: String(recipe.yield),
    tags: recipe.tags.join(", "),
    description: recipe.description ?? "",
    prepTime: recipe.prepTime != null ? String(recipe.prepTime) : "",
    cookTime: recipe.cookTime != null ? String(recipe.cookTime) : "",
  }
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

export function RecipesScreen() {
  const flash = useFlash()
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id: string }>()

  const {
    recipes, loading, error, modalOpen, confirmOpen,
    add, update, remove,
    openModal, closeModal, openConfirm, closeConfirm,
  } = useRecipes()
  const { ingredients } = useIngredients()
  const { nutrients: nutrientRegistry } = useNutrients()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<RecipeDraft>(EMPTY_DRAFT)
  const [draftItems, setDraftItems] = useState<RecipeItem[]>([])
  const [draftSteps, setDraftSteps] = useState<RecipeStep[]>([])
  const [perServing, setPerServing] = useState<Record<string, number> | null>(null)

  useEffect(() => { if (error) flash(error) }, [error, flash])

  const selected = recipes.find(r => r.id === routeId) ?? null

  // Per-serving nutrients are computed client-side — this is the one place the
  // browser imports engine *functions* rather than just types. deriveRecipeNutrients
  // throws on a missing ingredient id; render "—" and flash rather than crash the screen.
  useEffect(() => {
    if (!selected || ingredients.length === 0) { setPerServing(null); return }
    try {
      setPerServing(deriveRecipeNutrients(selected, ingredients))
    } catch (err) {
      setPerServing(null)
      flash(err instanceof Error ? err.message : String(err))
    }
  }, [selected, ingredients, flash])

  function selectRecipe(recipe: Recipe) {
    navigate(`/recipes/${recipe.id}`)
  }

  // Same client-assigned id pattern as apps/tui/src/screens/RecipesScreen.tsx: "new"
  // while adding, the real recipe id while editing, so itemRefs picked in the steps
  // sub-form always resolve to an item id the backend will actually persist.
  function baseId(): string {
    return editingId ?? "new"
  }

  function openAdd() {
    setDraft(EMPTY_DRAFT)
    setDraftItems([])
    setDraftSteps([])
    setEditingId(null)
    openModal()
  }

  function openEdit(recipe: Recipe) {
    setDraft(recipeToDraft(recipe))
    setDraftItems(recipe.items)
    setDraftSteps(recipe.steps)
    setEditingId(recipe.id)
    openModal()
  }

  function addItem(item: NewRecipeItem) {
    setDraftItems(prev => [
      ...prev,
      { ...item, id: `${baseId()}-I${prev.length + 1}` },
    ])
  }

  function removeItem(index: number) {
    setDraftItems(prev => {
      const removed = prev[index]
      const next = prev.filter((_, i) => i !== index)
      // Drop the removed item from any step's itemRefs so the picker never offers a
      // dangling reference.
      if (removed?.id) {
        setDraftSteps(steps => steps.map(step => (
          step.itemRefs?.includes(removed.id!)
            ? { ...step, itemRefs: step.itemRefs.filter(ref => ref !== removed.id) }
            : step
        )))
      }
      return next
    })
  }

  function addStep(step: NewRecipeStep) {
    setDraftSteps(prev => [
      ...prev,
      { ...step, id: `${baseId()}-S${prev.length + 1}` },
    ])
  }

  function removeStep(index: number) {
    setDraftSteps(prev => prev.filter((_, i) => i !== index))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const name = draft.name.trim()
    if (!name) { flash("name is required"); return }
    if (draftItems.length === 0) { flash("at least one item is required"); return }

    const payload = {
      name,
      yield: parseFloat(draft.yield) || 1,
      tags: draft.tags.split(",").map(t => t.trim()).filter(Boolean),
      description: draft.description.trim() || undefined,
      prepTime: draft.prepTime.trim() ? parseInt(draft.prepTime, 10) : undefined,
      cookTime: draft.cookTime.trim() ? parseInt(draft.cookTime, 10) : undefined,
      items: draftItems,
      steps: draftSteps,
    }

    if (editingId) {
      const okd = await update(editingId, payload)
      if (okd) flash(`updated "${name}"`)
      closeModal()
      return
    }

    const newId = await add(payload)
    if (newId) { flash(`added "${name}"`); navigate(`/recipes/${newId}`) }
    closeModal()
  }

  async function confirmDelete() {
    if (!selected) return
    const { id, name } = selected
    closeConfirm()
    await remove(id)
    navigate("/recipes")
    flash(`deleted "${name}"`)
  }

  function nutrientLabel(id: string): string {
    return nutrientRegistry.find(n => n.id === id)?.name ?? id
  }

  function nutrientUnit(id: string): string {
    return nutrientRegistry.find(n => n.id === id)?.unit ?? ""
  }

  const columns: DataTableColumn<Recipe>[] = [
    { key: "name", header: "name", render: r => r.name },
    { key: "yield", header: "yield", render: r => r.yield, align: "right", width: "20%" },
  ]

  return (
    <div className={s.screen}>
      <section className={s.list}>
        <header className={s.paneHeader}>
          <h1 className={s.paneTitle}>recipes</h1>
          <span className={s.spacer} />
          <Button variant="primary" onClick={openAdd}>add</Button>
        </header>
        <DataTable
          columns={columns}
          rows={recipes}
          rowKey={r => r.id}
          onRowClick={selectRecipe}
          isActive={r => r.id === selected?.id}
          emptyMessage={loading ? "loading…" : "no recipes yet"}
          footer={loading ? "loading…" : `${recipes.length} ${recipes.length === 1 ? "entry" : "entries"}`}
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
              <p className={s.detailMeta}>id: {selected.id}  ·  yield: {selected.yield} serving{selected.yield !== 1 ? "s" : ""}</p>
              {(selected.prepTime != null || selected.cookTime != null) && (
                <p className={s.detailMeta}>
                  {selected.prepTime != null && `prep: ${selected.prepTime}min`}
                  {selected.prepTime != null && selected.cookTime != null && "  ·  "}
                  {selected.cookTime != null && `cook: ${selected.cookTime}min`}
                </p>
              )}
            </header>

            {selected.description && <p className={s.description}>{selected.description}</p>}

            {selected.tags.length > 0 && (
              <div className={s.tags}>
                {selected.tags.map(t => <Tag key={t} label={t} variant="info" />)}
              </div>
            )}

            <p className={s.sectionLabel}>items</p>
            <ul className={s.plainList}>
              {selected.items.map(item => {
                const ing = ingredients.find(i => i.id === item.ingredientId)
                return (
                  <li key={item.id} className={s.itemRow}>
                    <span>{ing ? ing.name : item.ingredientId}</span>
                    <span className={s.itemQty}>{item.quantity} {item.unit}</span>
                  </li>
                )
              })}
            </ul>

            {selected.steps.length > 0 && (
              <>
                <p className={s.sectionLabel}>steps ({selected.steps.length})</p>
                <ol className={s.stepList}>
                  {selected.steps.map((step, i) => (
                    <li key={step.id} className={s.stepRow}>
                      <p className={s.stepTitle}>
                        {step.title ? `${i + 1}. ${step.title}` : `step ${i + 1}`}
                        {step.timer ? `  [${formatTimer(step.timer)}]` : ""}
                      </p>
                      <p className={s.stepBody}>{step.body}</p>
                      {step.itemRefs && step.itemRefs.length > 0 && (
                        <p className={s.stepRefs}>
                          uses: {step.itemRefs.map(ref => {
                            const item = selected.items.find(it => it.id === ref)
                            const ing = item ? ingredients.find(i => i.id === item.ingredientId) : null
                            return ing ? ing.name : ref
                          }).join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}

            <p className={s.sectionLabel}>per serving</p>
            {perServing ? (
              <div className={s.nutrientRow}>
                {Object.entries(perServing).map(([id, val]) => (
                  <span key={id} className={s.nutrientValue}>
                    {nutrientLabel(id)}: {val.toFixed(1)} {nutrientUnit(id)}
                  </span>
                ))}
                {Object.keys(perServing).length === 0 && <span className={s.empty}>—</span>}
              </div>
            ) : (
              <p className={s.empty}>—</p>
            )}

            <div className={s.detailActions}>
              <Button onClick={() => openEdit(selected)}>edit</Button>
              <Button variant="danger" onClick={openConfirm}>delete</Button>
            </div>
          </div>
        ) : (
          <p className={s.empty}>{loading ? "loading…" : "select a recipe"}</p>
        )}
      </section>

      {modalOpen && (
        <Modal
          title={editingId ? `edit ${editingId}` : "add recipe"}
          onClose={closeModal}
          onSubmit={save}
          width={640}
          footerHint={<KeyHint hints={["esc=cancel"]} />}
          footer={
            <>
              <Button onClick={closeModal}>cancel</Button>
              <Button variant="primary" type="submit">save</Button>
            </>
          }
        >
          <FormField label="name">
            <TextInput autoFocus value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          </FormField>
          <div className={s.fieldRow}>
            <FormField label="yield" suffix="servings">
              <TextInput inputMode="decimal" value={draft.yield} onChange={e => setDraft(d => ({ ...d, yield: e.target.value }))} />
            </FormField>
            <FormField label="prep" suffix="min">
              <TextInput inputMode="numeric" value={draft.prepTime} onChange={e => setDraft(d => ({ ...d, prepTime: e.target.value }))} />
            </FormField>
            <FormField label="cook" suffix="min">
              <TextInput inputMode="numeric" value={draft.cookTime} onChange={e => setDraft(d => ({ ...d, cookTime: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="tags" hint="comma separated">
            <TextInput value={draft.tags} onChange={e => setDraft(d => ({ ...d, tags: e.target.value }))} />
          </FormField>
          <FormField label="description">
            <TextInput value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          </FormField>

          <ItemsEditor items={draftItems} ingredients={ingredients} onAdd={addItem} onRemove={removeItem} />
          <StepsEditor steps={draftSteps} items={draftItems} ingredients={ingredients} onAdd={addStep} onRemove={removeStep} />
        </Modal>
      )}

      {confirmOpen && selected && (
        <ConfirmDialog itemName={selected.name} onConfirm={confirmDelete} onCancel={closeConfirm} />
      )}
    </div>
  )
}
