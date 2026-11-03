import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export default function ProfileModal({ user, participant, onClose, onSave }) {
  const [name, setName] = useState(participant?.name || user.user_metadata?.name || '')
  const [email, setEmail] = useState(user.email || '')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, saving])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    const nextName = name.trim()
    const nextEmail = email.trim()
    const changedCredentials = nextEmail !== user.email || Boolean(password)
    if (!nextName) {
      setError('Enter a display name.')
      return
    }
    if (!nextEmail) {
      setError('Enter an email address.')
      return
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (changedCredentials && !currentPassword) {
      setError('Enter your current password to change your email or password.')
      return
    }

    setSaving(true)
    const result = await onSave({
      name: nextName,
      email: nextEmail === user.email ? '' : nextEmail,
      password,
      currentPassword,
    })
    setSaving(false)

    if (result?.error) {
      setError(result.error)
      return
    }
    if (result?.message) {
      setMessage(result.message)
      setPassword('')
      setCurrentPassword('')
    } else {
      onClose()
    }
  }

  function handleClose() {
    if (!saving) onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && handleClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <div className="modal-header">
          <div>
            <h2 id="profile-title">Edit your profile</h2>
            <p className="add-group-description">Update the details associated with your account.</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={handleClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="profile-name">Display name</label>
            <input
              id="profile-name"
              autoFocus
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email address</label>
            <input
              id="profile-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="profile-password">New password</label>
            <input
              id="profile-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              minLength={6}
              placeholder="Leave blank to keep your current password"
            />
          </div>
          <div className="field">
            <label htmlFor="profile-current-password">Current password</label>
            <input
              id="profile-current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              required={email !== user.email || Boolean(password)}
            />
            <p className="hint">Required to change your email or password.</p>
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-inline" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
