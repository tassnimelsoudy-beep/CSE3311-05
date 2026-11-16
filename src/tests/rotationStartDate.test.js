// Tests for starting a rotation on a chosen date.
//
// The date the user picks is the first handoff: the first person holds the
// turn until the end of that day, then it passes on. These stay away from
// toISOString() comparisons where they can, because the helper deliberately
// works in local time and the suite shouldn't depend on the machine's zone.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeQuery } from './fakeSupabase.js'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { startDateToFirstHandoff, createRotation } from '../services/rotationService.js'

describe('startDateToFirstHandoff', () => {
  it('hands over at the very end of the chosen day', () => {
    const handoff = new Date(startDateToFirstHandoff('2026-11-20'))

    expect(handoff.getFullYear()).toBe(2026)
    expect(handoff.getMonth()).toBe(10) // November
    expect(handoff.getDate()).toBe(20)
    expect(handoff.getHours()).toBe(23)
    expect(handoff.getMinutes()).toBe(59)
  })

  it('keeps the chosen day in local time, not UTC', () => {
    // new Date("2026-11-20") parses as UTC midnight, which is Nov 19 anywhere
    // west of Greenwich. Building from parts is what stops the date slipping.
    const handoff = new Date(startDateToFirstHandoff('2026-11-20'))
    expect(handoff.getDate()).toBe(20)
  })

  it('leaves the whole of the chosen day to the first person', () => {
    const handoff = new Date(startDateToFirstHandoff('2026-11-20'))
    const middleOfThatDay = new Date(2026, 10, 20, 12, 0)

    expect(handoff > middleOfThatDay).toBe(true)
  })

  it('returns null for a blank date, so the frequency is used instead', () => {
    expect(startDateToFirstHandoff('')).toBeNull()
    expect(startDateToFirstHandoff(null)).toBeNull()
    expect(startDateToFirstHandoff(undefined)).toBeNull()
  })

  it('rejects malformed input rather than inventing a date', () => {
    expect(startDateToFirstHandoff('20-11-2026')).toBeNull()
    expect(startDateToFirstHandoff('next tuesday')).toBeNull()
    expect(startDateToFirstHandoff('2026-11')).toBeNull()
  })

  it('rejects days that do not exist', () => {
    // Feb 30 would otherwise roll silently into March.
    expect(startDateToFirstHandoff('2026-02-30')).toBeNull()
    expect(startDateToFirstHandoff('2026-13-01')).toBeNull()
  })

  it('accepts a real leap day', () => {
    const handoff = new Date(startDateToFirstHandoff('2028-02-29'))
    expect(handoff.getDate()).toBe(29)
    expect(handoff.getMonth()).toBe(1)
  })
})

describe('createRotation with a start date', () => {
  let inserted

  beforeEach(() => {
    inserted = null
    supabase.from.mockReset()
    supabase.from.mockImplementation(table => {
      if (table === 'resource_members') {
        return fakeQuery({
          data: [
            { participants: { id: 1, name: 'Alex' }, position: 1 },
            { participants: { id: 2, name: 'Sam' }, position: 2 },
          ],
          error: null,
        })
      }
      const query = fakeQuery({ data: { id: 10 }, error: null })
      const insert = query.insert
      query.insert = vi.fn(row => {
        inserted = row
        return insert(row)
      })
      return query
    })
  })

  it('uses the chosen date as the first handoff', async () => {
    await createRotation(5, 1, 'week', '2026-11-20')

    const due = new Date(inserted.next_rotation_at)
    expect(due.getDate()).toBe(20)
    expect(due.getMonth()).toBe(10)
  })

  it('still starts the first person, whatever the date', async () => {
    await createRotation(5, 1, 'week', '2026-11-20')

    expect(inserted.current_participant_id).toBe(1)
  })

  it('falls back to one full period from now when no date is given', async () => {
    const before = Date.now()
    await createRotation(5, 1, 'week')
    const due = new Date(inserted.next_rotation_at).getTime()

    const week = 7 * 86400000
    expect(due).toBeGreaterThanOrEqual(before + week - 1000)
    expect(due).toBeLessThanOrEqual(Date.now() + week + 1000)
  })

  it('ignores an unusable date rather than refusing to create the rotation', async () => {
    await createRotation(5, 2, 'day', 'not a date')

    expect(inserted).not.toBeNull()
    expect(inserted.next_rotation_at).toBeTruthy()
  })
})
