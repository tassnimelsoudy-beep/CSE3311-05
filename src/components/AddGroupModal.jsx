import { useState } from "react"
import { createGroup } from "../services/groupService"

export default function AddGroupModal({
  participant,
  onClose,
  onGroupCreated,
}) {
  const [groupName, setGroupName] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()

    const name = groupName.trim()
    if (!name || !participant) return

    setCreating(true)
    setError("")

    const group = await createGroup(name, participant.id)

    if (!group) {
      setError("Could not create group. Please try again.")
      setCreating(false)
      return
    }

    await onGroupCreated(group)
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Create Group</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="groupName">Group name</label>
          <input
            id="groupName"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Apartment"
            required
            maxLength={60}
          />

          {error && <p>{error}</p>}

          <button type="button" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" disabled={creating || !groupName.trim()}>
            {creating ? "Creating..." : "Create Group"}
          </button>
        </form>
      </div>
    </div>
  )
}