import { useLocation } from "react-router-dom"
import { KeyHint } from "./KeyHint"
import s from "./StatusBar.module.css"

/** Route order for the pager dots — mirrors the sidebar and the TUI's SCREENS. */
const SCREENS = ["/recipes", "/ingredients", "/nutrients", "/search", "/plan"]

interface StatusBarProps {
  message: string | null
}

/** Flash message, otherwise the global key hints; pager dots on the right. */
export function StatusBar({ message }: StatusBarProps) {
  const { pathname } = useLocation()

  return (
    <footer className={s.statusbar}>
      {message
        ? <span className={s.message} role="status">{message}</span>
        : <KeyHint hints={["tab=switch screen", "a=add", "e=edit", "d=delete", "?=help"]} />}
      <span className={s.spacer} />
      <span className={s.dots} aria-hidden="true">
        {SCREENS.map(route => (
          <span key={route} className={pathname.startsWith(route) ? s.dotActive : undefined}>●</span>
        ))}
      </span>
    </footer>
  )
}
