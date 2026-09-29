import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  /** Shown on the confirm button while `busy` is true */
  busyLabel?: string
  busy?: boolean
  error?: string
  danger?: boolean
  /** Set false for information-only dialogs that just need one button */
  showCancel?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal confirmation built on the native <dialog> element (focus trap, Esc to close).
 * Focus starts on Cancel, the safe choice for destructive actions.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busyLabel,
  busy = false,
  error,
  danger = false,
  showCancel = true,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(e) => {
        // Esc key: close through React state so `open` stays in sync
        e.preventDefault()
        if (!busy) onCancel()
      }}
      onClick={(e) => {
        // Click on the dark backdrop closes the dialog
        if (e.target === ref.current && !busy) onCancel()
      }}
    >
      <div className="confirm-dialog-body">
        <h2 id="confirm-dialog-title">{title}</h2>
        <div className="confirm-dialog-text">{children}</div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="confirm-dialog-actions">
          {showCancel && (
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-accent'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && busyLabel ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
