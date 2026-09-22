import { ChevronRight } from 'lucide-react'
import { turnOrderFromCurrent } from '../utils/activity.js'
import Avatar from './Avatar.jsx'

// "Alex > Sam > [J]", starting with whoever has the turn now (highlighted).
// The current and next person are named; later people show as avatars only.
export default function TurnOrder({ members, currentId, meId }) {
  const ordered = turnOrderFromCurrent(members, currentId)

  return (
    <ol className="turn-order" aria-label="Turn order">
      {ordered.map((member, index) => {
        const isCurrent = member.id === currentId
        const label = member.id === meId ? 'You' : member.name.split(' ')[0]
        const named = index < 2
        return (
          <li key={member.id} className={isCurrent ? 'current' : ''} title={named ? undefined : member.name}>
            <span className={`turn-person${named ? '' : ' compact'}`}>
              <Avatar name={member.name} size={26} />
              <span className={named ? undefined : 'visually-hidden'}>{label}</span>
              {isCurrent && <span className="visually-hidden">(current turn)</span>}
            </span>
            {index < ordered.length - 1 && (
              <ChevronRight size={14} className="turn-arrow" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
