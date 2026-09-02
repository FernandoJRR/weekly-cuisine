import { TextAttributes } from "@opentui/core"
import { color, space } from "../tokens"

interface Section {
  title: string
  bindings: { key: string; desc: string }[]
}

const SECTIONS: Section[] = [
  {
    title: "Global",
    bindings: [
      { key: "?",         desc: "show / hide help" },
      { key: "Tab",       desc: "switch screen" },
      { key: "q",         desc: "quit" },
    ],
  },
  {
    title: "Recipes",
    bindings: [
      { key: "↑ / ↓",    desc: "navigate list" },
      { key: "a",         desc: "add recipe" },
      { key: "e",         desc: "edit selected" },
      { key: "d",         desc: "delete selected" },
      { key: "c",         desc: "cook mode" },
    ],
  },
  {
    title: "Ingredients",
    bindings: [
      { key: "↑ / ↓",    desc: "navigate list" },
      { key: "a",         desc: "add ingredient" },
      { key: "e",         desc: "edit selected" },
      { key: "d",         desc: "delete selected" },
    ],
  },
  {
    title: "Nutrients",
    bindings: [
      { key: "↑ / ↓",    desc: "navigate registry" },
      { key: "a",         desc: "add nutrient (custom id)" },
      { key: "e",         desc: "edit selected" },
      { key: "d",         desc: "delete selected" },
    ],
  },
  {
    title: "Plans",
    bindings: [
      { key: "↑ / ↓",    desc: "navigate list" },
      { key: "a",         desc: "new plan" },
      { key: "e",         desc: "edit selected plan" },
      { key: "d",         desc: "delete selected" },
      { key: "g",         desc: "grocery list" },
      { key: "s",         desc: "run solver" },
      { key: "Esc",       desc: "back to detail view" },
    ],
  },
  {
    title: "Search",
    bindings: [
      { key: "type",      desc: "filter (search)" },
      { key: "Enter",     desc: "focus results" },
      { key: "↑ / ↓",    desc: "navigate results" },
      { key: "/ or Esc",  desc: "back to input" },
    ],
  },
  {
    title: "Modal",
    bindings: [
      { key: "Tab",       desc: "next field" },
      { key: "Shift+Tab", desc: "previous zone" },
      { key: "Enter",     desc: "save / add item" },
      { key: "Esc",       desc: "cancel" },
    ],
  },
  {
    title: "Cook mode",
    bindings: [
      { key: "→ / l",     desc: "next step" },
      { key: "← / h",     desc: "previous step" },
      { key: "Esc",       desc: "exit cook mode" },
    ],
  },
]

export function HelpOverlay() {
  const cols = [SECTIONS.slice(0, 4), SECTIONS.slice(4)]
  return (
    <box
      position="absolute"
      backgroundColor={color.bg.elevated}
      top={2} left={20} width={80} height={34}
      borderStyle="double"
      borderColor={color.accent.mid}
      title=" Keyboard Shortcuts "
      titleAlignment="center"
      flexDirection="column"
      paddingX={space[4]}
      paddingTop={space[2]}
    >
      <box flexDirection="row" gap={space[8]} flexGrow={1}>
        {cols.map((sections, ci) => (
          <box key={ci} flexDirection="column" width={36}>
            {sections.map(section => (
              <box key={section.title} flexDirection="column" marginBottom={space[2]}>
                <text fg={color.accent.mid} attributes={TextAttributes.BOLD} marginBottom={space[1]}>
                  {section.title}
                </text>
                {section.bindings.map(({ key, desc }) => (
                  <box key={key} flexDirection="row">
                    <text fg={color.accent.hi} width={12}>{key.padEnd(11, " ")}</text>
                    <text fg={color.text.muted} width={24}>{desc}</text>
                  </box>
                ))}
              </box>
            ))}
          </box>
        ))}
      </box>
      <text fg={color.text.dim} marginBottom={space[2]}>
        press  ?  or  Esc  to close
      </text>
    </box>
  )
}
