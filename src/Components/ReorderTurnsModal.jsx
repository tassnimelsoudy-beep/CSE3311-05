import { useState } from 'react'
import Modal from './Modal.jsx'
import SortableMemberList from './SortableMemberList.jsx'

// "Reorder turns" dialog. Anyone in the group can rearrange the order, and
// whoever ends up first takes over the turn in progress. The due date doesn't
// move, so reordering changes who is on duty, not how long they have.
//
// - members:  people in the rotation, already in turn order
// - meId:     the signed-in participant, highlighted in the list
// - onSave(orderedIds): persists the order. Returns an error message, or null
//   on success (the parent then closes the dialog).
export default function ReorderTurnsModal({ members, meId, onClose, onSave }) {
  const [order, setOrder] = useState(() => (members || []).map(member => member.id))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const unchanged = order.every((id, index) => id === (members || [])[index]?.id)

  async function handleSave() {
    setError('')
    setSaving(true)
    const failure = await onSave(order)
    if (failure) {
      setError(failure)
      setSaving(false)
    }
  }

  return (
    <Modal title="Reorder turns" onClose={onClose} locked={saving}>
      {error && <p className="form-error" role="alert">{error}</p>}

      <p className="hint reorder-intro">
        Drag to rearrange, or focus a row and press space, then the arrow keys.
        Whoever ends up first takes the turn straight away &mdash; the due date
        stays where it is.
      </p>

      <SortableMemberList
        members={members}
        order={order}
        onOrderChange={setOrder}
        meId={meId}
        firstTag="Takes the turn"
      />

      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving} data-secondary>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary btn-inline"
          onClick={handleSave}
          disabled={saving || unchanged}
        >
          {saving ? 'Saving…' : 'Save order'}
        </button>
      </div>
    </Modal>
  )
}
