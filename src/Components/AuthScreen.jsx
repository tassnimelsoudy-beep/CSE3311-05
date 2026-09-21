import { useState } from 'react'
import { login, signUp } from '../services/authService.js'
import Logo from './Logo.jsx'
import Avatar from './Avatar.jsx'
import './AuthScreen.css'

// People shown in the turn-passing illustration on the left panel.
const DEMO_RING = ['Alex', 'Sam', 'Jordan', 'Maya']

export default function AuthScreen() {
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isSignup = mode === 'signup'

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (isSignup && !name.trim()) {
      setError('Enter your name so your group knows who you are.')
      return
    }
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setLoading(true)
    const result = isSignup
      ? await signUp(email.trim(), password, name.trim())
      : await login(email.trim(), password)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    }
    // On success there's nothing to do here: App hears about the new
    // session and swaps this screen for the home page.
  }

  return (
    <div className="auth">
      <aside className="auth-brand">
        <div className="auth-brand-logo">
          <Logo size={36} light />
          <span>Rotate</span>
        </div>

        <div className="turn-ring" aria-hidden="true">
          <div className="turn-ring-marker" />
          {DEMO_RING.map((person, i) => (
            <div key={person} className={`turn-ring-seat seat-${i}`}>
              <Avatar name={person} size={44} />
              <span>{person}</span>
            </div>
          ))}
          <div className="turn-ring-center">
            <strong>Take out the trash</strong>
            <span>Every week</span>
          </div>
        </div>

        <div className="auth-brand-copy">
          <h1>Shared chores, taken in turns.</h1>
          <p>Rotate keeps track of whose turn it is, so nobody has to keep score.</p>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-logo">
            <Logo size={32} />
            <span>Rotate</span>
          </div>

          <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="auth-sub">
            {isSignup
              ? 'Set up an account to start sharing with your group.'
              : 'Log in to see what’s up next in your household.'}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Account">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className={!isSignup ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={isSignup ? 'active' : ''}
              onClick={() => switchMode('signup')}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {isSignup && (
              <div className="field">
                <label htmlFor="name">Your name</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Sarah Miller"
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
              />
            </div>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? (isSignup ? 'Creating account…' : 'Logging in…')
                : (isSignup ? 'Create account' : 'Log in')}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New to Rotate?'}{' '}
            <button type="button" onClick={() => switchMode(isSignup ? 'login' : 'signup')}>
              {isSignup ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
