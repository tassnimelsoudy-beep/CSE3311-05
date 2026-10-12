import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeQuery } from './fakeSupabase.js'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { createReservation } from '../services/reservationService.js'

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
