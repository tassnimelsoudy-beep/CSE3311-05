import { useState, useEffect, useRef } from 'react'
import { Home as HouseIcon, ChevronDown, Bell, LogOut, UserRound } from 'lucide-react'
import { logout } from '../services/authService.js'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/notificationService.js'
import { useInvites } from '../hooks/useInvites.js'

import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'

export default function TopNav({ name, onComingSoon, groups, onCreateGroup, selectedGroup, onSelectGroup, participantId, onGroupsChanged,  onEditProfile }) {
  const [loggingOut, setLoggingOut] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)

  const { invites, busyId, accept, decline, reload } = useInvites(participantId, onGroupsChanged)



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

  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!showNotifications) return

    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setShowNotifications(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showNotifications])

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
        <div className="notification-wrapper" ref={wrapperRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label="Notifications"
            onClick={() => {
              if (!showNotifications) reload()
              setShowNotifications(!showNotifications)
            }}
          >
            <Bell size={18} aria-hidden="true" />
            {(notifications.some(n => !n.is_read) || invites.length > 0) && (
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

              {/* Pending group invites */}
              {invites.length > 0 && (
                <div className="invite-section">
                  <h4>Group invites</h4>
                  {invites.map(invite => (
                    <div key={invite.id} className="invite-item">
                      <span>
                        {invite.invited_by_participant?.name ?? 'Someone'} invited you to{' '}
                        <strong>{invite.groups?.name}</strong>
                      </span>
                      <div className="invite-actions">
                        <button type="button" disabled={busyId !== null} onClick={() => accept(invite)}>Accept</button>
                        <button type="button" disabled={busyId !== null} onClick={() => decline(invite)}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Regular notifications (deadline reminders, etc.) */}
              {loadingNotifications ? (
                <p>Loading notifications...</p>
              ) : notifications.length === 0 ? (
                invites.length === 0 && <p>No notifications yet 🔔</p>
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
        <button type="button" className="profile profile-button" onClick={onEditProfile} aria-label="Edit profile">
          <Avatar name={name} size={32} />
          <span className="profile-name">{name}</span>
          <UserRound size={15} aria-hidden="true" />
        </button>
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