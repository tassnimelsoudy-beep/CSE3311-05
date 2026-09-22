// Tests for advancing turns, using a fake database so we can check exactly
// what the service would save.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeQuery } from './fakeSupabase.js'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { advanceTurn, advanceIfDue } from '../services/rotationService.js'

const members = [
  { participants: { id: 1, name: 'Alex' }, position: 1 },
  { participants: { id: 2, name: 'Sam' }, position: 2 },
  { participants: { id: 3, name: 'Jordan' }, position: 3 },
]

function rotationRow(overrides = {}) {
  return {
    id: 10,
    resource_id: 5,
    frequency_value: 1,
    frequency_unit: 'week',
    current_participant_id: 1,
    next_rotation_at: new Date(Date.now() + 86400000).toISOString(), // due tomorrow
    ...overrides,
  }
}

beforeEach(() => {
  supabase.from.mockReset()
})

describe('advanceTurn', () => {
  it('saves the next person as current and moves the due date one period later', async () => {
    const dueTomorrow = new Date(Date.now() + 86400000).toISOString()
    const getRotation = fakeQuery({ data: rotationRow({ next_rotation_at: dueTomorrow }), error: null })
    const getMembers = fakeQuery({ data: members, error: null })
    const saveRotation = fakeQuery({ data: rotationRow({ current_participant_id: 2 }), error: null })
    supabase.from
      .mockReturnValueOnce(getRotation)
      .mockReturnValueOnce(getMembers)
      .mockReturnValueOnce(saveRotation)

    const result = await advanceTurn(5)

    // Due tomorrow + 1 week: counted from the old due date, not from now.
    expect(saveRotation.update).toHaveBeenCalledWith({
      current_participant_id: 2,
      next_rotation_at: expect.any(String),
    })
    const saved = saveRotation.update.mock.calls[0][0].next_rotation_at
    const expected = new Date(dueTomorrow)
    expected.setDate(expected.getDate() + 7)
    expect(new Date(saved)).toEqual(expected)
    expect(saveRotation.eq).toHaveBeenCalledWith('id', 10)
    expect(result.current_participant_id).toBe(2)
  })

  it('does nothing when the resource has no rotation', async () => {
    supabase.from.mockReturnValueOnce(fakeQuery({ data: null, error: null }))

    expect(await advanceTurn(5)).toBeNull()
    expect(supabase.from).toHaveBeenCalledTimes(1) // no update was attempted
  })
})

describe('advanceIfDue', () => {
  it('leaves the turn alone when the due date has not passed', async () => {
    const row = rotationRow()
    supabase.from.mockReturnValueOnce(fakeQuery({ data: row, error: null }))

    expect(await advanceIfDue(5)).toEqual(row)
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('passes the turn on when the due date has passed', async () => {
    const overdue = rotationRow({ next_rotation_at: new Date(Date.now() - 1000).toISOString() })
    const saveRotation = fakeQuery({ data: rotationRow({ current_participant_id: 2 }), error: null })
    supabase.from
      .mockReturnValueOnce(fakeQuery({ data: overdue, error: null })) // advanceIfDue's check
      .mockReturnValueOnce(fakeQuery({ data: overdue, error: null })) // advanceTurn's lookup
      .mockReturnValueOnce(fakeQuery({ data: members, error: null }))
      .mockReturnValueOnce(saveRotation)

    const result = await advanceIfDue(5)

    expect(saveRotation.update).toHaveBeenCalled()
    expect(result.current_participant_id).toBe(2)
  })
})
