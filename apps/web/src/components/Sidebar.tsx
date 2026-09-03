import { NavLink } from "react-router-dom"
import { KeyHint } from "./KeyHint"
import s from "./Sidebar.module.css"

/** Nav rail: same five destinations as the TUI sidebar, in the same order. */
const NAV = [
  { to: "/recipes", label: "recipes" },
  { to: "/ingredients", label: "ingredients" },
  { to: "/nutrients", label: "nutrients" },
  { to: "/search", label: "search" },
  { to: "/plan", label: "plans" },
]

export function Sidebar() {
  return (
    <nav className={s.sidebar} aria-label="primary">
      <div className={s.brand}>
        <span className={s.mark}>WC</span>
        <span className={s.wordmark}>
          <span className={s.wordmarkLo}>WEEKLY </span>
          <span className={s.wordmarkHi}>CUISINE</span>
        </span>
      </div>
      <div className={s.nav}>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? `${s.item} ${s.itemActive}` : s.item)}
          >
            {({ isActive }) => (
              <>
                <span className={s.caret}>{isActive ? "▶" : " "}</span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
      <div className={s.spacer} />
      <div className={s.hint}>
        <KeyHint hints={["tab=switch"]} />
      </div>
    </nav>
  )
}
