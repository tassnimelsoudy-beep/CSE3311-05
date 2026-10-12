import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { isRotation } from '../utils/activity.js'
import Modal from './Modal.jsx'

// Repeat units offered in the form (must match rotationService.nextRotationDate).
const UNITS = [
  { value: 'day', label: 'days' },
  { value: 'week', label: 'weeks' },
  { value: 'month', label: 'months' },
]

// Edits an activity's name, details and (for rotations) how often it repeats.
// Who takes turns is not editable here yet: changing the order while a turn is
// in progress needs rules we haven't settled, so it stays out of this version.
//
// - onSave(changes): saves. Returns an error message, or null on success.
// - onRequestDelete(): hands over to the delete confirmation.
export default function EditActivityModal({ activity, onClose, onSave, onRequestDelete }) {
  const rotating = isRotation(activity)
  const rotation = activity.rotation

  const [name, setName] = useState(activity.name || '')
  const [description, setDescription] = useState(activity.description || '')
  const [frequencyValue, setFrequencyValue] = useState(String(rotation?.frequency_value ?? 1))
  const [frequencyUnit, setFrequencyUnit] = useState(rotation?.frequency_unit || 'week')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const every = Number(frequencyValue)

    if (!name.trim()) {
      setError('Give the activity a name.')
      return
    }
    if (rotating && rotation && (!Number.isInteger(every) || every < 1)) {
      setError('Choose how often it repeats (1 or more).')
      return
    }

    const changes = { name: name.trim(), description: description.trim() }
    if (rotating && rotation) {
      changes.frequencyValue = every
      changes.frequencyUnit = frequencyUnit
    }

    setSaving(true)
    const failure = await onSave(changes)
    if (failure) {
      setError(failure)
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit activity" onClose={onClose} locked={saving}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="edit-name">Name</label>
          <input id="edit-name" value={name} onChange={event => setName(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="edit-description">Details (optional)</label>
          <input
            id="edit-description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Anything the next person should know"
          />
        </div>

        {rotating && rotation && (
          <div className="field">
            <label htmlFor="edit-every">Repeats every</label>
            <div className="repeat-row">
              <input
                id="edit-every"
                type="number"
                min="1"
                inputMode="numeric"
                value={frequencyValue}
                onChange={event => setFrequencyValue(event.target.value)}
              />
              <select
                aria-label="Repeat unit"
                value={frequencyUnit}
                onChange={event => setFrequencyUnit(event.target.value)}
              >
                {UNITS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="hint">The turn in progress keeps its current due date.</p>
          </div>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions modal-actions-split">
          <button
            type="button"
            className="btn-text-danger"
            onClick={onRequestDelete}
            disabled={saving}
            data-secondary
          >
            <Trash2 size={15} aria-hidden="true" />
            Delete activity
          </button>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving} data-secondary>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-inline" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
