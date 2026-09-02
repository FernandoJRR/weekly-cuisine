import { useEffect } from "react"
import type { CookMode as CookModeState, Ingredient, Recipe } from "@wc/types"
import { KeyHint } from "./KeyHint"
import s from "./CookMode.module.css"

interface CookModeProps {
  recipe: Recipe
  cookMode: Extract<CookModeState, { open: true }>
  ingredients: Ingredient[]
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/**
 * Full-screen cook-mode overlay. Port of the cook-mode block in
 * apps/tui/src/screens/RecipesScreen.tsx: same `█/░` progress glyphs, same
 * title/body/timer/itemRefs layout, same ←/h →/l Esc keys — owned locally by this
 * component (like Modal's own Escape listener) rather than the global keymap, so
 * `useGlobalKeys` only has to know an overlay is open, not how to drive it.
 */
export function CookMode({ recipe, cookMode, ingredients, onNext, onPrev, onClose }: CookModeProps) {
  const total = recipe.steps.length
  const step = recipe.steps[cookMode.stepIndex] ?? null

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === "ArrowRight" || event.key === "l") {
        event.preventDefault()
        onNext()
        return
      }
      if (event.key === "ArrowLeft" || event.key === "h") {
        event.preventDefault()
        onPrev()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onNext, onPrev, onClose])

  return (
    <div
      className={s.backdrop}
      data-overlay
      role="dialog"
      aria-modal="true"
      aria-label={`cook: ${recipe.name}`}
    >
      <div className={s.panel}>
        <div className={s.title}>cook: {recipe.name}</div>

        <div className={s.body}>
          {step ? (
            <>
              <div className={s.meta}>
                <span className={s.stepCount}>step {cookMode.stepIndex + 1} of {total}</span>
                {step.timer != null && <span className={s.timer}>{formatTimer(step.timer)}</span>}
              </div>

              <div className={s.progress} aria-hidden="true">
                <span className={s.progressDone}>{"█".repeat(cookMode.stepIndex + 1)}</span>
                <span className={s.progressLeft}>{"░".repeat(Math.max(0, total - cookMode.stepIndex - 1))}</span>
              </div>

              <h2 className={s.stepTitle}>{step.title || `step ${cookMode.stepIndex + 1}`}</h2>
              <p className={s.stepBody}>{step.body}</p>

              {step.itemRefs && step.itemRefs.length > 0 && (
                <div className={s.uses}>
                  <p className={s.sectionLabel}>uses</p>
                  <ul className={s.plainList}>
                    {step.itemRefs.map(ref => {
                      const item = recipe.items.find(it => it.id === ref)
                      if (!item) return null
                      const ing = ingredients.find(i => i.id === item.ingredientId)
                      return (
                        <li key={ref} className={s.itemRow}>
                          <span>{ing ? ing.name : item.ingredientId}</span>
                          <span className={s.itemQty}>{item.quantity} {item.unit}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className={s.empty}>no steps</p>
          )}
        </div>

        <footer className={s.footer}>
          <KeyHint hints={["←/h=prev", "→/l=next", "esc=exit cook mode"]} />
        </footer>
      </div>
    </div>
  )
}
