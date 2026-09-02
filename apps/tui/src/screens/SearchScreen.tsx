import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { color, space } from "../tokens"
import { KeyHint } from "../components/KeyHint"
import type { Recipe, Ingredient } from "@wc/types"

interface SearchResult {
  kind: "recipe" | "ingredient"
  id: string
  name: string
  sub: string
}

interface SearchScreenProps {
  active: boolean
  recipes: Recipe[]
  ingredients: Ingredient[]
}

export function SearchScreen({ active, recipes, ingredients }: SearchScreenProps) {
  const [query, setQuery] = useState("")
  const [inputFocused, setInputFocused] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const q = query.toLowerCase()
  const results: SearchResult[] = q.length === 0 ? [] : [
    ...recipes
      .filter(r => r.name.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)))
      .map(r => ({ kind: "recipe" as const, id: r.id, name: r.name, sub: r.tags.join(", ") })),
    ...ingredients
      .filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
      .map(i => ({ kind: "ingredient" as const, id: i.id, name: i.name, sub: i.category })),
  ]

  useKeyboard((key) => {
    if (!active) return
    if (inputFocused) {
      if (key.name === "escape" || key.name === "return") {
        if (results.length > 0) { setInputFocused(false); setSelectedIdx(0) }
      }
      return
    }
    if (key.name === "escape" || key.name === "/") { setInputFocused(true); return }
    if (key.name === "up") setSelectedIdx(i => Math.max(0, i - 1))
    if (key.name === "down") setSelectedIdx(i => Math.min(results.length - 1, i + 1))
  })

  return (
    <box flexGrow={1} flexDirection="column" backgroundColor={color.bg.base}>
      <box
        paddingX={space[3]}
        paddingY={space[2]}
        border={["bottom"]}
        borderColor={color.bg.border}
        flexDirection="row"
        alignItems="center"
        gap={space[2]}
      >
        <text fg={color.text.dim}>Search: </text>
        <box flexGrow={1} backgroundColor={color.bg.surface}>
          <input
            flexGrow={1}
            focused={active && inputFocused}
            value={query}
            onInput={setQuery}
            placeholder="type to search recipes and ingredients..."
          />
        </box>
      </box>

      <box flexGrow={1} flexDirection="column" paddingX={space[2]} paddingY={space[2]}>
        {results.length === 0 && q.length > 0 && (
          <text fg={color.text.muted}>No results for &quot;{query}&quot;</text>
        )}
        {results.length === 0 && q.length === 0 && (
          <text fg={color.text.dim}>Start typing to search…</text>
        )}
        {results.map((r, i) => {
          const selected = i === selectedIdx && !inputFocused
          return (
            <box
              key={r.id}
              flexDirection="row"
              gap={space[3]}
              paddingX={space[2]}
              paddingY={1}
              border={["left"]}
              borderColor={selected ? color.accent.mid : color.bg.base}
              backgroundColor={selected ? color.bg.elevated : undefined}
            >
              <text
                fg={r.kind === "recipe" ? color.accent.mid : color.status.info}
                width={12}
              >
                {r.kind === "recipe" ? "recipe" : "ingredient"}
              </text>
              <text fg={selected ? color.text.bright : color.text.default} attributes={selected ? TextAttributes.BOLD : TextAttributes.NONE}>
                {r.name}
              </text>
              <text fg={color.text.dim}>{r.sub}</text>
            </box>
          )
        })}
      </box>

      {!inputFocused && results.length > 0 && (
        <box paddingX={space[3]} paddingY={1}>
          <KeyHint hints={["↑↓=navigate", "/=back to search", "Esc=clear"]} />
        </box>
      )}
    </box>
  )
}
