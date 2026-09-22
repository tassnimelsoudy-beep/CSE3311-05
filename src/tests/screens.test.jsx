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

import { signUp, onAuthChange } from '../services/authService.js'
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
