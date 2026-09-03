import { useEffect, useState, type FormEvent } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import type { CookEvent, GroceryItem, NutrientGoal, PlanMode, PlanRecord } from "@wc/types"
import type { DiagnosisItem, SolveResult } from "@wc/engine"
import { useFlash } from "../App"
import { usePlans } from "../hooks/usePlans"
import { useRecipes } from "../hooks/useRecipes"
import { useNutrients } from "../hooks/useNutrients"
import { Button } from "../components/Button"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { CookEventsEditor } from "../components/CookEventsEditor"
import { DataTable, type DataTableColumn } from "../components/DataTable"
import { FormField } from "../components/FormField"
import { GoalsEditor } from "../components/GoalsEditor"
import { KeyHint } from "../components/KeyHint"
import { Modal } from "../components/Modal"
import s from "./PlanScreen.module.css"

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MODES: PlanMode[] = ["daily-cook", "meal-prep"]

interface PlanDraft {
  mode: PlanMode
  tolerance: string
  goals: Record<string, string>
}

const EMPTY_DRAFT: PlanDraft = { mode: "daily-cook", tolerance: "10", goals: {} }

type View = "detail" | "grocery" | "solve"

function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(1)
}

function draftFromPlan(plan: PlanRecord): PlanDraft {
  return {
    mode: plan.mode,
    tolerance: String(plan.goals[0]?.tolerancePct ?? 10),
    goals: Object.fromEntries(plan.goals.map(g => [g.nutrientId, String(g.target)])),
  }
}

