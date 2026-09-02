import s from "./HelpOverlay.module.css"

interface Binding {
  key: string
  desc: string
}

interface Section {
  title: string
  bindings: Binding[]
}

// The browser keymap is much smaller than the TUI's: per-list actions (add/edit/
// delete) are ordinary buttons here, reachable by Tab + Enter like any web form,
// so only the bespoke and global bindings from useGlobalKeys / CookMode are
// documented — this is the same list, in the same order, as the pseudocode in
// the structure outline's Phase 5.
const SECTIONS: Section[] = [
  {
    title: "Global",
    bindings: [
      { key: "?", desc: "show / hide this help" },
      { key: "/", desc: "jump to search" },
      { key: "Tab", desc: "switch screen" },
    ],
  },
  {
    title: "Plan",
    bindings: [
      { key: "g", desc: "grocery list (on a plan)" },
      { key: "s", desc: "run solver (on a plan)" },
    ],
  },
  {
    title: "Cook mode",
    bindings: [
      { key: "→ / l", desc: "next step" },
      { key: "← / h", desc: "previous step" },
      { key: "esc", desc: "exit cook mode" },
    ],
  },
  {
    title: "Dialogs",
    bindings: [
      { key: "tab", desc: "move between fields" },
      { key: "esc", desc: "close dialog" },
    ],
  },
]

interface HelpOverlayProps {
  onClose: () => void
}

/** Two-column keybinding sheet. Port of apps/tui/src/components/HelpOverlay.tsx. */
export function HelpOverlay({ onClose }: HelpOverlayProps) {
  const columns = [SECTIONS.slice(0, 2), SECTIONS.slice(2)]

  return (
    <div className={s.backdrop} data-overlay role="dialog" aria-modal="true" aria-label="keyboard shortcuts" onMouseDown={onClose}>
      <div className={s.panel} onMouseDown={e => e.stopPropagation()}>
        <div className={s.title}>keyboard shortcuts</div>
        <div className={s.columns}>
          {columns.map((sections, ci) => (
            <div key={ci} className={s.column}>
              {sections.map(section => (
                <div key={section.title} className={s.section}>
                  <p className={s.sectionTitle}>{section.title}</p>
                  {section.bindings.map(({ key, desc }) => (
                    <div key={key + desc} className={s.row}>
                      <span className={s.key}>{key}</span>
                      <span className={s.desc}>{desc}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className={s.footer}>press <span className={s.key}>?</span> or <span className={s.key}>esc</span> to close</p>
      </div>
    </div>
  )
}
