import { Search, Check, Calendar, Settings, ClipboardList, KeyRound } from 'lucide-react'
import { isRotation, formatFrequency, formatDue } from '../utils/activity.js'
import TurnOrder from './TurnOrder.jsx'
import Avatar from './Avatar.jsx'

function ActivityRow({ activity, meId, busy, onMarkDone, onComingSoon }) {
  const rotating = isRotation(activity)
  const rotation = activity.rotation
  const isMyTurn = rotating && rotation?.current_participant_id === meId
  const due = formatDue(rotation?.next_rotation_at)

  return (
    <li className={`activity-row${isMyTurn ? ' my-turn' : ''}`}>
      <div className="col-check">
        {rotating && rotation && (
          <button
            type="button"
            className="check-btn"
            onClick={() => onMarkDone(activity)}
            disabled={busy}
            aria-label={`Mark ${activity.name} done`}
            title="Mark done"
          >
            <Check size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="col-name">
        <strong>{activity.name}</strong>
        <span className="activity-meta">
          {rotating ? (
            <>
              <Calendar size={13} aria-hidden="true" />
              {due ? `Due ${due}` : 'No due date'}
              {isMyTurn && <span className="tag-turn">Your turn</span>}
            </>
          ) : (
            <span className="available">Available now</span>
          )}
        </span>
      </div>

      <div className="col-type">
        <span className={`badge ${rotating ? 'badge-rotation' : 'badge-reservation'}`}>
          {rotating ? 'Rotation' : 'Reservation'}
        </span>
      </div>

      <div className="col-order">
        {rotating ? (
          <TurnOrder members={activity.members} currentId={rotation?.current_participant_id} meId={meId} />
        ) : (
          <div className="shared-by">
            <span className="avatar-stack" aria-hidden="true">
              {activity.members.slice(0, 4).map(member => (
                <Avatar key={member.id} name={member.name} size={26} />
              ))}
            </span>
            <button type="button" className="btn-small" onClick={() => onComingSoon('Reserving shared items')}>
              <KeyRound size={14} aria-hidden="true" />
              Reserve
            </button>
          </div>
        )}
      </div>

      <div className="col-freq">
        <span className="badge badge-plain">
          {rotating ? formatFrequency(rotation?.frequency_value, rotation?.frequency_unit) || '—' : 'When needed'}
        </span>
      </div>

      <div className="col-actions">
        <button
          type="button"
          className="icon-btn"
          aria-label={`Edit ${activity.name}`}
          onClick={() => onComingSoon('Editing activities')}
        >
          <Settings size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

export default function ActivityPanel({ activities, meId, search, onSearch, busyId, onMarkDone, onComingSoon }) {
  const loading = activities === null
  const query = search.trim().toLowerCase()
  const visible = (activities || []).filter(activity => activity.name.toLowerCase().includes(query))

  return (
    <section className="panel activities" aria-labelledby="activities-title">
      <div className="panel-header panel-header-row">
        <div>
          <h2 id="activities-title">Group activities</h2>
          <p>Rotations, reservations, and one-off chores your group shares.</p>
        </div>
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <span className="visually-hidden">Search activities</span>
          <input
            type="search"
            placeholder="Search activities"
            value={search}
            onChange={event => onSearch(event.target.value)}
            disabled={loading}
          />
        </label>
      </div>

      {loading ? (
        <div className="empty-state" role="status">
          <p>Loading your household…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <ClipboardList size={28} aria-hidden="true" />
          </div>
          {query ? (
            <>
              <h3>No matches</h3>
              <p>No activities match “{search.trim()}”.</p>
            </>
          ) : (
            <>
              <h3>No activities yet</h3>
              <p>Add a chore or shared item to start taking turns.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="activity-head" aria-hidden="true">
            <span />
            <span>Activity</span>
            <span>Type</span>
            <span>Turn order</span>
            <span>Repeats</span>
            <span />
          </div>
          <ul className="activity-list">
            {visible.map(activity => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                meId={meId}
                busy={busyId === activity.id}
                onMarkDone={onMarkDone}
                onComingSoon={onComingSoon}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
