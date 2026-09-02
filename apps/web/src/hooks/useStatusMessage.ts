import { useState, useCallback, useRef } from "react"

/** Ephemeral flash message, auto-cleared after 2s. Port of apps/tui/src/hooks/useStatusMessage.ts. */
export function useStatusMessage() {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(msg)
    timerRef.current = setTimeout(() => setMessage(null), 2000)
  }, [])

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(null)
  }, [])

  return { message, flash, clear }
}
