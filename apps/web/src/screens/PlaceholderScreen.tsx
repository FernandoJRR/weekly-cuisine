import s from "./PlaceholderScreen.module.css"

interface PlaceholderScreenProps {
  title: string
  phase: string
}

/** Routed now so later phases only drop in the real component. */
export function PlaceholderScreen({ title, phase }: PlaceholderScreenProps) {
  return (
    <div className={s.panel}>
      <span className={s.title}>{title}</span>
      <span className={s.note}>not built yet — lands in {phase}</span>
    </div>
  )
}
