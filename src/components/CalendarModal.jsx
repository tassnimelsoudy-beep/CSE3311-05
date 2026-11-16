import { useState } from 'react'
import { X } from 'lucide-react'
import Calendar from './Calendar.jsx'
import { isRotation } from '../utils/activity.js'

// Turns the dashboard's activities into FullCalendar events:
// a rotation's next due time, and every reservation's start and end.
function buildEvents(activities) {

    const events = []

    for (const activity of activities || []) {
        if (isRotation(activity)) {

            const due = activity.rotation?.next_rotation_at
            if (!due) continue

            const holder = activity.members?.find(member => member.id === activity.rotation.current_participant_id)
            events.push({
                id: `turn-${activity.id}`,
                title: holder ? `${activity.name} (${holder.name})` : activity.name,
                start: due,
                extendedProps: {
                    kind: 'Turn due',
                    activity: activity.name,
                    person: holder?.name,
                    when: due,
                },
            })
        } else {
            for (const reservation of activity.reservations || []) {
                events.push({
                    id: `res-${reservation.id}`,
                    title: `${activity.name}: ${reservation.participants?.name || 'Group member'}`,
                    start: reservation.starts_at,
                    end: reservation.ends_at,
                    extendedProps: {
                        kind: 'Reservation',
                        activity: activity.name,
                        person: reservation.participants?.name,
                        when: reservation.starts_at,
                        until: reservation.ends_at,
                    },
                })
            }
        }
    }

    return events
}

export default function CalendarModal({ activities, onClose }) {
    const [selected, setSelected] = useState(null)
    const events = buildEvents(activities)
    return (
        <>
        <div className="modal-backdrop" onClick={onClose}>
            <section
            className="modal modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-title"
            onClick={event => event.stopPropagation()}
            >
            <div className="modal-header">
                <h2 id="calendar-title">Calendar</h2>
                <button type="button" className="icon-btn" onClick={onClose} aria-label="Close calendar">
                <X size={20} />
                </button>
            </div>

            <Calendar events={events} onEventClick={event => setSelected(event.extendedProps)} />
            </section>
        </div>

        {/* Event details, shown on top of the calendar */}
        {selected && (
            <div className="modal-backdrop modal-backdrop-top" onClick={() => setSelected(null)}>
            <section
                className="modal modal-small"
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-title"
                onClick={event => event.stopPropagation()}
            >
                <div className="modal-header">
                <h2 id="event-title">{selected.activity}</h2>
                <button type="button" className="icon-btn" onClick={() => setSelected(null)} aria-label="Close details">
                    <X size={20} />
                </button>
                </div>

                <span className="badge badge-plain">{selected.kind}</span>
                {selected.person && <p className="event-line">{selected.person}</p>}
                <p className="event-line">
                {new Date(selected.when).toLocaleString()}
                {selected.until && ` – ${new Date(selected.until).toLocaleString()}`}
                </p>
            </section>
            </div>
        )}
        </>
    )
}