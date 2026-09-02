import { TextAttributes } from "@opentui/core"
import { color, space, layout } from "../tokens"
import { KeyHint } from "./KeyHint"
import type { Screen } from "@wc/types"

const NAV: { id: Screen; label: string }[] = [
  { id: "recipes", label: "Recipes" },
  { id: "ingredients", label: "Ingredients" },
  { id: "nutrients", label: "Nutrients" },
  { id: "search", label: "Search" },
  { id: "plan", label: "Plans" },
]

interface SidebarProps {
  current: Screen
  onNavigate: (screen: Screen) => void
}

export function Sidebar({ current }: SidebarProps) {
  return (
    <box
      width={layout.sidebar.width}
      flexDirection="column"
      backgroundColor={color.bg.surface}
      paddingTop={space[3]}
      paddingBottom={space[3]}
      paddingX={space[2]}
      border={["right"]}
      borderColor={color.bg.border}
    >
      {/* Brand: block mark + discrete gradient wordmark */}
      <box flexDirection="column" alignItems="center" marginBottom={space[4]}>
        <ascii-font text="WC" font="tiny" color={color.accent.mid} />
        <text marginTop={1}>
          <span fg={color.accent.lo} attributes={TextAttributes.BOLD}>WEEKLY </span>
          <span fg={color.accent.hi} attributes={TextAttributes.BOLD}>CUISINE</span>
        </text>
      </box>
      {NAV.map(item => {
        const active = item.id === current
        return (
          <box
            key={item.id}
            paddingX={space[2]}
            paddingY={1}
            border={["left"]}
            borderColor={active ? color.accent.mid : color.bg.border}
            backgroundColor={active ? color.bg.elevated : undefined}
            marginBottom={1}
          >
            <text fg={active ? color.accent.hi : color.text.muted}>
              {active ? "▶ " : "  "}{item.label}
            </text>
          </box>
        )
      })}
      <box flexGrow={1} />
      <box paddingX={space[2]} paddingLeft={space[3]}>
        <KeyHint hints={["Tab=switch"]} />
      </box>
    </box>
  )
}
