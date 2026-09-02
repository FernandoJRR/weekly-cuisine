import { color, space, layout } from "../tokens"
import { KeyHint } from "./KeyHint"
import type { Screen } from "@wc/types"

interface StatusBarProps {
  message: string | null
  current: Screen
  screens: Screen[]
}

export function StatusBar({ message, current, screens }: StatusBarProps) {
  return (
    <box
      height={layout.statusbar.height}
      backgroundColor={color.bg.surface}
      flexDirection="row"
      alignItems="center"
      paddingX={8}
      borderColor={color.bg.border}
      border={["top"]}
    >
      {message ? (
        <text fg={color.status.success}>{message}</text>
      ) : (
        <KeyHint hints={["Tab=switch screen", "a=add", "e=edit", "d=delete", "?=help"]} />
      )}
      <box flexGrow={1} />
      <text>
        {screens.map(s => (
          <span key={s} fg={s === current ? color.accent.hi : color.bg.border}>●</span>
        ))}
      </text>
    </box>
  )
}
