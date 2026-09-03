import type { TagVariant } from "@wc/types"
import s from "./Tag.module.css"

const VARIANT: Record<TagVariant, string | undefined> = {
  default: s.default,
  info: s.info,
  success: s.success,
  warning: s.warning,
  danger: s.danger,
  neutral: s.neutral,
}

interface TagProps {
  label: string
  variant?: TagVariant
}

/** `[label]` badge. Port of apps/tui/src/components/Tag.tsx - same TagVariant union. */
export function Tag({ label, variant = "default" }: TagProps) {
  return <span className={`${s.tag} ${VARIANT[variant]}`}>[{label}]</span>
}
