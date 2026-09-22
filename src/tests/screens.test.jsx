// Tests for what the user sees: the sign-up form's checks, and the app
// choosing between the login screen and the home page.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../services/authService.js', () => ({
  login: vi.fn(),
  signUp: vi.fn(),
  logout: vi.fn(),
  onAuthChange: vi.fn(),
}))
vi.mock('../services/participantService.js', () => ({
  getCurrentParticipant: vi.fn(() => Promise.resolve({ id: 1, name: 'Sarah Miller' })),
}))
vi.mock('../services/rotationService.js', () => ({ advanceTurn: vi.fn() }))
vi.mock('../services/activityService.js', () => ({
  loadActivities: vi.fn(),
  createRotatingActivity: vi.fn(),
}))
vi.mock('../services/demoService.js', () => ({
  // One rotation where it's Sarah's turn, shared with Alex.
  loadActivitiesWithDemo: vi.fn(() =>
    Promise.resolve([
      {
        id: 7,
        name: 'Take out the trash',
        sharing_method: 'Rotation',
        members: [
          { id: 1, name: 'Sarah Miller' },
          { id: 2, name: 'Alex Chen' },
        ],
        rotation: {
          id: 70,
          current_participant_id: 1,
          frequency_value: 1,
          frequency_unit: 'week',
          next_rotation_at: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    ])
  ),
}))

import { signUp, onAuthChange } from '../services/authService.js'
import { advanceTurn } from '../services/rotationService.js'
import AuthScreen from '../Components/AuthScreen.jsx'
import App from '../App.jsx'

describe('AuthScreen', () => {
  it('asks for a name on sign-up instead of creating a nameless account', async () => {
    const user = userEvent.setup()
    render(<AuthScreen />)

    await user.click(screen.getByRole('tab', { name: 'Sign up' }))
    await user.type(screen.getByLabelText('Email'), 'sarah@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter your name')
    expect(signUp).not.toHaveBeenCalled()
  })
})

describe('App', () => {
  it('shows the login screen when nobody is logged in', () => {
    onAuthChange.mockImplementation(callback => {
      callback(null)
      return () => {}
    })
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('shows the home page, greeting the user by name, when logged in', async () => {
    onAuthChange.mockImplementation(callback => {
      callback({ user: { id: 'u1', email: 'sarah@example.com', user_metadata: {} } })
      return () => {}
    })
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Hi, Sarah' })).toBeInTheDocument()
  })
})

function logInAsSarah() {
  onAuthChange.mockImplementation(callback => {
    callback({ user: { id: 'u1', email: 'sarah@example.com', user_metadata: {} } })
    return () => {}
  })
}

describe('Home dashboard', () => {
  it("lists the household's activities and flags the user's own turn", async () => {
    logInAsSarah()
    render(<App />)

    expect(await screen.findByText('Take out the trash')).toBeInTheDocument()
    expect(screen.getByText('Your turn')).toBeInTheDocument()
    expect(screen.getByText('Weekly')).toBeInTheDocument()
    expect(screen.getByText(/it’s your turn for Take out the trash/)).toBeInTheDocument()
  })

  it('passes the turn to the next person when marked done', async () => {
    logInAsSarah()
    advanceTurn.mockResolvedValue({
      id: 70,
      current_participant_id: 2,
      frequency_value: 1,
      frequency_unit: 'week',
      next_rotation_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Mark Take out the trash done' }))

    expect(advanceTurn).toHaveBeenCalledWith(7)
    expect(await screen.findByText('Marked Take out the trash done. Alex is up next.')).toBeInTheDocument()
    expect(screen.queryByText('Your turn')).not.toBeInTheDocument()
  })
})