export function PlanScreen() {
  const flash = useFlash()
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams<{ id: string }>()

  const {
    plans, loading, error, modalOpen, confirmOpen,
    add, update, remove, grocery, solve,
    openModal, closeModal, openConfirm, closeConfirm,
  } = usePlans()
  const { recipes } = useRecipes()
  const { nutrients } = useNutrients()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT)
  const [draftEvents, setDraftEvents] = useState<CookEvent[]>([])

  const [busy, setBusy] = useState(false)
  const [groceryItems, setGroceryItems] = useState<GroceryItem[] | null>(null)
  const [solveResult, setSolveResult] = useState<{ diagnosis: DiagnosisItem[]; solution: SolveResult } | null>(null)

  useEffect(() => { if (error) flash(error) }, [error, flash])

  const selected = plans.find(p => p.id === routeId) ?? null

  const view: View = location.pathname.endsWith("/grocery")
    ? "grocery"
    : location.pathname.endsWith("/solve")
      ? "solve"
      : "detail"

  const labelById = new Map(nutrients.map(n => [n.id, n.name]))
  const unitById = new Map(nutrients.map(n => [n.id, n.unit]))
  const nutrientLabel = (id: string): string => labelById.get(id) ?? id
  const recipeName = (id: string): string => recipes.find(r => r.id === id)?.name ?? id

  // A different plan (or navigating away) invalidates whatever was last computed.
  useEffect(() => {
    setGroceryItems(null)
    setSolveResult(null)
  }, [selected?.id])

  // Deep-linking straight to /plan/:id/grocery or /plan/:id/solve runs the
  // computation on arrival, same as pressing g/s in the TUI would.
  useEffect(() => {
    if (!selected) return
    if (view === "grocery") { void runGrocery(selected) }
    else if (view === "solve") { void runSolve(selected) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selected?.id])

  async function runGrocery(plan: PlanRecord) {
    setBusy(true)
    try {
      const items = await grocery(plan)
      setGroceryItems(items)
    } catch (err) {
      flash(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function runSolve(plan: PlanRecord) {
    setBusy(true)
    try {
      const result = await solve(plan)
      setSolveResult(result)
    } catch (err) {
      flash(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function selectPlan(plan: PlanRecord) {
    navigate(`/plan/${plan.id}`)
  }

  function openAdd() {
    setDraft(EMPTY_DRAFT)
    setDraftEvents([])
    setEditingId(null)
    openModal()
  }

  function openEdit(plan: PlanRecord) {
    setDraft(draftFromPlan(plan))
    setDraftEvents(plan.cookEvents.map(e => ({ ...e })))
    setEditingId(plan.id)
    openModal()
  }

  function addEvent(event: CookEvent) {
    setDraftEvents(prev => [...prev, event])
  }

  function removeEvent(index: number) {
    setDraftEvents(prev => prev.filter((_, i) => i !== index))
  }

  function buildGoals(tolerancePct: number): NutrientGoal[] {
    return nutrients
      .filter(n => n.targetable)
      .map(n => ({ nutrientId: n.id, target: parseFloat(draft.goals[n.id] ?? "") }))
      .filter(g => !isNaN(g.target) && g.target > 0)
      .map(g => ({ ...g, tolerancePct }))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (draftEvents.length === 0) { flash("at least one cook event is required"); return }
    const tolerancePct = Math.min(100, Math.max(0, parseInt(draft.tolerance, 10) || 10))
    const goals = buildGoals(tolerancePct)
    const payload = { mode: draft.mode, cookEvents: draftEvents, goals }

    if (editingId) {
      const okd = await update(editingId, payload)
      if (okd) flash(`updated plan ${editingId}`)
      closeModal()
      return
    }

    const newId = await add(payload)
    if (newId) { flash(`created plan ${newId}`); navigate(`/plan/${newId}`) }
    closeModal()
  }

  async function confirmDelete() {
    if (!selected) return
    const { id } = selected
    closeConfirm()
    await remove(id)
    navigate("/plan")
    flash(`deleted plan ${id}`)
  }

  const columns: DataTableColumn<PlanRecord>[] = [
    { key: "id", header: "id", render: p => p.id },
    { key: "mode", header: "mode", render: p => p.mode },
    { key: "events", header: "events", render: p => p.cookEvents.length, align: "right", width: "18%" },
    { key: "goals", header: "goals", render: p => p.goals.length, align: "right", width: "18%" },
  ]

  const groceryColumns: DataTableColumn<GroceryItem>[] = [
    { key: "ingredientName", header: "ingredient", render: g => g.ingredientName },
    { key: "quantity", header: "quantity", render: g => `${formatQty(g.quantity)} ${g.unit}`, align: "right", width: "30%" },
  ]

  const diagnosisColumns: DataTableColumn<DiagnosisItem>[] = [
    { key: "nutrientId", header: "nutrient", render: d => nutrientLabel(d.nutrientId) },
    { key: "target", header: "target", render: d => `${d.target} ${unitById.get(d.nutrientId) ?? ""}`, align: "right", width: "22%" },
    { key: "achievableMax", header: "max", render: d => d.achievableMax.toFixed(1), align: "right", width: "18%" },
    {
      key: "feasible",
      header: "status",
      render: d => (d.feasible ? "ok" : d.warning ?? "infeasible"),
      width: "26%",
    },
  ]

  const servingsRows = selected && solveResult
    ? Object.entries(solveResult.solution.servings).filter(([, v]) => v > 0)
    : []

  return (
    <div className={s.screen}>
      <section className={s.list}>
        <header className={s.paneHeader}>
          <h1 className={s.paneTitle}>plans</h1>
          <span className={s.spacer} />
          <Button variant="primary" onClick={openAdd}>add</Button>
        </header>
        <DataTable
          columns={columns}
          rows={plans}
          rowKey={p => p.id}
          onRowClick={selectPlan}
          isActive={p => p.id === selected?.id}
          emptyMessage={loading ? "loading…" : "no plans yet"}
          footer={loading ? "loading…" : `${plans.length} ${plans.length === 1 ? "entry" : "entries"}`}
        />
        <footer className={s.paneFooter}>
          <KeyHint hints={["a=add", "e=edit", "d=delete"]} />
        </footer>
      </section>

      <section className={s.detail}>
        {!selected ? (
          <p className={s.empty}>{loading ? "loading…" : "select a plan (or add one)"}</p>
        ) : (
          <div className={s.detailInner}>
            <header className={s.detailHead}>
              <h2 className={s.detailName}>{selected.id}</h2>
              <p className={s.detailMeta}>{selected.mode} · created {selected.created_at}</p>
            </header>

            <div className={s.tabs}>
              <Button
                variant={view === "detail" ? "primary" : "default"}
                onClick={() => navigate(`/plan/${selected.id}`)}
              >
                detail
              </Button>
              <Button
                variant={view === "grocery" ? "primary" : "default"}
                onClick={() => navigate(`/plan/${selected.id}/grocery`)}
              >
                grocery
              </Button>
              <Button
                variant={view === "solve" ? "primary" : "default"}
                onClick={() => navigate(`/plan/${selected.id}/solve`)}
              >
                solve
              </Button>
            </div>

            {view === "detail" && (
              <>
                <p className={s.sectionLabel}>cook events</p>
                <ul className={s.plainList}>
                  {selected.cookEvents.map((event, i) => (
                    <li key={i} className={s.itemRow}>
                      <span>{DAY_NAMES[event.day]} {event.slot} · {recipeName(event.recipeId)}</span>
                      <span className={s.itemQty}>×{event.yield}</span>
                    </li>
                  ))}
                  {selected.cookEvents.length === 0 && <li className={s.empty}>none</li>}
                </ul>

                <p className={s.sectionLabel}>goals</p>
                <ul className={s.plainList}>
                  {selected.goals.map((goal, i) => (
                    <li key={i} className={s.itemRow}>
                      <span>{nutrientLabel(goal.nutrientId)}</span>
                      <span className={s.itemQty}>
                        {goal.target} {unitById.get(goal.nutrientId) ?? ""} (±{goal.tolerancePct}%)
                      </span>
                    </li>
                  ))}
                  {selected.goals.length === 0 && <li className={s.empty}>none</li>}
                </ul>

                <div className={s.detailActions}>
                  <Button onClick={() => openEdit(selected)}>edit</Button>
                  <Button variant="danger" onClick={openConfirm}>delete</Button>
                </div>
              </>
            )}

            {view === "grocery" && (
              <>
                <p className={s.sectionLabel}>grocery list</p>
                {busy && <p className={s.empty}>loading…</p>}
                {!busy && groceryItems && (
                  <DataTable
                    columns={groceryColumns}
                    rows={groceryItems}
                    rowKey={g => g.ingredientId}
                    emptyMessage="nothing to buy"
                  />
                )}
              </>
            )}

            {view === "solve" && (
              <>
                <p className={s.sectionLabel}>solver</p>
                {busy && <p className={s.empty}>loading…</p>}
                {!busy && solveResult && (
                  <>
                    <p className={solveResult.solution.feasible ? s.feasible : s.infeasible}>
                      feasible: {solveResult.solution.feasible ? "yes" : "no"} · deviation: {solveResult.solution.deviation.toFixed(2)}
                    </p>

                    <p className={s.sectionLabel}>diagnosis</p>
                    <DataTable
                      columns={diagnosisColumns}
                      rows={solveResult.diagnosis}
                      rowKey={d => d.nutrientId}
                      emptyMessage="no targetable goals"
                    />

                    <p className={s.sectionLabel}>servings</p>
                    <ul className={s.plainList}>
                      {servingsRows.map(([recipeId, count]) => (
                        <li key={recipeId} className={s.itemRow}>
                          <span>{recipeName(recipeId)}</span>
                          <span className={s.itemQty}>×{count}</span>
                        </li>
                      ))}
                      {servingsRows.length === 0 && <li className={s.empty}>none</li>}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {modalOpen && (
        <Modal
          title={editingId ? `edit ${editingId}` : "add plan"}
          onClose={closeModal}
          onSubmit={save}
          width={560}
          footerHint={<KeyHint hints={["esc=cancel"]} />}
          footer={
            <>
              <Button onClick={closeModal}>cancel</Button>
              <Button variant="primary" type="submit">save</Button>
            </>
          }
        >
          <FormField label="mode">
            <select
              className={s.modeSelect}
              value={draft.mode}
              onChange={e => setDraft(d => ({ ...d, mode: e.target.value as PlanMode }))}
            >
              {MODES.map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </FormField>

          <CookEventsEditor events={draftEvents} recipes={recipes} onAdd={addEvent} onRemove={removeEvent} />

          <GoalsEditor
            nutrients={nutrients}
            tolerance={draft.tolerance}
            onToleranceChange={v => setDraft(d => ({ ...d, tolerance: v }))}
            goals={draft.goals}
            onGoalChange={(id, v) => setDraft(d => ({ ...d, goals: { ...d.goals, [id]: v } }))}
          />
        </Modal>
      )}

      {confirmOpen && selected && (
        <ConfirmDialog itemName={selected.id} onConfirm={confirmDelete} onCancel={closeConfirm} />
      )}
    </div>
  )
}
