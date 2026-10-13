import { useCallback, useState } from 'react'
import { updateActivity, deleteActivity } from '../services/activityService.js'

// Everything behind editing and deleting an activity: which one is open, the
// delete confirmation, the saving state and the error messages.
//
// It lives here rather than in Home so the dashboard only needs three lines:
//   const editor = useActivityEditing({ setActivities, showToast })
//   <ActivityPanel ... onEdit={editor.start} />
//   <ActivityDialogs editor={editor} />
//
// setActivities is Home's state setter; the hook updates the list in place
// after a save or delete so nothing has to be reloaded.
export function useActivityEditing({ setActivities, showToast }) {
  const [editing, setEditing] = useState(null) // activity being edited
  const [deleting, setDeleting] = useState(null) // activity awaiting confirmation
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState(false)

  const start = useCallback(activity => setEditing(activity), [])
  const close = useCallback(() => setEditing(null), [])

  const save = useCallback(
    async changes => {
      const activity = editing
      const result = await updateActivity(activity, changes)
      if (!result) {
        return 'Couldn’t save those changes. Try again.'
      }

      // Update the row in place, so it doesn't jump around the list.
      setActivities(list =>
        list.map(item =>
          item.id === activity.id ? { ...item, ...result.resource, rotation: result.rotation } : item
        )
      )
      setEditing(null)
      showToast(`Saved changes to ${result.resource.name}.`)
      return null
    },
    [editing, setActivities, showToast]
  )

  // Step one of deleting: swap the edit dialog for the confirmation.
  const requestDelete = useCallback(() => {
    setDeleteError('')
    setDeleting(editing)
    setEditing(null)
  }, [editing])

  // Cancelling goes back to editing, rather than dropping the person onto the
  // dashboard with their unsaved changes gone.
  const cancelDelete = useCallback(() => {
    setEditing(deleting)
    setDeleting(null)
  }, [deleting])

  const confirmDelete = useCallback(async () => {
    const activity = deleting
    setBusy(true)
    const removed = await deleteActivity(activity.id)
    setBusy(false)

    if (!removed) {
      setDeleteError('Couldn’t delete this activity. Try again.')
      return
    }
    setActivities(list => list.filter(item => item.id !== activity.id))
    setDeleting(null)
    showToast(`Deleted ${activity.name}.`)
  }, [deleting, setActivities, showToast])

  return { editing, deleting, deleteError, busy, start, close, save, requestDelete, cancelDelete, confirmDelete }
}
