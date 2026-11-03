// Tests for the nudge a brand-new account sees before it belongs to a group.
// The point of these is that the nudge stays a suggestion: it offers the
// "wait for an invite" path as well as the "create one" path, and it can be
// waved off without creating anything.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../services/authService.js', () => ({
  login: vi.fn(),
  signUp: vi.fn(),
  logout: vi.fn(),
  onAuthChange: vi.fn(),
}))
vi.mock('../services/groupService.js', () => ({
  getGroupsForUser: vi.fn(() => Promise.resolve([])),
  getGroupMembers: vi.fn(() => Promise.resolve([])),
  getPendingInvites: vi.fn(() => Promise.resolve([])),
  acceptGroupInvite: vi.fn(),
  declineGroupInvite: vi.fn(),
}))
vi.mock('../services/participantService.js', () => ({
  getCurrentParticipant: vi.fn(() => Promise.resolve({ id: 1, name: 'Sarah Miller' })),
  getAllParticipants: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../services/activityService.js', () => ({
  loadActivities: vi.fn(() => Promise.resolve([])),
  createRotatingActivity: vi.fn(),
  createReservationActivity: vi.fn(),
}))
vi.mock('../services/rotationService.js', () => ({ advanceTurn: vi.fn(), completeTurn: vi.fn() }))
vi.mock('../services/reservationService.js', () => ({ createReservation: vi.fn() }))
vi.mock('../services/notificationService.js', () => ({
  getNotifications: vi.fn(() => Promise.resolve([])),
  markAllNotificationsRead: vi.fn(),
}))

import { onAuthChange } from '../services/authService.js'
import { getGroupsForUser } from '../services/groupService.js'
import App from '../App.jsx'

function logIn() {
  onAuthChange.mockImplementation(callback => {
    callback({ user: { id: 'u1', email: 'sarah@example.com', user_metadata: {} } })
    return () => {}
  })
}

describe('new account with no group', () => {
  beforeEach(() => {
    getGroupsForUser.mockResolvedValue([])
    logIn()
  })

  it('points a groupless account at its two options', async () => {
    render(<App />)

    expect(await screen.findByText(/not in a group yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create a group' })).toBeInTheDocument()
  })

  it('offers waiting for an invite, so nobody has to duplicate an existing household', async () => {
    render(<App />)

    expect(await screen.findByText(/A roommate already has one/)).toBeInTheDocument()
    expect(screen.getByText(/Ask them to invite you/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /waiting on an invite/ })).toBeInTheDocument()
  })

  it('stays dismissed once waved off, without creating a group', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /waiting on an invite/ }))

    expect(screen.queryByText(/not in a group yet/)).not.toBeInTheDocument()
    // Dismissing is not a refusal: the top bar still offers the other path.
    expect(screen.getByRole('button', { name: /Create Group/ })).toBeInTheDocument()
  })

  it('opens the create-group dialog from the nudge', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Create a group' }))

    expect(await screen.findByRole('heading', { name: 'Create Group' })).toBeInTheDocument()
  })
})

describe('account that already belongs to a group', () => {
  it('shows no nudge', async () => {
    getGroupsForUser.mockResolvedValue([{ id: 'g1', name: 'Apartment 4B' }])
    logIn()
    render(<App />)

    expect(await screen.findByText('Group members')).toBeInTheDocument()
    expect(screen.queryByText(/not in a group yet/)).not.toBeInTheDocument()
  })
})
