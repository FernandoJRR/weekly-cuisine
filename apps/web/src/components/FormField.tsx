import type { ReactNode } from "react"
import s from "./FormField.module.css"

interface FormFieldProps {
  /** Rendered ALL CAPS by the stylesheet - pass lowercase copy. */
  label: string
  /** Unit or other trailing annotation, shown after the control. */
  suffix?: string
  /** Terse lowercase helper copy. */
  hint?: string
  /** Terse lowercase error copy; replaces the hint while set. */
  error?: string
  children: ReactNode
}

/** ALL CAPS label + control + one line of hint or error copy. */
export function FormField({ label, suffix, hint, error, children }: FormFieldProps) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <span className={s.control}>
        {children}
        {suffix && <span className={s.suffix}>{suffix}</span>}
      </span>
      {error
        ? <span className={s.error}>{error}</span>
        : hint && <span className={s.hint}>{hint}</span>}
    </label>
  )
}
