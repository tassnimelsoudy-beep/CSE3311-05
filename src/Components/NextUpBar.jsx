import { Bell, CalendarRange, Plus } from 'lucide-react'
import { formatDue } from '../utils/activity.js'

// "It's your turn for X, due tomorrow" plus the main page actions.
function describe(nextUp, meId) {
  if (!nextUp) {
    return 'Nothing is due right now.'
  }
  const { activity, person } = nextUp
  const when = formatDue(activity.rotation.next_rotation_at)
  const due = when === 'Today' || when === 'Tomorrow' ? when.toLowerCase() : when
  const who = person.id === meId ? 'your' : `${person.name.split(' ')[0]}’s`
  return `Up next: it’s ${who} turn for ${activity.name}, due ${due}.`
}

export default function NextUpBar({ nextUp, meId, onAdd, onComingSoon, disabled }) {
  return (
    <div className="panel next-up">
      <div className="next-up-message">
        <span className="next-up-icon" aria-hidden="true">
          <Bell size={14} />
        </span>
        <p>{describe(nextUp, meId)}</p>
      </div>
      <div className="next-up-actions">
        <button type="button" className="btn-secondary" onClick={() => onComingSoon('The upcoming turns calendar')}>
          <CalendarRange size={16} aria-hidden="true" />
          Check upcoming
        </button>
        <button type="button" className="btn-primary btn-inline" onClick={onAdd} disabled={disabled}>
          <Plus size={16} aria-hidden="true" />
          Add activity
        </button>
      </div>
    </div>
  )
}
