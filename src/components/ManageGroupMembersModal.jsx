import { useEffect, useState } from 'react'
import { X, Search, UserPlus, Check } from 'lucide-react'
import { getAllParticipants } from '../services/participantService.js'
import {
  getGroupMembers,
  addGroupMember,
} from '../services/groupService.js'

export default function ({ groupId, onClose, onMembersChanged }) {
  const [participants, setParticipants] = useState([])
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    const [allParticipants, groupMembers] = await Promise.all([
      getAllParticipants(),
      getGroupMembers(groupId),
    ])

    if (allParticipants === null || groupMembers === null) {
      setError('Could not load group members. Please try again.')
    } else {
      setParticipants(allParticipants)
      setMembers(groupMembers)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (groupId) loadData()
  }, [groupId])

  const memberIds = new Set(members.map(member => member.id))

  const filteredParticipants = participants.filter(person =>
    person.name?.toLowerCase().includes(search.trim().toLowerCase())
  )

  async function handleAdd(person) {
    setAddingId(person.id)
    setError('')
    setSuccess('')

    const result = await addGroupMember(person.id, groupId)
    await onMembersChanged(); //just added

    if (!result) {
      setError(`Could not add ${person.name}. Please try again.`)
      setAddingId(null)
      return
    }

    // Refresh the member list after a successful insert.
    const updatedMembers = await getGroupMembers(groupId)

    if (updatedMembers === null) {
      setError('Added the person, but could not refresh the member list.')
    } else {
      setMembers(updatedMembers)
      setSuccess(`${person.name} was added to the group.`)

        await onMembersChanged?.() 
    }

    setAddingId(null)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal manage-members-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-members-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="manage-members-title">Manage Members</h2>
            <p>Add people to your group.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <label className="member-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search people..."
            aria-label="Search participants"
          />
        </label>

        {error && <p role="alert" className="form-error">{error}</p>}
        {success && <p role="status" className="form-success">{success}</p>}

        {loading ? (
          <p>Loading members...</p>
        ) : (
          <ul className="manage-members-list">
            {filteredParticipants.map(person => {
              const isMember = memberIds.has(person.id)
              const isAdding = addingId === person.id

              return (
                <li key={person.id} className="manage-member-row">
                  <div className="member-meta">
                    <strong>{person.name}</strong>
                    <span>{isMember ? 'Already in group' : 'Participant'}</span>
                  </div>

                  {isMember ? (
                    <span className="member-status">
                      <Check size={16} /> Added
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAdd(person)}
                      disabled={addingId !== null}
                    >
                      <UserPlus size={16} />
                      {isAdding ? 'Adding...' : 'Add'}
                    </button>
                  )}
                </li>
              )
            })}

            {filteredParticipants.length === 0 && (
              <li className="empty-state">
                No participants found.
              </li>
            )}
          </ul>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  )
}