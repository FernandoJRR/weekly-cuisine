import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { Screen } from "@wc/types"

/** Same order as the sidebar / TUI SCREENS — Tab cycles through this list. */
const SCREENS: Screen[] = ["recipes", "ingredients", "nutrients", "search", "plan"]

const ROUTE: Record<Screen, string> = {
  recipes: "/recipes",
  ingredients: "/ingredients",
  nutrients: "/nutrients",
  search: "/search",
  plan: "/plan",
}

function screenFromPath(pathname: string): Screen {
  const segment = pathname.split("/")[1]
  return (SCREENS as string[]).includes(segment ?? "") ? (segment as Screen) : "recipes"
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
}

/**
 * True while a Modal, ConfirmDialog, or the cook-mode overlay is mounted — every
 * overlay marks its root with `data-overlay` (see components/Modal.tsx,
 * components/CookMode.tsx) so this hook can yield to the screen's own handler
 * without each screen having to lift its modal state up to the shell.
 */
function overlayOpen(): boolean {
  return document.querySelector("[data-overlay]") != null
}

/**
 * Document-level keymap — the browser translation of the TUI's App-level
 * useKeyboard handler (apps/tui/src/index.tsx). Same keys; `Tab` navigates routes
 * here instead of swapping a mounted screen, and there is no `q` binding (closing
 * a browser tab isn't the app's to control).
 *
 *   if any modal / confirm / cook overlay is open → yield to its own handler
 *   ?      toggle the help overlay
 *   /      jump to search
 *   Tab    cycle recipes → ingredients → nutrients → search → plan
 *   g / s  on a plan detail route, jump to its grocery / solve view
 *   Esc    close the help overlay (other overlays close themselves)
 *
 * Shortcuts never fire while the user is typing into an input/textarea/select, so
 * ordinary text entry — e.g. the search screen's own filter box — is untouched.
 */
export function useGlobalKeys() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showHelp, setShowHelp] = useState(false)
  const closeHelp = useCallback(() => setShowHelp(false), [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (showHelp) {
        if (event.key === "Escape" || event.key === "?") {
          event.preventDefault()
          setShowHelp(false)
        }
        return
      }

      if (overlayOpen()) return
      if (isTypingTarget(event.target)) return

      if (event.key === "?") {
        event.preventDefault()
        setShowHelp(true)
        return
      }

      if (event.key === "/") {
        event.preventDefault()
        navigate("/search")
        return
      }

      if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault()
        const idx = SCREENS.indexOf(screenFromPath(location.pathname))
        navigate(ROUTE[SCREENS[(idx + 1) % SCREENS.length]!])
        return
      }

      if (event.key === "g" || event.key === "s") {
        if (screenFromPath(location.pathname) !== "plan") return
        const match = /^\/plan\/([^/]+)/.exec(location.pathname)
        const planId = match?.[1]
        if (!planId) return
        event.preventDefault()
        navigate(`/plan/${planId}/${event.key === "g" ? "grocery" : "solve"}`)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [showHelp, location.pathname, navigate])

  return { showHelp, closeHelp }
}
