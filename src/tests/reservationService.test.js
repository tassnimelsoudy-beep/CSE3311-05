import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeQuery } from './fakeSupabase.js'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import {
  createReservation,
  getReservationsForResource,
  subscribeToReservationChanges,
} from '../services/reservationService.js'

beforeEach(() => {
  supabase.from.mockReset()
})

function reservationTime() {
  const startsAt = new Date(Date.now() + 60 * 60_000).toISOString()
  const endsAt = new Date(Date.now() + 2 * 60 * 60_000).toISOString()
  return { startsAt, endsAt }
}

describe('createReservation', () => {
  it('rejects invalid dates without contacting the database', async () => {
    const result = await createReservation({
      resourceId: 5,
      participantId: 1,
      startsAt: 'not a date',
      endsAt: 'also not a date',
    })

    expect(result.error).toMatch(/future start/)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('does not insert when the requested time overlaps an existing reservation', async () => {
    const { startsAt, endsAt } = reservationTime()
    const conflictQuery = fakeQuery({ data: { id: 8 }, error: null })
    supabase.from.mockReturnValueOnce(conflictQuery)

    const result = await createReservation({ resourceId: 5, participantId: 1, startsAt, endsAt })

    expect(result).toEqual({
      reservation: null,
      error: 'That time conflicts with an existing reservation.',
    })
    expect(conflictQuery.lt).toHaveBeenCalledWith('starts_at', endsAt)
    expect(conflictQuery.gt).toHaveBeenCalledWith('ends_at', startsAt)
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('saves a non-overlapping reservation', async () => {
    const { startsAt, endsAt } = reservationTime()
    const conflictQuery = fakeQuery({ data: null, error: null })
    const insertQuery = fakeQuery({
      data: { id: 9, resource_id: 5, participant_id: 1, starts_at: startsAt, ends_at: endsAt },
      error: null,
    })
    supabase.from.mockReturnValueOnce(conflictQuery).mockReturnValueOnce(insertQuery)

    const result = await createReservation({ resourceId: 5, participantId: 1, startsAt, endsAt })

    expect(insertQuery.insert).toHaveBeenCalledWith({
      resource_id: 5,
      participant_id: 1,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    expect(result.reservation.id).toBe(9)
    expect(result.error).toBeNull()
  })

  it('reports a conflict rejected by the database exclusion constraint', async () => {
    const { startsAt, endsAt } = reservationTime()
    const conflictQuery = fakeQuery({ data: null, error: null })
    const insertQuery = fakeQuery({
      data: null,
      error: { code: '23P01', message: 'conflicting key value violates exclusion constraint' },
    })
    supabase.from.mockReturnValueOnce(conflictQuery).mockReturnValueOnce(insertQuery)

    const result = await createReservation({ resourceId: 5, participantId: 1, startsAt, endsAt })

    expect(result.error).toBe('That time conflicts with an existing reservation.')
  })
})

describe('getReservationsForResource', () => {
  it('loads reservation rows separately from participant names', async () => {
    const startsAt = new Date(Date.now() + 60 * 60_000).toISOString()
    const endsAt = new Date(Date.now() + 2 * 60 * 60_000).toISOString()
    const reservations = fakeQuery({
      data: [{
        id: 8,
        resource_id: 5,
        participant_id: 2,
        starts_at: startsAt,
        ends_at: endsAt,
      }],
      error: null,
    })
    const participants = fakeQuery({
      data: [{ id: 2, name: 'Alex Chen' }],
      error: null,
    })
    supabase.from.mockReturnValueOnce(reservations).mockReturnValueOnce(participants)

    await expect(getReservationsForResource(5)).resolves.toEqual([{
      id: 8,
      resource_id: 5,
      participant_id: 2,
      starts_at: startsAt,
      ends_at: endsAt,
      participants: { id: 2, name: 'Alex Chen' },
    }])
    expect(reservations.select).toHaveBeenCalledWith(
      'id, resource_id, participant_id, starts_at, ends_at'
    )
    expect(participants.in).toHaveBeenCalledWith('id', [2])
  })

  it('keeps reservation rows visible if names cannot be loaded', async () => {
    const row = {
      id: 8,
      resource_id: 5,
      participant_id: 2,
      starts_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      ends_at: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    supabase.from
      .mockReturnValueOnce(fakeQuery({ data: [row], error: null }))
      .mockReturnValueOnce(fakeQuery({ data: null, error: { message: 'permission denied' } }))

    await expect(getReservationsForResource(5)).resolves.toEqual([
      { ...row, participants: null },
    ])
  })
})

describe('subscribeToReservationChanges', () => {
  it('subscribes to reservation inserts and removes the channel on cleanup', () => {
    const channel = {
      on: vi.fn(),
      subscribe: vi.fn(),
    }
    channel.on.mockReturnValue(channel)
    channel.subscribe.mockReturnValue(channel)
    supabase.channel = vi.fn(() => channel)
    supabase.removeChannel = vi.fn()
    const onInsert = vi.fn()
    const unsubscribe = subscribeToReservationChanges(onInsert)

    expect(supabase.channel).toHaveBeenCalledWith('reservation-updates')
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reservations' },
      onInsert
    )
    expect(channel.subscribe).toHaveBeenCalled()

    unsubscribe()
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel)
  })
})
