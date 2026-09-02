import { Button } from "./Button"
import { KeyHint } from "./KeyHint"
import { Modal } from "./Modal"
import s from "./ConfirmDialog.module.css"

interface ConfirmDialogProps {
  itemName: string
  /** Extra terse lowercase line, e.g. why the delete may fail. */
  note?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Destructive confirm. Port of apps/tui/src/components/ConfirmDialog.tsx. */
export function ConfirmDialog({ itemName, note = "this cannot be undone.", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      title="confirm"
      variant="danger"
      role="alertdialog"
      onClose={onCancel}
      footerHint={<KeyHint hints={["esc=cancel"]} />}
      footer={
        <>
          <Button onClick={onCancel}>cancel</Button>
          <Button variant="danger" autoFocus onClick={onConfirm}>delete</Button>
        </>
      }
    >
      <p className={s.question}>delete &quot;{itemName}&quot;?</p>
      <p className={s.note}>{note}</p>
    </Modal>
  )
}
