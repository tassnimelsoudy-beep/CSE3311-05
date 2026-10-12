
import { Bell, X } from 'lucide-react'
import { formatDue, isRotation } from '../utils/activity.js'
import './RemindersPanel.css'

export default function RemindersPanel({ activities, meId, onClose }) {

  // Get all activities with a rotation due date
  const reminders = (activities || [])
    .filter(activity =>
      isRotation(activity) &&
      activity.rotation?.next_rotation_at
    )
    .sort((a, b) =>
      new Date(a.rotation.next_rotation_at) -
      new Date(b.rotation.next_rotation_at)
    )

  return (
    <section className="panel reminders-panel" aria-label="Upcoming reminders">

      <div className="reminders-header">
        <h2>
          <Bell size={20} />
          Upcoming Reminders
        </h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close reminders"
        >
          <X size={20} />
        </button>
      </div>

      {reminders.length === 0 ? (
        <p>No upcoming rotations right now.</p>
      ) : (
        <div className="reminders-list">
          {reminders.map(activity => {
            const rotation = activity.rotation

            const person = (activity.members || []).find(
              member => member.id === rotation.current_participant_id
            )

            const due = formatDue(rotation.next_rotation_at)

            const isOverdue =
              new Date(rotation.next_rotation_at) < new Date()

            return (
              <div className="reminder-item" key={activity.id}>

                <div>
                  <strong>{activity.name}</strong>
                  <p>
                    {person?.id === meId
                      ? 'Your turn'
                      : person
                        ? `${person.name}'s turn`
                        : 'Unassigned'}
                  </p>
                </div>

                <span className={
                  isOverdue ? 'reminder-overdue' : 'reminder-date'
                }>
                  {due}
                </span>

              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
