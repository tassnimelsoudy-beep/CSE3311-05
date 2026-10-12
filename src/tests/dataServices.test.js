// Tests for input checks and data shaping in the resource and participant services.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeQuery } from './fakeSupabase.js'

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}))

import { supabase } from '../lib/supabase.js'
import { createResource, addResourceMembers, deleteResource } from '../services/resourceService.js'
import { addParticipant, getParticipants } from '../services/participantService.js'

beforeEach(() => {
  supabase.from.mockReset()
})

describe('createResource', () => {
  // createResource looks up the logged-in participant itself, so the fake has
  // to answer that lookup before the insert.
  function signedInAs(participantId) {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
    supabase.from.mockReturnValueOnce(fakeQuery({ data: { id: participantId }, error: null }))
  }

  it('refuses a blank name without writing anything', async () => {
    signedInAs(42)

    expect(await createResource('   ', null, 'Rotation', 9)).toBeNull()
    expect(supabase.from).toHaveBeenCalledTimes(1) // only the participant lookup
  })

  it('saves the name, description, group and the logged-in owner', async () => {
    signedInAs(42)
    const insert = fakeQuery({ data: { id: 1, name: 'Trash' }, error: null })
    supabase.from.mockReturnValueOnce(insert)

    const result = await createResource('Trash', 'Bins out Sunday', 'Rotation', 9)

    expect(insert.insert).toHaveBeenCalledWith({
      name: 'Trash',
      description: 'Bins out Sunday',
      sharing_method: 'Rotation',
      created_by: 42,
      group_id: 9,
    })
    expect(result).toEqual({ id: 1, name: 'Trash' })
  })

  it('refuses to create anything when nobody is logged in', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    expect(await createResource('Trash', null, 'Rotation', 9)).toBeNull()
  })
})

describe('addResourceMembers', () => {
  it('saves members with turn positions 1, 2, 3 in the order given', async () => {
    const insert = fakeQuery({ data: [], error: null })
    supabase.from.mockReturnValueOnce(insert)

    await addResourceMembers(5, [30, 10, 20])

    expect(insert.insert).toHaveBeenCalledWith([
      { resource_id: 5, participant_id: 30, position: 1 },
      { resource_id: 5, participant_id: 10, position: 2 },
      { resource_id: 5, participant_id: 20, position: 3 },
    ])
  })
})

describe('deleteResource', () => {
  it('asks for the deleted rows back, so callers can tell success from failure', async () => {
    const query = fakeQuery({ data: [{ id: 5 }], error: null })
    supabase.from.mockReturnValueOnce(query)

    const result = await deleteResource(5)

    expect(query.select).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('id', 5)
    expect(result).toEqual([{ id: 5 }])
  })

  it('returns null when the delete fails', async () => {
    supabase.from.mockReturnValueOnce(fakeQuery({ data: null, error: { message: 'nope' } }))

    expect(await deleteResource(5)).toBeNull()
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
