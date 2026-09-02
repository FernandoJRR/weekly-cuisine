import { useState } from "react"
import { useIngredients } from "../hooks/useIngredients"
import { useRecipes } from "../hooks/useRecipes"
import { TextInput } from "../components/TextInput"
import s from "./SearchScreen.module.css"

interface SearchResult {
  kind: "recipe" | "ingredient"
  id: string
  name: string
  sub: string
}

/**
 * Pure client-side filter over recipes + ingredients — no dedicated hook, no API
 * call beyond the two collections both screens already load. Port of
 * apps/tui/src/screens/SearchScreen.tsx: selecting a result highlights it in place,
 * it does not navigate elsewhere.
 */
export function SearchScreen() {
  const { recipes } = useRecipes()
  const { ingredients } = useIngredients()
  const [query, setQuery] = useState("")
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const results: SearchResult[] = q.length === 0 ? [] : [
    ...recipes
      .filter(r => r.name.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)))
      .map(r => ({ kind: "recipe" as const, id: r.id, name: r.name, sub: r.tags.join(", ") || r.id })),
    ...ingredients
      .filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
      .map(i => ({ kind: "ingredient" as const, id: i.id, name: i.name, sub: i.category })),
  ]

  return (
    <div className={s.screen}>
      <header className={s.header}>
        <span className={s.prompt}>/</span>
        <TextInput
          autoFocus
          className={s.input}
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedKey(null) }}
          placeholder="search recipes and ingredients…"
        />
      </header>

      <div className={s.results}>
        {results.length === 0 && q.length > 0 && (
          <p className={s.empty}>no results for &quot;{query}&quot;</p>
        )}
        {results.length === 0 && q.length === 0 && (
          <p className={s.hint}>start typing to search…</p>
        )}
        {results.map(r => {
          const key = `${r.kind}:${r.id}`
          const active = key === selectedKey
          return (
            <button
              key={key}
              type="button"
              className={active ? `${s.row} ${s.rowActive}` : s.row}
              onClick={() => setSelectedKey(key)}
            >
              <span className={r.kind === "recipe" ? s.kindRecipe : s.kindIngredient}>{r.kind}</span>
              <span className={s.name}>{r.name}</span>
              <span className={s.sub}>{r.sub}</span>
            </button>
          )
        })}
      </div>

      {q.length > 0 && (
        <footer className={s.footer}>
          {results.length} {results.length === 1 ? "result" : "results"}
        </footer>
      )}
    </div>
  )
}
