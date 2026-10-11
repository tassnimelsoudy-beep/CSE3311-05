import Modal from './Modal.jsx'

// Asks before something irreversible. Reusable: pass whatever wording fits.
//
// - message:      what will happen, in plain words
// - confirmLabel: the button that goes ahead (e.g. "Delete activity")
// - danger:       styles that button red
// - busy:         true while the action runs; locks the dialog
// - error:        message to show if the action failed
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel} locked={busy} size="small">
      <p className="confirm-message">{message}</p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy} data-secondary>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn-inline ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
