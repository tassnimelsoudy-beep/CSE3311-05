import { useEffect, useState } from 'react'
import { createResource, addResourceMember } from '../services/resourceService'
import { getAllParticipants } from '../services/participantService'

export default function AddResourceModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sharingMethod] = useState('Rotation')
  const [participants, setParticipants] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    getAllParticipants().then(data => {
      if (data) setParticipants(data)
    })
  }, [open])

  function toggleSelect(id) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const resource = await createResource(name, description || null, sharingMethod)
    if (resource && resource.id) {
      // add selected participants
      for (const id of Array.from(selectedIds)) {
        // default role null and position null
        await addResourceMember(resource.id, id, null, null)
      }
      onCreated && onCreated(resource)
      handleClose()
    } else {
      // creation failed - keep modal open
      setLoading(false)
    }
  }

  function handleClose() {
    setName('')
    setDescription('')
    setSelectedIds(new Set())
    setLoading(false)
    onClose && onClose()
  }

  if (!open) return null

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Add Resource</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input value={name} onChange={e => setName(e.target.value)} required />
          </label>

          <label>
            Description (optional)
            <textarea value={description} onChange={e => setDescription(e.target.value)} />
          </label>

          <label>
            Sharing Method
            <input value={sharingMethod} disabled />
          </label>

          <fieldset>
            <legend>Select Participants</legend>
            {participants && participants.length > 0 ? (
              participants.map(p => (
                <label key={p.id} style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                  {p.name}
                </label>
              ))
            ) : (
              <div>No participants available</div>
            )}
          </fieldset>

          <div className="modal-actions">
            <button type="button" onClick={handleClose} disabled={loading}>Cancel</button>
            <button type="submit" disabled={loading}>Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}
