// Tests for rewriting a rotation's turn order.
//
// The thing worth pinning down here is the two-phase write. Positions are
// unique per resource, so the new order can't be written straight over the
// old one, and the order the service issues its updates in is the part that
// would silently corrupt a rotation if someone "simplified" it later.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeQuery } from './fakeSupabase.js'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { reorderRotation } from '../services/rotationService.js'

// Records every position write as [participantId, position], in order.
let positionWrites
let rotationUpdates
let positionWriteFails
let readingMembers

function wireDatabase({ rotation = { id: 10, current_participant_id: 1 } } = {}) {
  readingMembers = true
  supabase.from.mockImplementation(table => {
    if (table === 'resource_members') {
      // A read (getRotationParticipants) rather than a write.
      if (readingMembers) {
        readingMembers = false
        return fakeQuery({
          data: [
            { participants: { id: 1, name: 'Alex' }, position: 1 },
            { participants: { id: 2, name: 'Sam' }, position: 2 },
            { participants: { id: 3, name: 'Jordan' }, position: 3 },
          ],
          error: null,
        })
      }
      const query = fakeQuery({ data: [{ id: 99 }], error: null })
      let pendingPosition = null
      let pendingParticipant = null

      query.update = vi.fn(fields => {
        pendingPosition = fields.position
        return query
      })
      query.eq = vi.fn((column, value) => {
        if (column === 'participant_id') pendingParticipant = value
        return query
      })
      query.select = vi.fn(() => {
        positionWrites.push([pendingParticipant, pendingPosition])
        const failing = positionWriteFails === positionWrites.length
        return fakeQuery(failing ? { data: [], error: null } : { data: [{ id: 99 }], error: null })
      })
      return query
    }

    // rotations
    const query = fakeQuery({ data: rotation, error: null })
    query.update = vi.fn(fields => {
      rotationUpdates.push(fields)
      return fakeQuery({ data: { ...rotation, ...fields }, error: null })
    })
    return query
  })
}

beforeEach(() => {
  positionWrites = []
  rotationUpdates = []
  positionWriteFails = null
  supabase.from.mockReset()
})

describe('reorderRotation', () => {
  it('parks everyone clear of the positions in use before writing the real ones', async () => {
    wireDatabase()
    await reorderRotation(5, [3, 1, 2])

    const parked = positionWrites.slice(0, 3)
    const placed = positionWrites.slice(3, 6)

    // Existing positions are 1..3, so parking must start above 3 - and stay
    // positive, in case the column refuses anything else.
    expect(parked.every(([, position]) => position > 3)).toBe(true)
    expect(placed.map(([, position]) => position)).toEqual([1, 2, 3])
  })

  it('writes the final positions in the requested order', async () => {
    wireDatabase()
    await reorderRotation(5, [3, 1, 2])

    expect(positionWrites.slice(3, 6)).toEqual([
      [3, 1],
      [1, 2],
      [2, 3],
    ])
  })

  it('parks in an order that still reads correctly if the second pass dies', async () => {
    // Parked positions must ascend in the new order, so a half-finished
    // reorder reads as the order the user asked for, not a scrambled one.
    wireDatabase()
    await reorderRotation(5, [3, 1, 2])

    const parkedByPosition = [...positionWrites.slice(0, 3)].sort((a, b) => a[1] - b[1])
    expect(parkedByPosition.map(([id]) => id)).toEqual([3, 1, 2])
  })

  it('hands the current turn to whoever ends up first', async () => {
    wireDatabase({ rotation: { id: 10, current_participant_id: 1 } })
    await reorderRotation(5, [3, 1, 2])

    expect(rotationUpdates).toEqual([{ current_participant_id: 3 }])
  })

  it('leaves the due date alone, so reordering never extends a turn', async () => {
    wireDatabase()
    await reorderRotation(5, [2, 1])

    expect(rotationUpdates[0]).not.toHaveProperty('next_rotation_at')
  })

  it('stops instead of half-writing when a position update fails', async () => {
    wireDatabase()
    positionWriteFails = 2 // second parking write returns no rows
    const result = await reorderRotation(5, [3, 1, 2])

    expect(result).toBeNull()
    expect(rotationUpdates).toEqual([])
  })

  it('refuses an empty order', async () => {
    wireDatabase()
    expect(await reorderRotation(5, [])).toBeNull()
    expect(await reorderRotation(5, null)).toBeNull()
    expect(positionWrites).toEqual([])
  })
})
