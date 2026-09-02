import type { ReactNode } from "react"
import s from "./DataTable.module.css"

export interface DataTableColumn<T> {
  key: string
  /** Rendered ALL CAPS by the stylesheet - pass lowercase copy. */
  header: string
  render: (row: T) => ReactNode
  width?: string
  align?: "left" | "right"
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  isActive?: (row: T) => boolean
  /** Footer count label, e.g. "3 entries". Omitted when not provided. */
  footer?: string
  emptyMessage?: string
}

/** bg-overlay header row, hover row, optional footer count. */
export function DataTable<T>({
  columns, rows, rowKey, onRowClick, isActive, footer, emptyMessage = "nothing here yet",
}: DataTableProps<T>) {
  return (
    <div className={s.wrapper}>
      <table className={s.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={col.align === "right" ? s.alignRight : undefined}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const key = rowKey(row)
            const active = isActive?.(row) ?? false
            return (
              <tr
                key={key}
                className={active ? s.rowActive : s.row}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(col => (
                  <td key={col.key} className={col.align === "right" ? s.alignRight : undefined}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className={s.empty}>{emptyMessage}</p>}
      {footer && <div className={s.footer}>{footer}</div>}
    </div>
  )
}
