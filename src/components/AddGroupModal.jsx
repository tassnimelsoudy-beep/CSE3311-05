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
  <div className="modal-backdrop">
    <div className="modal add-group-modal">
      <div className="modal-header">
        <div>
          <h2>Create Group</h2>
          <p className="add-group-description">
            Create a group to organize the people you share resources with.
          </p>
        </div>
      </div>

      <form className="add-group-form" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="groupName">
          Group name
        </label>

        <input
          className="add-group-input"
          id="groupName"
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="e.g. Apartment"
          required
          maxLength={60}
        />

        <p className="add-group-hint">
          Choose a name everyone in your group will recognize.
        </p>

        {error && (
          <p role="alert" className="add-group-error">
            {error}
          </p>
        )}

        <div className="modal-actions add-group-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="create-group-submit"
            disabled={creating || !groupName.trim()}
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      </form>
    </div>
  </div>
)
}