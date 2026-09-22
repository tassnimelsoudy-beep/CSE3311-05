import { useState } from 'react'
import { Home as HouseIcon, ChevronDown, Bell, LogOut } from 'lucide-react'
import { logout } from '../services/authService.js'
import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'

export default function TopNav({ name, onComingSoon }) {
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    // App hears the logout and shows the login screen.
  }

  return (
    <header className="topnav">
      <div className="topnav-left">
        <div className="brand">
          <Logo size={30} />
          <span>Rotate</span>
        </div>
        <span className="topnav-divider" aria-hidden="true" />
        <button
          type="button"
          className="group-label"
          onClick={() => onComingSoon('Switching between households')}
        >
          <HouseIcon size={16} aria-hidden="true" />
          <span>My household</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="topnav-right">
        <button
          type="button"
          className="icon-btn"
          aria-label="Notifications"
          onClick={() => onComingSoon('Notifications')}
        >
          <Bell size={18} aria-hidden="true" />
        </button>
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
  )
}
