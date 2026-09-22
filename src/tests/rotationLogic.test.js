// Tests for the core turn-passing logic in rotationService.js that doesn't
// need the database: who goes next, who goes first, and when the next turn is due.
import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import {
  getNextParticipant,
  getFirstParticipant,
  nextRotationDate,
  followingDueDate,
} from '../services/rotationService.js'

const alex = { id: 1, name: 'Alex', position: 1 }
const sam = { id: 2, name: 'Sam', position: 2 }
const jordan = { id: 3, name: 'Jordan', position: 3 }
const order = [alex, sam, jordan]

// nextRotationDate returns an ISO string; turn it back into a Date to compare.
const due = (value, unit, from) => new Date(nextRotationDate(value, unit, from))

describe('getNextParticipant', () => {
  it('passes the turn to the next person in order', () => {
    expect(getNextParticipant(order, alex.id)).toEqual(sam)
  })

  it('wraps around from the last person back to the first', () => {
    expect(getNextParticipant(order, jordan.id)).toEqual(alex)
  })

  it('returns null when the current person is not in the rotation', () => {
    expect(getNextParticipant(order, 99)).toBeNull()
  })

  it('returns null when the rotation has no members', () => {
    expect(getNextParticipant([], alex.id)).toBeNull()
    expect(getNextParticipant(null, alex.id)).toBeNull()
  })
})

describe('getFirstParticipant', () => {
  it('returns the first person, or null for an empty rotation', () => {
    expect(getFirstParticipant(order)).toEqual(alex)
    expect(getFirstParticipant([])).toBeNull()
  })
})

describe('nextRotationDate', () => {
  const start = new Date(2027, 2, 15, 10, 0) // March 15, 2027, 10:00 local time

  it('adds hours and days', () => {
    expect(due(6, 'hour', start)).toEqual(new Date(2027, 2, 15, 16, 0))
    expect(due(3, 'day', start)).toEqual(new Date(2027, 2, 18, 10, 0))
  })

  it('treats a week as 7 days', () => {
    expect(due(2, 'week', start)).toEqual(new Date(2027, 2, 29, 10, 0))
  })

  it('adds months while keeping the same day of the month', () => {
    expect(due(1, 'month', start)).toEqual(new Date(2027, 3, 15, 10, 0))
  })

  it('clamps to the last day when the next month is shorter', () => {
    // Jan 31 + 1 month should be Feb 28, not roll over into March.
    const jan31 = new Date(2027, 0, 31, 10, 0)
    expect(due(1, 'month', jan31)).toEqual(new Date(2027, 1, 28, 10, 0))
  })

  it('returns null for an unknown unit', () => {
    expect(nextRotationDate(1, 'fortnight', start)).toBeNull()
  })
})

describe('followingDueDate', () => {
  const now = new Date(2027, 2, 15, 9, 0) // March 15, 2027
  const weekly = dueAt => ({ frequency_value: 1, frequency_unit: 'week', next_rotation_at: dueAt })

  it('counts one period from the current due date, not from now', () => {
    const dueTuesday = new Date(2027, 2, 16, 18, 0).toISOString()
    expect(new Date(followingDueDate(weekly(dueTuesday), now))).toEqual(new Date(2027, 2, 23, 18, 0))
  })

  it('moves the date forward again each time a turn is completed', () => {
    const first = followingDueDate(weekly(new Date(2027, 2, 16, 18, 0).toISOString()), now)
    const second = followingDueDate(weekly(first), now)
    expect(new Date(second)).toEqual(new Date(2027, 2, 30, 18, 0))
  })

  it('skips to the first future date when several periods were missed', () => {
    // Due Feb 22; weekly steps are Mar 1, Mar 8, then Mar 15 at 6pm, which is
    // still ahead of "now" (Mar 15, 9am), so that's the next due date.
    const threeWeeksAgo = new Date(2027, 1, 22, 18, 0).toISOString()
    expect(new Date(followingDueDate(weekly(threeWeeksAgo), now))).toEqual(new Date(2027, 2, 15, 18, 0))
  })
})
