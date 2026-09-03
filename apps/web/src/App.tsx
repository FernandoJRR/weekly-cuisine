import { Outlet, useOutletContext } from "react-router-dom"
import { HelpOverlay } from "./components/HelpOverlay"
import { Sidebar } from "./components/Sidebar"
import { StatusBar } from "./components/StatusBar"
import { useGlobalKeys } from "./hooks/useGlobalKeys"
import { useStatusMessage } from "./hooks/useStatusMessage"
import s from "./App.module.css"

/** What every screen gets from the shell. Mirrors the TUI's `onFlash` prop. */
export interface AppContext {
  flash: (msg: string) => void
}

/** Screens read the shell's flash channel through the router outlet context. */
export function useFlash(): (msg: string) => void {
  return useOutletContext<AppContext>().flash
}

/** Two-panel shell: sidebar | screen, with the status bar underneath. */
export function App() {
  const status = useStatusMessage()
  const { showHelp, closeHelp } = useGlobalKeys()
  const context: AppContext = { flash: status.flash }

  return (
    <div className={s.shell}>
      <div className={s.body}>
        <Sidebar />
        <main className={s.content}>
          <Outlet context={context} />
        </main>
      </div>
      <StatusBar message={status.message} />
      {showHelp && <HelpOverlay onClose={closeHelp} />}
    </div>
  )
}
