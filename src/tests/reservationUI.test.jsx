import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ActivityPanel from '../Components/ActivityPanel.jsx'
import AddResourceModal from '../Components/AddResourceModal.jsx'

describe('reservation screens', () => {
  it('creates a reservation resource without rotation settings', async () => {
    const onCreate = vi.fn().mockResolvedValue(null)
    render(
      <AddResourceModal
        household={[]}
        meId={1}
        groupId={3}
        onClose={vi.fn()}
        onCreate={onCreate}
      />
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Shared car' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reserve it' }))

    expect(screen.queryByLabelText('Repeats every')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add activity' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Shared car',
        sharingMethod: 'Reservation',
        groupId: 3,
      }))
    })
  })

  it('shows who reserved the resource and when, and opens its reservation form', () => {
    const onReserve = vi.fn()
    const activity = {
      id: 5,
      name: 'Shared car',
      sharing_method: 'Reservation',
      members: [],
      reservations: [{
        id: 8,
        starts_at: '2030-01-01T09:00:00.000Z',
        ends_at: '2030-01-01T10:00:00.000Z',
        participants: { id: 2, name: 'Alex Chen' },
      }],
    }

    render(
      <ActivityPanel
        activities={[activity]}
        meId={1}
        search=""
        onSearch={vi.fn()}
        busyId={null}
        reservationBusyId={null}
        onMarkDone={vi.fn()}
        onReserve={onReserve}
        onComingSoon={vi.fn()}
      />
    )

    expect(screen.getByText('Alex Chen')).toBeInTheDocument()
    expect(screen.getByText(
      `${new Date(activity.reservations[0].starts_at).toLocaleString()} – ${new Date(activity.reservations[0].ends_at).toLocaleString()}`
    )).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reserve' }))
    expect(onReserve).toHaveBeenCalledWith(activity)
  })
})
