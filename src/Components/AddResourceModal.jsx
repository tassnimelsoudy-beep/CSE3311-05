import { useState } from 'react'
import AddPersonMenu from './AddPersonMenu.jsx'
import SortableMemberList from './SortableMemberList.jsx'
import Modal from './Modal.jsx'

// Repeat units offered in the form (must match rotationService.nextRotationDate).
const UNITS = [
  { value: 'day', label: 'days' },
  { value: 'week', label: 'weeks' },
  { value: 'month', label: 'months' },
]

// Form for adding a shared resource, either as a rotation or a reservation.
//
// - household: people who can be added ({ id, name, isYou }). Passed in rather
//   than fetched with getAllParticipants, because that would list every
//   participant in the database, including other users' roommates.
// - meId: the current user's participant id; they're selected by default.
// - onCreate(values): saves the activity. Returns an error message, or null
//   on success (the parent then closes the modal).
//
// Rotation participants take turns in the order they're ticked.
export default function AddResourceModal({ household, meId, groupId, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sharingMethod, setSharingMethod] = useState('Rotation')
  const [frequencyValue, setFrequencyValue] = useState('1')
  const [frequencyUnit, setFrequencyUnit] = useState('week')
  const [startDate, setStartDate] = useState('') // blank = first turn starts now
  const [selectedIds, setSelectedIds] = useState(meId ? [meId] : []) // array keeps turn order
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Local YYYY-MM-DD, so the picker can't offer a date already gone.
  // toISOString() would be wrong here: it shifts to UTC.
  function todayInputValue() {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${now.getFullYear()}-${month}-${day}`
  }

  function addPerson(id) {
    setSelectedIds(ids => (ids.includes(id) ? ids : [...ids, id]))
  }

  function removePerson(id) {
    setSelectedIds(ids => ids.filter(other => other !== id))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const every = Number(frequencyValue)

    if (!name.trim()) {
      setError('Give the activity a name.')
      return
    }
    if (sharingMethod === 'Rotation' && (!Number.isInteger(every) || every < 1)) {
      setError('Choose how often it repeats (1 or more).')
      return
    }
    if (sharingMethod === 'Rotation' && selectedIds.length === 0) {
      setError('Choose at least one person to take turns.')
      return
    }
    if (sharingMethod === 'Rotation' && startDate && startDate < todayInputValue()) {
      setError('The first handoff can\u2019t be in the past.')
      return
    }

    setLoading(true)
    const failure = await onCreate({
      name: name.trim(),
      description: description.trim(),
      sharingMethod,
      frequencyValue: every,
      frequencyUnit,
      startDate: startDate || null,
      memberIds: selectedIds,
      groupId
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
    <Modal title="Add activity" onClose={handleClose} locked={loading}>
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
          {[
            { value: 'Rotation', label: 'Take turns' },
            { value: 'Reservation', label: 'Reserve it' },
          ].map(option => (
            <button
              key={option.value}
              type="button"
              className={`choice${sharingMethod === option.value ? ' selected' : ''}`}
              aria-pressed={sharingMethod === option.value}
              onClick={() => setSharingMethod(option.value)}
            >
              {option.label}
            </button>
          ))}
          </div>
        </div>

        {sharingMethod === 'Rotation' && (
          <>
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

          <div className="field">
            <label htmlFor="activity-start">Starts on (optional)</label>
            <input
              id="activity-start"
              type="date"
              className={startDate ? undefined : 'input-optional-empty'}
              min={todayInputValue()}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              aria-describedby="activity-start-hint"
            />
            <p id="activity-start-hint" className="hint">
              The first turn runs until this date, then passes to the next person.
              Leave blank to start a full turn now.
            </p>
          </div>

          <div className="field">
            <span className="field-label">Turn order</span>
            <p className="hint reorder-intro">
              {selectedIds.length > 1
                ? 'Whoever is at the top takes the first turn. Drag to rearrange, or focus a row and press space, then the arrow keys.'
                : 'Add everyone who takes a turn. The order you put them in is the order they go in.'}
            </p>

            {selectedIds.length > 0 ? (
              <SortableMemberList
                members={household}
                order={selectedIds}
                onOrderChange={setSelectedIds}
                onRemove={removePerson}
                meId={meId}
                firstTag={selectedIds.length > 1 ? 'Goes first' : null}
                ariaLabel="Turn order"
              />
            ) : (
              <p className="empty-turn-order">Nobody is taking turns yet.</p>
            )}

            {household && household.length > 0 ? (
              <AddPersonMenu
                candidates={household.filter(person => !selectedIds.includes(person.id))}
                meId={meId}
                onAdd={addPerson}
              />
            ) : (
              <p className="hint">No participants available</p>
            )}
          </div>

          </>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading} data-secondary>
            Cancel
          </button>
          <button type="submit" className="btn-primary btn-inline" disabled={loading}>
            {loading ? 'Adding…' : 'Add activity'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
