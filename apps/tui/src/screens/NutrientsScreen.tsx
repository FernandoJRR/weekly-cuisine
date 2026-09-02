import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { color, space } from "../tokens"
import { Tag } from "../components/Tag"
import { ConfirmDialog } from "../components/ConfirmDialog"
import { KeyHint } from "../components/KeyHint"
import type { NutrientEntry } from "@wc/types"

// ---- Draft form ----
interface NutrientDraft {
  id: string
  name: string
  unit: string
  targetable: boolean
}

const EMPTY_DRAFT: NutrientDraft = { id: "", name: "", unit: "", targetable: true }
type DraftField = "id" | "name" | "unit" | "targetable"
const ALL_FIELDS: DraftField[] = ["id", "name", "unit", "targetable"]

// ---- Props ----
interface NutrientsScreenProps {
  active: boolean
  nutrients: NutrientEntry[]
  modalOpen: boolean
  confirmOpen: boolean
  onAdd: (entry: NutrientEntry) => Promise<boolean>
  onUpdate: (id: string, patch: Partial<Pick<NutrientEntry, "name" | "unit" | "targetable">>) => Promise<boolean>
  onRemove: (id: string) => Promise<void>
  onOpenModal: () => void
  onCloseModal: () => void
  onOpenConfirm: () => void
  onCloseConfirm: () => void
  onFlash: (msg: string) => void
}

const LABELS: Record<DraftField, string> = {
  id: "ID", name: "Name", unit: "Unit", targetable: "Targetable",
}

export function NutrientsScreen({
  active, nutrients, modalOpen, confirmOpen,
  onAdd, onUpdate, onRemove,
  onOpenModal, onCloseModal, onOpenConfirm, onCloseConfirm, onFlash,
}: NutrientsScreenProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<NutrientDraft>(EMPTY_DRAFT)
  const [focusedField, setFocusedField] = useState<DraftField>("id")

  const selected = nutrients[selectedIdx] ?? null

  function openAddModal() {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setFocusedField("id")
    onOpenModal()
  }

  function openEditModal(entry: NutrientEntry) {
    setDraft({ id: entry.id, name: entry.name, unit: entry.unit, targetable: entry.targetable })
    setEditingId(entry.id)
    setFocusedField("name") // ids are immutable — start past the locked field
    onOpenModal()
  }

  function cycleField(dir: 1 | -1) {
    const order = editingId ? ALL_FIELDS.slice(1) : ALL_FIELDS
    const idx = order.indexOf(focusedField)
    if (idx === -1) { setFocusedField(order[0]!); return }
    setFocusedField(order[(idx + dir + order.length) % order.length]!)
  }

  function saveModal() {
    if (!draft.name.trim()) { onFlash("Name is required"); return }
    if (!draft.unit.trim()) { onFlash("Unit is required"); return }
    if (!editingId && !draft.id.trim()) { onFlash("ID is required"); return }
    if (editingId) {
      onUpdate(editingId, { name: draft.name.trim(), unit: draft.unit.trim(), targetable: draft.targetable })
      onFlash(`Updated "${draft.name.trim()}"`)
    } else {
      const id = draft.id.trim().toLowerCase().replace(/\s+/g, "_")
      if (!/^[a-z][a-z0-9_]*$/.test(id)) { onFlash("ID must be a slug like 'sodium'"); return }
      if (nutrients.some(n => n.id === id)) { onFlash(`Nutrient ${id} already exists`); return }
      onAdd({ id, name: draft.name.trim(), unit: draft.unit.trim(), targetable: draft.targetable })
      onFlash(`Added "${draft.name.trim()}"`)
    }
    onCloseModal()
  }

  useKeyboard((key) => {
    if (!active) return
    if (confirmOpen) return

    if (modalOpen) {
      if (key.name === "escape") { onCloseModal(); return }
      if (key.name === "tab" && !key.shift) { cycleField(1); return }
      if (key.name === "tab" && key.shift) { cycleField(-1); return }
      if ((key.name === "up" || key.name === "down") && focusedField === "targetable") {
        setDraft(d => ({ ...d, targetable: !d.targetable }))
        return
      }
      if (key.name === "return") { saveModal(); return }
      return
    }

    if (key.name === "up") setSelectedIdx(i => Math.max(0, i - 1))
    if (key.name === "down") setSelectedIdx(i => Math.min(nutrients.length - 1, i + 1))
    if (key.name === "a") openAddModal()
    if (key.name === "e" && selected) openEditModal(selected)
    if (key.name === "d" && selected) onOpenConfirm()
  })

  return (
    <box flexGrow={1} flexDirection="row" backgroundColor={color.bg.base}>
      {/* List pane */}
      <box width={34} flexDirection="column" border={["right"]} borderColor={color.bg.border}>
        <box paddingX={space[2]} paddingY={1} border={["bottom"]} borderColor={color.bg.border}>
          <text fg={color.text.muted} attributes={TextAttributes.BOLD}>Nutrients</text>
        </box>
        <select
          flexGrow={1}
          options={nutrients.map(n => ({ name: n.name, description: `${n.id} · ${n.unit}` }))}
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
              <text fg={color.text.dim}>ID: {selected.id}  ·  Unit: {selected.unit}</text>
            </box>
            <box flexDirection="row" gap={space[2]}>
              <Tag label={selected.targetable ? "targetable" : "informational"} variant={selected.targetable ? "success" : "neutral"} />
            </box>
          </>
        ) : (
          <text fg={color.text.dim}>Select a nutrient</text>
        )}
      </box>

      {/* Add / Edit modal */}
      {modalOpen && (
        <box
          position="absolute"
          top={1} left={4} width={60} height={14}
          backgroundColor={color.bg.elevated}
          border={true}
          borderStyle="double"
          borderColor={color.accent.mid}
          title={editingId ? ` Edit Nutrient ${editingId} ` : " Add Nutrient "}
          titleAlignment="center"
          flexDirection="column"
          padding={space[2]}
          gap={1}
        >
          {ALL_FIELDS.map(field => {
            const rowFocused = focusedField === field
            const locked = field === "id" && editingId !== null
            return (
              <box key={field} flexDirection="row" alignItems="center" gap={space[2]}>
                <text fg={locked ? color.text.dim : color.text.muted} width={12}>{LABELS[field]}:</text>
                {field === "targetable" ? (
                  <box flexGrow={1} backgroundColor={rowFocused ? color.bg.overlay : color.bg.surface}>
                    <text fg={rowFocused ? color.text.bright : color.text.default}>
                      {"  "}{draft.targetable ? "yes" : "no"}
                    </text>
                  </box>
                ) : locked ? (
                  <box flexGrow={1} backgroundColor={color.bg.surface}>
                    <text fg={color.text.dim}>  {draft.id}</text>
                  </box>
                ) : (
                  <box flexGrow={1} backgroundColor={rowFocused ? color.bg.overlay : color.bg.surface}>
                    <input
                      flexGrow={1}
                      focused={rowFocused}
                      value={draft[field]}
                      placeholder={field === "id" ? "e.g. sodium" : undefined}
                      onInput={v => setDraft(d => ({ ...d, [field]: v }))}
                    />
                  </box>
                )}
              </box>
            )
          })}
          <box marginTop={space[2]}>
            <KeyHint hints={["Tab=next", "↑↓=toggle", "Enter=save", "Esc=cancel"]} />
          </box>
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
