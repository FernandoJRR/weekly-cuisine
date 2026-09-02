import { TextAttributes } from "@opentui/core"
import { color } from "../tokens"

interface KeyHintProps {
  /** "key=label" pairs; the key glyph is accent-bright, the label dim. */
  hints: string[]
}

/** Footer/hint-strip text with per-key accent coloring (flat bar, no box). */
export function KeyHint({ hints }: KeyHintProps) {
  const nodes = hints.flatMap((hint, i) => {
    const eq = hint.indexOf("=")
    const key = eq === -1 ? hint : hint.slice(0, eq)
    const label = eq === -1 ? "" : hint.slice(eq + 1)
    const out = [
      <span key={`k${i}`} fg={color.accent.hi} attributes={TextAttributes.BOLD}>{key}</span>,
    ]
    if (label) out.push(<span key={`l${i}`} fg={color.text.dim}>={label}</span>)
    if (i < hints.length - 1) out.push(<span key={`s${i}`} fg={color.text.dim}>{"  "}</span>)
    return out
  })
  return <text>{nodes}</text>
}
