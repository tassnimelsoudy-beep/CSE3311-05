import { useEffect, useState } from 'react'
import { X, Search, UserPlus, Check } from 'lucide-react'
import { getAllParticipants } from '../services/participantService.js'

import { getGroupMembers, addGroupMember, removeGroupMember} from '../services/groupService.js'

export default function ({ groupId, onClose, onMembersChanged }) {
    const [participants, setParticipants] = useState([])
    const [members, setMembers] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [addingId, setAddingId] = useState(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [pendingAddIds, setPendingAddIds] = useState([])
    const [removingId, setRemovingId] = useState(null)

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

    const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(search.toLowerCase())
    )

    const filteredParticipants = participants.filter(person =>
    !memberIds.has(person.id) &&
    person.name.toLowerCase().includes(search.toLowerCase())
    )


    function togglePendingAdd(id) {
    setPendingAddIds(ids =>
    ids.includes(id)
        ? ids.filter(existingId => existingId !== id)
        : [...ids, id]
    )
    }

    async function handleConfirmAdditions() {
        setAddingId('confirm')
        setError('')
        setSuccess('')

        const addedNames = []
        const failedNames = []

        for (const id of pendingAddIds) {
            const person = participants.find(p => p.id === id)
            const result = await addGroupMember(id, groupId)

        if (result) {
            addedNames.push(person?.name ?? 'Participant')
        } else {
            failedNames.push(person?.name ?? 'Participant')
        }
        }

        const updatedMembers = await getGroupMembers(groupId)

        if (updatedMembers !== null) {
            setMembers(updatedMembers)
            await onMembersChanged?.()
        }

        setPendingAddIds(
        updatedMembers === null
            ? pendingAddIds.filter(id => !addedNames.some(
                name => participants.find(p => p.id === id)?.name === name
            ))
            : pendingAddIds.filter(id =>
                !updatedMembers.some(member => member.id === id)
            )
        )

        if (failedNames.length) {
            setError(`Could not add: ${failedNames.join(', ')}.`)
        }

        if (addedNames.length) {
            setSuccess(`Added: ${addedNames.join(', ')}.`)
        }

        setAddingId(null)
    }

    async function handleRemove(person) {
        const confirmed = window.confirm(
            `Remove ${person.name} from this group?`
        )

        if (!confirmed) return

        setRemovingId(person.id)
        setError('')
        setSuccess('')

        const result = await removeGroupMember(person.id, groupId)

        if (!result) {
            setError(`Could not remove ${person.name}. Please try again.`)
            setRemovingId(null)
            return
        }

        const updatedMembers = await getGroupMembers(groupId)

        if (updatedMembers === null) {
            setError('Removed the member, but could not refresh the list.')
        } else {
            setMembers(updatedMembers)
            setPendingAddIds(ids => ids.filter(id => id !== person.id))
            setSuccess(`${person.name} was removed from the group.`)
            await onMembersChanged?.()
        }

        setRemovingId(null)
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
              <>
              {/* Current group members */}
              <h3 className="manage-members-heading">
                Your Group ({filteredMembers.length})
              </h3>

              <ul className="manage-members-list">
                {filteredMembers.map(person => (
                  <li key={person.id} className="manage-member-row">
                    <div className="member-meta">
                      <strong>{person.name}</strong>
                      <span>Group member</span>
                    </div>

                    <button type="button" onClick={() => handleRemove(person)} disabled={removingId !== null || addingId !== null}>
                      {removingId === person.id ? 'Removing...' : 'Remove'}
                    </button>
                  </li>
                ))}

                {filteredMembers.length === 0 && (
                  <li className="empty-state">
                    No group members found.
                  </li>
                )}
              </ul>

          {/* Other users */}
          <h3 className="manage-members-heading">
            Other Users ({filteredParticipants.length})
          </h3>

          <ul className="manage-members-list">
            {filteredParticipants.map(person => (
          <li key={person.id} className="manage-member-row">
            <div className="member-meta">
              <strong>{person.name}</strong>
              <span>Participant</span>
            </div>

            <button type="button" onClick={() => togglePendingAdd(person.id)} disabled={addingId !== null || removingId !== null}>
              {pendingAddIds.includes(person.id)
                ? 'Selected ✓'
                : 'Add'}
            </button>
          </li>
        ))}

        {filteredParticipants.length === 0 && (
        <li className="empty-state">
            No other users found.
        </li>
        )}
        </ul>

        {/* Confirm selected additions */}
        {pendingAddIds.length > 0 && (
        <button 
          type="button"
          onClick={handleConfirmAdditions}
          disabled={addingId !== null || removingId !== null}
        >
        {addingId === 'confirm'
            ? 'Adding...'
            : `Confirm additions (${pendingAddIds.length})`}
          </button>
          )}
          </>
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