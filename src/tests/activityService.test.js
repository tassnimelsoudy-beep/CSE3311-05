// Tests for the dashboard-level helpers that sit on top of the services.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/resourceService.js', () => ({
  getResourcesForUser: vi.fn(),
  createResource: vi.fn(),
  addResourceMembers: vi.fn(),
  updateResource: vi.fn(),
  deleteResource: vi.fn(),
}))
vi.mock('../services/rotationService.js', () => ({
  getRotationParticipants: vi.fn(),
  advanceIfDue: vi.fn(),
  createRotation: vi.fn(),
  updateRotation: vi.fn(),
}))

import { updateResource, deleteResource } from '../services/resourceService.js'
import { updateRotation } from '../services/rotationService.js'
import { updateActivity, deleteActivity } from '../services/activityService.js'

const activity = {
  id: 5,
  name: 'Trash',
  description: null,
  sharing_method: 'Rotation',
  rotation: { id: 50, frequency_value: 1, frequency_unit: 'week' },
}

beforeEach(() => {
  updateResource.mockReset()
  deleteResource.mockReset()
  updateRotation.mockReset()
})

describe('updateActivity', () => {
  it('saves name and schedule changes to the right tables', async () => {
    updateResource.mockResolvedValue([{ id: 5 }])
    updateRotation.mockResolvedValue({ ...activity.rotation, frequency_value: 2 })

    const result = await updateActivity(activity, {
      name: 'Trash duty',
      description: '',
      frequencyValue: 2,
      frequencyUnit: 'week',
    })

    expect(updateResource).toHaveBeenCalledWith(5, { name: 'Trash duty', description: null })
    expect(updateRotation).toHaveBeenCalledWith(50, { frequency_value: 2, frequency_unit: 'week' })
    expect(result.resource.name).toBe('Trash duty')
    expect(result.rotation.frequency_value).toBe(2)
  })

  it('leaves the rotation alone when only the name changes', async () => {
    updateResource.mockResolvedValue([{ id: 5 }])

    await updateActivity(activity, { name: 'Trash duty' })

    expect(updateRotation).not.toHaveBeenCalled()
  })

  it('reports failure when the save is rejected', async () => {
    updateResource.mockResolvedValue(null)

    expect(await updateActivity(activity, { name: 'Trash duty' })).toBeNull()
  })
})

describe('deleteActivity', () => {
  it('counts an empty result as success, since the rows are gone either way', async () => {
    deleteResource.mockResolvedValue([])

    expect(await deleteActivity(5)).toBe(true)
  })

  it('reports failure only when the delete actually failed', async () => {
    deleteResource.mockResolvedValue(null)

    expect(await deleteActivity(5)).toBe(false)
  })
})
