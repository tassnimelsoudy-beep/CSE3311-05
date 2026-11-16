// Tests for the start-date field on the activity creation form.
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AddResourceModal from '../Components/AddResourceModal.jsx'

const household = [{ id: 1, name: 'Alex Chen', isYou: true }]

function renderForm() {
  const onCreate = vi.fn().mockResolvedValue(null)
  render(
    <AddResourceModal
      household={household}
      meId={1}
      groupId={3}
      onClose={vi.fn()}
      onCreate={onCreate}
    />,
  )
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Dishes' } })
  return onCreate
}

// A date far enough ahead that it stays valid however long this suite lives.
function futureDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

describe('rotation start date', () => {
  it('is offered for rotations', () => {
    renderForm()
    expect(screen.getByLabelText('Starts on (optional)')).toBeInTheDocument()
  })

  it('is hidden for reservations, which have no turn order', () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Reserve it' }))

    expect(screen.queryByLabelText('Starts on (optional)')).not.toBeInTheDocument()
  })

  it('passes the chosen date through to the caller', async () => {
    const onCreate = renderForm()
    const chosen = futureDate()
    fireEvent.change(screen.getByLabelText('Starts on (optional)'), { target: { value: chosen } })
    fireEvent.click(screen.getByRole('button', { name: 'Add activity' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ startDate: chosen }))
    })
  })

  it('sends null when left blank, so the usual schedule applies', async () => {
    const onCreate = renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Add activity' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ startDate: null }))
    })
  })

  it('refuses a date that has already gone', async () => {
    const onCreate = renderForm()
    fireEvent.change(screen.getByLabelText('Starts on (optional)'), {
      target: { value: '2020-01-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add activity' }))

    expect(await screen.findByText(/can’t be in the past/)).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('stops the picker offering past dates in the first place', () => {
    renderForm()
    const field = screen.getByLabelText('Starts on (optional)')

    expect(field).toHaveAttribute('type', 'date')
    expect(field.getAttribute('min')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('explains what the date actually does', () => {
    renderForm()
    expect(screen.getByText(/first turn runs until this date/i)).toBeInTheDocument()
  })
})
