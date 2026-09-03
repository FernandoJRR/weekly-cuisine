import type { ComponentPropsWithRef } from "react"
import s from "./TextInput.module.css"

interface TextInputProps extends ComponentPropsWithRef<"input"> {
  /** Paints border-error instead of the default border until it clears. */
  invalid?: boolean
}

/** Single-line input: mint border-active on focus, status-error border when invalid. */
export function TextInput({ invalid = false, className, ...rest }: TextInputProps) {
  const classes = [s.input, invalid ? s.invalid : null, className].filter(Boolean).join(" ")
  return <input className={classes} aria-invalid={invalid || undefined} {...rest} />
}
