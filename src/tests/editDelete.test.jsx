// Tests for editing and deleting an activity: who is allowed to, what gets
// saved, and that deleting asks first.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { canManage, getOwnerName } from '../utils/activity.js'

vi.mock('../services/authService.js', () => ({
  login: vi.fn(),
  signUp: vi.fn(),
  logout: vi.fn(),
  onAuthChange: vi.fn(callback => {
    callback({ user: { id: 'u1', email: 'sarah@example.com', user_metadata: {} } })
    return () => {}
  }),
}))
vi.mock('../services/participantService.js', () => ({
  getCurrentParticipant: vi.fn(() => Promise.resolve({ id: 1, name: 'Sarah Miller' })),
}))
vi.mock('../services/rotationService.js', () => ({ advanceTurn: vi.fn() }))
vi.mock('../services/activityService.js', () => ({
  loadActivities: vi.fn(() => Promise.resolve(globalThis.__activities)),
  createRotatingActivity: vi.fn(),
  updateActivity: vi.fn(),
  deleteActivity: vi.fn(),
}))

// Two activities: one Sarah (id 1) created, one Alex (id 2) created.
function activity(overrides) {
  return {
    id: 7,
    name: 'Take out the trash',
    description: 'Bins out Sunday',
    sharing_method: 'Rotation',
    created_by: 1,
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
    ...overrides,
  }
}

const mine = activity()
const theirs = activity({ id: 8, name: 'Clean the kitchen', created_by: 2 })


import { loadActivities, updateActivity, deleteActivity } from '../services/activityService.js'
import App from '../App.jsx'

beforeEach(() => {
  globalThis.__activities = [mine, theirs]
  loadActivities.mockReset()
  loadActivities.mockImplementation(() => Promise.resolve(globalThis.__activities))
  updateActivity.mockReset()
  deleteActivity.mockReset()
})

describe('canManage and getOwnerName', () => {
  it('allows the creator and refuses everyone else', () => {
    expect(canManage(mine, 1)).toBe(true)
    expect(canManage(theirs, 1)).toBe(false)
  })

  it('leaves an activity with no recorded creator open to anyone', () => {
    expect(canManage(activity({ created_by: null }), 1)).toBe(true)
  })

  it('names the creator for the locked message', () => {
    expect(getOwnerName(theirs, 1)).toBe('Alex Chen')
    expect(getOwnerName(mine, 1)).toBe('You')
  })
})

describe('Editing from the dashboard', () => {
  it('offers edit on your own activity and locks someone else’s', async () => {
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Edit Take out the trash' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Clean the kitchen' })).not.toBeInTheDocument()
    expect(screen.getByText('Only Alex Chen can edit Clean the kitchen')).toBeInTheDocument()
  })

  it('saves the new name and schedule, then shows them in the list', async () => {
    updateActivity.mockResolvedValue({
      resource: { ...mine, name: 'Trash duty' },
      rotation: { ...mine.rotation, frequency_value: 2, frequency_unit: 'week' },
    })
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Edit Take out the trash' }))
    const nameField = screen.getByLabelText('Name')
    await user.clear(nameField)
    await user.type(nameField, 'Trash duty')
    const every = screen.getByLabelText('Repeats every')
    await user.clear(every)
    await user.type(every, '2')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateActivity).toHaveBeenCalledWith(
      mine,
      expect.objectContaining({ name: 'Trash duty', frequencyValue: 2, frequencyUnit: 'week' })
    )
    expect(await screen.findByText('Trash duty')).toBeInTheDocument()
    expect(screen.getByText('Every 2 weeks')).toBeInTheDocument()
  })

  it('refuses to save an empty name', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Edit Take out the trash' }))
    await user.clear(screen.getByLabelText('Name'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Give the activity a name')
    expect(updateActivity).not.toHaveBeenCalled()
  })
})

describe('Deleting an activity', () => {
  it('asks for confirmation before deleting anything', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Edit Take out the trash' }))
    await user.click(screen.getByRole('button', { name: /Delete activity/ }))

    expect(screen.getByRole('heading', { name: 'Delete Take out the trash?' })).toBeInTheDocument()
    expect(deleteActivity).not.toHaveBeenCalled()
  })

  it('goes back to editing when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Edit Take out the trash' }))
    await user.click(screen.getByRole('button', { name: /Delete activity/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('heading', { name: 'Edit activity' })).toBeInTheDocument()
    expect(deleteActivity).not.toHaveBeenCalled()
  })

  it('removes the activity from the list once confirmed', async () => {
    deleteActivity.mockResolvedValue(true)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Edit Take out the trash' }))
    await user.click(screen.getByRole('button', { name: /Delete activity/ }))
    await user.click(screen.getByRole('button', { name: 'Delete activity' }))

    expect(deleteActivity).toHaveBeenCalledWith(7)
    expect(await screen.findByText('Deleted Take out the trash.')).toBeInTheDocument()
    expect(screen.queryByText('Take out the trash')).not.toBeInTheDocument()
  })

  it('keeps the activity and explains when the delete fails', async () => {
    deleteActivity.mockResolvedValue(false)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Edit Take out the trash' }))
    await user.click(screen.getByRole('button', { name: /Delete activity/ }))
    await user.click(screen.getByRole('button', { name: 'Delete activity' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t delete this activity')
    expect(screen.getByRole('heading', { name: 'Delete Take out the trash?' })).toBeInTheDocument()
  })
})
