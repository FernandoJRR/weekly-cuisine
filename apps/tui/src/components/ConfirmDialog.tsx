import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { color, space } from "../tokens"

interface ConfirmDialogProps {
  itemName: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ itemName, onConfirm, onCancel }: ConfirmDialogProps) {
  const [focused, setFocused] = useState<"cancel" | "confirm">("cancel")

  useKeyboard((key) => {
    if (key.name === "escape") { onCancel(); return }
    if (key.name === "left" || key.name === "right" || key.name === "tab") {
      setFocused(f => f === "cancel" ? "confirm" : "cancel")
    }
    if (key.name === "return") {
      focused === "confirm" ? onConfirm() : onCancel()
    }
  })

  return (
    <box
      position="absolute"
      top={8}
      left={40}
      width={52}
      height={10}
      backgroundColor={color.bg.elevated}
      border={true}
      borderStyle="double"
      title=" Confirm "
      titleAlignment="center"
      borderColor={color.status.error}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={space[2]}
    >
      <text fg={color.text.bright} attributes={TextAttributes.BOLD}>Delete &quot;{itemName}&quot;?</text>
      <text fg={color.text.muted}>This cannot be undone.</text>
      <box flexDirection="row" gap={space[4]} marginTop={space[2]}>
        <text
          fg={focused === "cancel" ? color.accent.mid : color.text.muted}
          attributes={focused === "cancel" ? TextAttributes.BOLD : TextAttributes.NONE}
        >
          {focused === "cancel" ? "»" : " "} [ Cancel ] {focused === "cancel" ? "«" : " "}
        </text>
        <text
          fg={focused === "confirm" ? color.status.error : color.text.muted}
          attributes={focused === "confirm" ? TextAttributes.BOLD : TextAttributes.NONE}
        >
          {focused === "confirm" ? "»" : " "} [ Delete ] {focused === "confirm" ? "«" : " "}
        </text>
      </box>
    </box>
  )
}
