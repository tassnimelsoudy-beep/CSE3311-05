import EditActivityModal from './EditActivityModal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

// The edit dialog and its delete confirmation, driven by useActivityEditing.
// Only one is ever on screen at a time.
export default function ActivityDialogs({ editor }) {
  return (
    <>
      {editor.editing && (
        <EditActivityModal
          activity={editor.editing}
          onClose={editor.close}
          onSave={editor.save}
          onRequestDelete={editor.requestDelete}
        />
      )}

      {editor.deleting && (
        <ConfirmDialog
          title={`Delete ${editor.deleting.name}?`}
          message="This removes the activity for everyone sharing it, along with its turn order and history. It can’t be undone."
          confirmLabel="Delete activity"
          danger
          busy={editor.busy}
          error={editor.deleteError}
          onConfirm={editor.confirmDelete}
          onCancel={editor.cancelDelete}
        />
      )}
    </>
  )
}
