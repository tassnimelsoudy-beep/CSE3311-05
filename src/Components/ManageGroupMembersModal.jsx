import { useEffect, useState } from 'react'
import { X, Search } from 'lucide-react'
import { getAllParticipants } from '../services/participantService.js'

import { getGroupMembers, sendGroupInvite, removeGroupMember } from '../services/groupService.js'

export default function ManageGroupMembersModal({ groupId, currentParticipantId, onClose, onMembersChanged }) {
    const [participants, setParticipants] = useState([])
    const [members, setMembers] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [addingId, setAddingId] = useState(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [pendingAddIds, setPendingAddIds] = useState([])
    const [invitedIds, setInvitedIds] = useState([])
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

    // Sends an invite to every selected person instead of adding them directly.
    // The member list doesn't change until they accept, so no reload is needed.
    async function handleConfirmAdditions() {
        setAddingId('confirm')
        setError('')
        setSuccess('')

        const invitedNames = []
        const failedNames = []
        const invitedOk = []
        const failedOk = []

        for (const id of pendingAddIds) {
            const person = participants.find(p => p.id === id)
            const result = await sendGroupInvite(groupId, id, currentParticipantId)

            if (result) {
                invitedNames.push(person?.name ?? 'Participant')
                invitedOk.push(id)
            } else {
                failedNames.push(person?.name ?? 'Participant')
                failedOk.push(id)
            }
        }

        setInvitedIds(ids => [...ids, ...invitedOk])
        setPendingAddIds(failedOk) // only failed ones stay selected

        if (failedNames.length) {
            setError(`Could not invite: ${failedNames.join(', ')}.`)
        }

        if (invitedNames.length) {
            setSuccess(`Invite sent to: ${invitedNames.join(', ')}.`)
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
                        <p>Invite people to your group.</p>
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

                                    <button
                                        type="button"
                                        onClick={() => handleRemove(person)}
                                        disabled={removingId !== null || addingId !== null}
                                    >
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

                        <div className="participant-list">
                            <ul className="manage-members-list">
                                {filteredParticipants.map(person => (
                                    <li key={person.id} className="manage-member-row">
                                        <div className="member-meta">
                                            <strong>{person.name}</strong>
                                            <span>{person.email || 'Participant'}</span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => togglePendingAdd(person.id)}
                                            disabled={
                                                addingId !== null ||
                                                removingId !== null ||
                                                invitedIds.includes(person.id)
                                            }
                                        >
                                            {invitedIds.includes(person.id)
                                                ? 'Invited'
                                                : pendingAddIds.includes(person.id)
                                                ? 'Selected ✓'
                                                : 'Invite'}
                                        </button>
                                    </li>
                                ))}

                                {filteredParticipants.length === 0 && (
                                    <li className="empty-state">
                                        No other users found.
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Send invites to the selected people */}
                        {pendingAddIds.length > 0 && (
                            <button
                                type="button"
                                onClick={handleConfirmAdditions}
                                disabled={addingId !== null || removingId !== null}
                            >
                                {addingId === 'confirm'
                                    ? 'Sending...'
                                    : `Send invites (${pendingAddIds.length})`}
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