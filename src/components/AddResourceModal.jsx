import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Avatar from './Avatar.jsx'

// Repeat units offered in the form (must match rotationService.nextRotationDate).
const UNITS = [
  { value: 'day', label: 'days' },
  { value: 'week', label: 'weeks' },
  { value: 'month', label: 'months' },
]

// Form for adding a new shared activity (a resource shared by rotation).
//
// - household: people who can be added ({ id, name, isYou }). Passed in rather
//   than fetched with getAllParticipants, because that would list every
//   participant in the database, including other users' roommates.
// - meId: the current user's participant id; they're selected by default.
// - onCreate(values): saves the activity. Returns an error message, or null
//   on success (the parent then closes the modal).
//
// People take turns in the order they're ticked.
export default function AddResourceModal({ household, meId, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sharingMethod] = useState('Rotation') // reservations come in a later version
  const [frequencyValue, setFrequencyValue] = useState('1')
  const [frequencyUnit, setFrequencyUnit] = useState('week')
  const [selectedIds, setSelectedIds] = useState(meId ? [meId] : []) // array keeps turn order
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Close with the Escape key.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  function toggleSelect(id) {
    setSelectedIds(ids => (ids.includes(id) ? ids.filter(other => other !== id) : [...ids, id]))
  }

  function labelFor(id) {
    if (id === meId) return 'You'
    const person = household.find(member => member.id === id)
    return person ? person.name.split(' ')[0] : ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const every = Number(frequencyValue)

    if (!name.trim()) {
      setError('Give the activity a name.')
      return
    }
    if (!Number.isInteger(every) || every < 1) {
      setError('Choose how often it repeats (1 or more).')
      return
    }
    if (selectedIds.length === 0) {
      setError('Choose at least one person to take turns.')
      return
    }

    setLoading(true)
    const failure = await onCreate({
      name: name.trim(),
      description: description.trim(),
      frequencyValue: every,
      frequencyUnit,
      memberIds: selectedIds,
    })
    if (failure) {
      // creation failed - keep modal open
      setError(failure)
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    onClose && onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title">
        <div className="modal-header">
          <h2 id="add-title">Add activity</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={handleClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="activity-name">Name</label>
            <input
              id="activity-name"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Vacuum the living room"
            />
          </div>

          <div className="field">
            <label htmlFor="activity-description">Details (optional)</label>
            <input
              id="activity-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Vacuum is in the hall closet"
            />
          </div>

          <div className="field">
            <span className="field-label">How it’s shared</span>
            <div className="choice-row">
              <span className="choice selected">{sharingMethod === 'Rotation' ? 'Take turns' : sharingMethod}</span>
              <span className="choice disabled" title="Coming in a later version">
                Reserve it (coming soon)
              </span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="activity-every">Repeats every</label>
            <div className="repeat-row">
              <input
                id="activity-every"
                type="number"
                min="1"
                inputMode="numeric"
                value={frequencyValue}
                onChange={e => setFrequencyValue(e.target.value)}
              />
              <select aria-label="Repeat unit" value={frequencyUnit} onChange={e => setFrequencyUnit(e.target.value)}>
                {UNITS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="field member-picker">
            <legend className="field-label">Who takes turns</legend>
            {household && household.length > 0 ? (
              household.map(p => (
                <label key={p.id} className="member-option">
                  <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                  <Avatar name={p.name} size={28} />
                  <span>{p.isYou ? `${p.name} (you)` : p.name}</span>
                </label>
              ))
            ) : (
              <div className="hint">No participants available</div>
            )}
            <p className="hint">
              {selectedIds.length > 0
                ? `Turn order: ${selectedIds.map(labelFor).join(', then ')}.`
                : 'People take turns in the order you tick them.'}
            </p>
          </fieldset>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-inline" disabled={loading}>
              {loading ? 'Adding…' : 'Add activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
