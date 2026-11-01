import { useState, useEffect } from 'react'
import { Home as HouseIcon, ChevronDown, Bell, LogOut } from 'lucide-react'
import { logout } from '../services/authService.js'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/notificationService.js'

import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'

export default function TopNav({ name, onComingSoon, groups, onCreateGroup, selectedGroup, onSelectGroup }) {
  const [loggingOut, setLoggingOut] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
const [loadingNotifications, setLoadingNotifications] = useState(true)

useEffect(() => {
  let active = true

  async function loadNotifications() {
    try {
      const data = await getNotifications()

      if (active) {
        setNotifications(data || [])
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      if (active) {
        setLoadingNotifications(false)
      }
    }
  }

  loadNotifications()

  const interval = setInterval(loadNotifications, 60000)

  return () => {
    active = false
    clearInterval(interval)
  }
}, [])

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
        <select
          className="group-label"
          value={selectedGroup?.id || ''}
          onChange={e => {
            const group = groups.find(g => g.id === e.target.value)
            if (group) onSelectGroup(group)
          }}
          aria-label="Select group"
        >
          {!groups.length && (
            <option value="">No groups yet</option>
          )}

          {groups.map(group => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

      <button type="button" className="btn-ghost" onClick={onCreateGroup}>
        <span aria-hidden="true">+</span>
        Create Group
      </button>
      </div>

      <div className="topnav-right">
        <div className="notification-wrapper">
        <button
          type="button"
          className="icon-btn"
          aria-label="Notifications"
          onClick={() => setShowNotifications(!showNotifications)}
          >
  <Bell size={18} aria-hidden="true" />
{notifications.some(n => !n.is_read) && (
  <span className="notification-dot" />
)}
</button>
{showNotifications && (
  <div className="notifications-panel">
    <div className="notifications-header">
      <h3>Notifications</h3>

      {notifications.some(n => !n.is_read) && (
        <button
          type="button"
          onClick={async () => {
            try {
              await markAllNotificationsRead()
              setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
              )
            } catch (error) {
              console.error('Failed to mark notifications as read:', error)
            }
          }}
        >
          Mark all as read
        </button>
      )}
    </div>

    {loadingNotifications ? (
      <p>Loading notifications...</p>
    ) : notifications.length === 0 ? (
      <p>No notifications yet 🔔</p>
    ) : (
      <div className="notifications-list">
        {notifications.map(notification => (
          <button
            key={notification.id}
            type="button"
            className={`notification-item ${
              notification.is_read ? 'read' : 'unread'
            }`}
            onClick={async () => {
              if (notification.is_read) return

              try {
                await markNotificationRead(notification.id)
                setNotifications(prev =>
                  prev.map(n =>
                    n.id === notification.id
                      ? { ...n, is_read: true }
                      : n
                  )
                )
              } catch (error) {
                console.error('Failed to mark notification as read:', error)
              }
            }}
          >
            <strong>{notification.title}</strong>
            <span>{notification.message}</span>
            <small>
              {new Date(notification.created_at).toLocaleString()}
            </small>
          </button>
        ))}
      </div>
    )}
  </div>
)}
</div>
        
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
