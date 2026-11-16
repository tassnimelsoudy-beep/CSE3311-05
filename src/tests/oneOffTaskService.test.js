import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeQuery } from './fakeSupabase.js'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { completeOneOffTask, getCompletedOneOffTaskIds } from '../services/oneOffTaskService.js'

beforeEach(() => {
  supabase.from.mockReset()
})

describe('getCompletedOneOffTaskIds', () => {
  it('avoids a database query when the group has no one-off tasks', async () => {
    await expect(getCompletedOneOffTaskIds([])).resolves.toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns the IDs of completed tasks', async () => {
    const query = fakeQuery({
      data: [{ resource_id: 7 }, { resource_id: 9 }],
      error: null,
    })
    supabase.from.mockReturnValueOnce(query)

    await expect(getCompletedOneOffTaskIds([7, 8, 9])).resolves.toEqual([7, 9])
    expect(supabase.from).toHaveBeenCalledWith('one_off_task_completions')
    expect(query.in).toHaveBeenCalledWith('resource_id', [7, 8, 9])
  })

  it('returns null when completed tasks cannot be checked', async () => {
    supabase.from.mockReturnValueOnce(fakeQuery({
      data: null,
      error: { message: 'permission denied' },
    }))

    await expect(getCompletedOneOffTaskIds([7])).resolves.toBeNull()
  })
})

describe('completeOneOffTask', () => {
  it('records which signed-in group participant completed the task', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabase.from.mockReturnValueOnce(query)

    await expect(completeOneOffTask(7, 3)).resolves.toEqual({ completed: true, error: null })
    expect(supabase.from).toHaveBeenCalledWith('one_off_task_completions')
    expect(query.insert).toHaveBeenCalledWith({ resource_id: 7, completed_by: 3 })
  })

  it('treats a task already completed by another group member as complete', async () => {
    supabase.from.mockReturnValueOnce(fakeQuery({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    }))

    await expect(completeOneOffTask(7, 3)).resolves.toEqual({ completed: true, error: null })
  })

  it('reports database failures without removing the task', async () => {
    supabase.from.mockReturnValueOnce(fakeQuery({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    }))

    await expect(completeOneOffTask(7, 3)).resolves.toEqual({
      completed: false,
      error: 'Could not complete this task. Try again.',
    })
  })
})
