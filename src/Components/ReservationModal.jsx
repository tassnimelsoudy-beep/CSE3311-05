import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

function localDateTimeValue(date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function ReservationModal({ resource, onClose, onReserve }) {
  const [startsAt, setStartsAt] = useState(() => localDateTimeValue(new Date(Date.now() + 60 * 60_000)))
  const [endsAt, setEndsAt] = useState(() => localDateTimeValue(new Date(Date.now() + 2 * 60 * 60_000)))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [loading, onClose])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const start = new Date(startsAt)
    const end = new Date(endsAt)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
        start <= new Date() || end <= start) {
      setError('Choose a future start and an end time after it.')
      return
    }

    setLoading(true)
    const failure = await onReserve({
      resource,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    })
    if (failure) {
      setError(failure)
      setLoading(false)
    }
  }

  function handleClose() {
    if (!loading) onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && handleClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="reservation-title">
        <div className="modal-header">
          <h2 id="reservation-title">Reserve {resource.name}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={handleClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="reservation-start">Starts</label>
            <input
              id="reservation-start"
              type="datetime-local"
              min={localDateTimeValue(new Date())}
              value={startsAt}
              onChange={event => setStartsAt(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="reservation-end">Ends</label>
            <input
              id="reservation-end"
              type="datetime-local"
              min={startsAt}
              value={endsAt}
              onChange={event => setEndsAt(event.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-inline" disabled={loading}>
              {loading ? 'Reserving…' : 'Reserve'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
