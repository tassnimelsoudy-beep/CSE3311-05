import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProfileModal from '../Components/ProfileModal.jsx'

const user = {
  id: 'u1',
  email: 'sarah@example.com',
  user_metadata: { name: 'Sarah Miller' },
}
const participant = { id: 1, name: 'Sarah Miller', user_id: 'u1' }

describe('ProfileModal', () => {
  it('submits name, email, and an optional new password', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    const onClose = vi.fn()
    render(<ProfileModal user={user} participant={participant} onClose={onClose} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Sarah Lee' } })
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'sarah.lee@example.com' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newsecret123' } })
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'oldsecret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'Sarah Lee',
        email: 'sarah.lee@example.com',
        password: 'newsecret123',
        currentPassword: 'oldsecret123',
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('keeps the form open and shows a save error', async () => {
    const onSave = vi.fn().mockResolvedValue({ error: 'Could not save your profile.' })
    const onClose = vi.fn()
    render(<ProfileModal user={user} participant={participant} onClose={onClose} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your profile.')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('requires the current password before submitting email or password changes', async () => {
    const onSave = vi.fn()
    render(<ProfileModal user={user} participant={participant} onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter your current password to change your email or password.'
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows when an email confirmation is pending', async () => {
    const onSave = vi.fn().mockResolvedValue({
      message: 'Check your email to confirm the new address.',
    })
    render(<ProfileModal user={user} participant={participant} onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'oldsecret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Check your email')
  })
})
