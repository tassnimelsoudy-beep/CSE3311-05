import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import themePlugin from '@fullcalendar/react/themes/classic'

import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/theme.css'
import '@fullcalendar/react/themes/classic/palette.css'


export default function Calendar({ events = [], onEventClick, onRangeChange }) {
  return (
    <FullCalendar
        plugins={[themePlugin, dayGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
            start: 'title',
            end: 'today prev,next',
        }}
        events={events}
        eventClick={info => onEventClick?.(info.event)}
            datesSet={info =>
                onRangeChange?.({ start: new Date(info.startStr), end: new Date(info.endStr) })
        }
        height="auto"
    />
  )
}