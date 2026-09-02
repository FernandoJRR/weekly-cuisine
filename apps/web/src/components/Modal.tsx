import { useEffect, type FormEvent, type ReactNode } from "react"
import s from "./Modal.module.css"

interface ModalProps {
  /** Rendered ALL CAPS in the title bar - pass lowercase copy. */
  title: string
  onClose: () => void
  /** When present the panel is a <form> and this runs on submit. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  /** Danger paints the border and title in status-error (destructive flows). */
  variant?: "default" | "danger"
  /** alertdialog for confirmations, dialog otherwise. */
  role?: "dialog" | "alertdialog"
  /** Actions row; the modal supplies the layout, the caller the buttons. */
  footer?: ReactNode
  /** Hints shown at the far left of the footer row. */
  footerHint?: ReactNode
  width?: number
  children: ReactNode
}

/**
 * bg-elevated panel over a dimmed page, mint-glow depth, Esc or backdrop to close.
 * The web equivalent of the TUI's double-bordered absolute box.
 *
 * The backdrop carries `data-overlay` so `useGlobalKeys` can detect that a modal
 * (or the cook-mode overlay, which marks itself the same way) is on screen and
 * yield to it, without every screen having to report its own modal state up to
 * the shell.
 */
export function Modal({
  title, onClose, onSubmit, variant = "default", role = "dialog",
  footer, footerHint, width, children,
}: ModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const panelClasses = [s.panel, variant === "danger" ? s.danger : null].filter(Boolean).join(" ")
  const body = (
    <>
      <div className={s.title}>{title}</div>
      <div className={s.body}>{children}</div>
      {(footer || footerHint) && (
        <div className={s.footer}>
          {footerHint}
          <span className={s.spacer} />
          {footer}
        </div>
      )}
    </>
  )

  return (
    <div className={s.backdrop} data-overlay role="presentation" onMouseDown={onClose}>
      {onSubmit ? (
        <form
          className={panelClasses}
          style={width ? { width } : undefined}
          role={role}
          aria-modal="true"
          aria-label={title}
          onMouseDown={e => e.stopPropagation()}
          onSubmit={onSubmit}
        >
          {body}
        </form>
      ) : (
        <div
          className={panelClasses}
          style={width ? { width } : undefined}
          role={role}
          aria-modal="true"
          aria-label={title}
          onMouseDown={e => e.stopPropagation()}
        >
          {body}
        </div>
      )}
    </div>
  )
}
