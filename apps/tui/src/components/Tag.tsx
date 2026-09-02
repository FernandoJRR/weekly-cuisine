import { color } from "../tokens"
import type { TagVariant } from "@wc/types"

const FG: Record<TagVariant, string> = {
  default:  color.text.muted,
  info:     color.status.info,
  success:  color.status.success,
  warning:  color.status.warning,
  danger:   color.status.error,
  neutral:  color.text.dim,
}

interface TagProps {
  label: string
  variant?: TagVariant
}

export function Tag({ label, variant = "default" }: TagProps) {
  return <text fg={FG[variant]}>[{label}]</text>
}
