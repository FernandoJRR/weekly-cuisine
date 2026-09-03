import s from "./KeyHint.module.css"

interface KeyHintProps {
  /** "key=label" pairs; the key glyph is accent-bright, the label dim. */
  hints: string[]
}

/** Hint strip with per-key accent coloring. Port of apps/tui/src/components/KeyHint.tsx. */
export function KeyHint({ hints }: KeyHintProps) {
  return (
    <span className={s.hint}>
      {hints.map(hint => {
        const eq = hint.indexOf("=")
        const key = eq === -1 ? hint : hint.slice(0, eq)
        const label = eq === -1 ? "" : hint.slice(eq + 1)
        return (
          <span key={hint}>
            <span className={s.key}>{key}</span>
            {label && <span className={s.label}>={label}</span>}
          </span>
        )
      })}
    </span>
  )
}
