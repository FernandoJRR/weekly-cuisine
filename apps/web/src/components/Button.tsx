import type { ComponentPropsWithRef } from "react"
import s from "./Button.module.css"

export type ButtonVariant = "default" | "primary" | "danger" | "ghost"
export type ButtonSize = "sm" | "md"

interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANT: Record<ButtonVariant, string | undefined> = {
  default: s.default,
  primary: s.primary,
  danger: s.danger,
  ghost: s.ghost,
}

const SIZE: Record<ButtonSize, string | undefined> = {
  sm: s.sm,
  md: s.md,
}

/**
 * Design-system button: bracket-notation `[ ACTION ]` labels, uppercased by the
 * stylesheet so callers pass plain lowercase copy.
 */
export function Button({ variant = "default", size = "sm", className, children, type, ...rest }: ButtonProps) {
  const classes = [s.button, VARIANT[variant], SIZE[size], className].filter(Boolean).join(" ")
  return (
    <button type={type ?? "button"} className={classes} {...rest}>
      <span className={s.bracket}>[</span>
      <span className={s.label}>{children}</span>
      <span className={s.bracket}>]</span>
    </button>
  )
}
