import { useState } from 'react'
import { X } from 'lucide-react'
import { loadCalendarEvents } from '../services/calendarService.js'
import Calendar from './Calendar.jsx'




export default function CalendarModal({ activities, onClose }) {
    const [selected, setSelected] = useState(null)
    const [range, setRange] = useState(null)


    function handleRangeChange(next) {
    setRange(current =>
            current &&
            current.start.getTime() === next.start.getTime() &&
            current.end.getTime() === next.end.getTime()
            ? current
            : next
        )
    }

    const events = range ? loadCalendarEvents(activities, range.start, range.end) : []
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

            <Calendar events={events} onEventClick={event => setSelected(event.extendedProps)} onRangeChange={handleRangeChange}/>
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
                    Rotation changes: {new Date(selected.when).toLocaleDateString()}
                </p>
            </section>
            </div>
        )}
        </>
    )
}