import { Info } from 'lucide-react'
import Avatar from './Avatar.jsx'

export default function MembersPanel({ household, email }) {
  return (
    <aside className="sidebar">
      <section className="panel" aria-labelledby="members-title">
        <div className="panel-header">
          <h2 id="members-title">Group members</h2>
          <p>People in your household</p>
        </div>
        <ul className="member-list">
          {household.map(person => (
            <li className="member" key={person.id}>
              <Avatar name={person.name} size={36} />
              <div className="member-meta">
                <strong>{person.name}</strong>
                <span>{person.isYou ? `You, ${email}` : 'Roommate'}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel how-turns" aria-labelledby="turns-title">
        <h2 id="turns-title">
          <Info size={18} aria-hidden="true" />
          How turns work
        </h2>
        <p>
          When you mark a chore as done, the turn passes to the next person. If nobody marks it
          by the deadline, it passes on automatically.
        </p>
      </section>
    </aside>
  )
}
