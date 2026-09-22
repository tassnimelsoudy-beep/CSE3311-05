// Tests for input checks and data shaping in the resource and participant services.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeQuery } from './fakeSupabase.js'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { createResource, addResourceMembers } from '../services/resourceService.js'
import { addParticipant, getParticipants } from '../services/participantService.js'

beforeEach(() => {
  supabase.from.mockReset()
})

describe('createResource', () => {
  it('refuses a blank name without contacting the database', async () => {
    expect(await createResource('   ', null, 'Rotation')).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('saves the name, description and sharing method', async () => {
    const insert = fakeQuery({ data: { id: 1, name: 'Trash' }, error: null })
    supabase.from.mockReturnValueOnce(insert)

    const result = await createResource('Trash', 'Bins out Sunday', 'Rotation')

    expect(supabase.from).toHaveBeenCalledWith('resources')
    expect(insert.insert).toHaveBeenCalledWith({
      name: 'Trash',
      description: 'Bins out Sunday',
      sharing_method: 'Rotation',
    })
    expect(result).toEqual({ id: 1, name: 'Trash' })
  })
})

describe('addResourceMembers', () => {
  it('saves members with turn positions 1, 2, 3 in the order given', async () => {
    const insert = fakeQuery({ data: [], error: null })
    supabase.from.mockReturnValueOnce(insert)

    await addResourceMembers(5, [30, 10, 20])

    expect(insert.insert).toHaveBeenCalledWith([
      { resource_id: 5, participant_id: 30, role: null, position: 1 },
      { resource_id: 5, participant_id: 10, role: null, position: 2 },
      { resource_id: 5, participant_id: 20, role: null, position: 3 },
    ])
  })
})

describe('addParticipant', () => {
  it('refuses a blank name without contacting the database', async () => {
    expect(await addParticipant('')).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })
})

describe('getParticipants', () => {
  it("returns the resource's members as plain participant objects", async () => {
    supabase.from.mockReturnValueOnce(
      fakeQuery({
        data: [{ participants: { id: 1, name: 'Alex' } }, { participants: { id: 2, name: 'Sam' } }],
        error: null,
      })
    )

    expect(await getParticipants(5)).toEqual([
      { id: 1, name: 'Alex' },
      { id: 2, name: 'Sam' },
    ])
  })
})
