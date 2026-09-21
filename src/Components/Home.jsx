import { useEffect, useState } from 'react'
import { Home as HouseIcon, LogOut, ClipboardList, Info } from 'lucide-react'
import { logout } from '../services/authService.js'
import { getCurrentParticipant } from '../services/participantService.js'
import { getDisplayName } from '../utils/avatar.js'
import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'
import './Home.css'

export default function Home({ user }) {
  const [participant, setParticipant] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)

  // Look up the participant row linked to this account (via participants.user_id).
  useEffect(() => {
    let active = true
    getCurrentParticipant(user.id).then(result => {
      if (active) setParticipant(result)
    })
    return () => {
      active = false
    }
  }, [user.id])

  const name = getDisplayName(participant, user)
  const firstName = name.split(' ')[0]

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    // App hears the logout and shows the login screen.
  }

  return (
    <div className="home">
      <header className="topnav">
        <div className="topnav-left">
          <div className="brand">
            <Logo size={30} />
            <span>Rotate</span>
          </div>
          <span className="topnav-divider" aria-hidden="true" />
          <div className="group-label">
            <HouseIcon size={16} aria-hidden="true" />
            <span>My household</span>
          </div>
        </div>

        <div className="topnav-right">
          <div className="profile">
            <Avatar name={name} size={32} />
            <span className="profile-name">{name}</span>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Log out"
          >
            <LogOut size={16} aria-hidden="true" />
            <span>{loggingOut ? 'Logging out…' : 'Log out'}</span>
          </button>
        </div>
      </header>

      <main className="home-main">
        <h1 className="greeting">Hi, {firstName}</h1>

        <div className="home-grid">
          <section className="panel activities" aria-labelledby="activities-title">
            <div className="panel-header">
              <h2 id="activities-title">Group activities</h2>
              <p>Rotations, reservations, and one-off chores your group shares.</p>
            </div>

            <div className="empty-state">
              <div className="empty-icon">
                <ClipboardList size={28} aria-hidden="true" />
              </div>
              <h3>No activities yet</h3>
              <p>
                Chores and shared items your group adds will show up here, along with whose
                turn it is.
              </p>
            </div>
          </section>

          <aside className="sidebar">
            <section className="panel" aria-labelledby="members-title">
              <div className="panel-header">
                <h2 id="members-title">Group members</h2>
                <p>People in your household</p>
              </div>
              <ul className="member-list">
                <li className="member">
                  <Avatar name={name} size={36} />
                  <div className="member-meta">
                    <strong>{name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <span className="pill">You</span>
                </li>
              </ul>
            </section>

            <section className="panel how-turns" aria-labelledby="turns-title">
              <h2 id="turns-title">
                <Info size={18} aria-hidden="true" />
                How turns work
              </h2>
              <p>
                When you mark a chore as done, the turn passes to the next person. If nobody
                marks it by the deadline, it passes on automatically.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
