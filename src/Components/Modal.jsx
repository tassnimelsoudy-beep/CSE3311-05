import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// Shared dialog shell: backdrop, Escape to close, click-outside to close,
// focus moved into the dialog on open and returned to the page afterwards,
// and the page behind it kept from scrolling.
//
// - title:    heading text, also what screen readers announce
// - onClose:  called for Escape, the backdrop and the X button
// - locked:   true while saving, which blocks every way of closing
// - size:     'small' for confirmations, otherwise the standard width
export default function Modal({ title, onClose, locked = false, size, children }) {
  const dialogRef = useRef(null)
  const openerRef = useRef(null)

  useEffect(() => {
    openerRef.current = document.activeElement

    const firstField = dialogRef.current?.querySelector(
      'input, select, textarea, button:not([data-secondary])'
    )
    firstField?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      // Put focus back where it was, so keyboard users don't land at the top.
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus()
    }
  }, [])

  // Kept in its own effect so the listener always sees the current "locked".
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape' && !locked) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [locked, onClose])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={event => event.target === event.currentTarget && !locked && onClose()}
    >
      <div
        className={`modal${size === 'small' ? ' modal-small' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={dialogRef}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onClose}
            disabled={locked}
            data-secondary
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
