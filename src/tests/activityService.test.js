// Tests for the dashboard-level helpers that sit on top of the services.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/resourceService.js', () => ({
  getResourcesForUser: vi.fn(),
  getResourcesForGroup: vi.fn(),
  createResource: vi.fn(),
  addResourceMembers: vi.fn(),
  updateResource: vi.fn(),
  deleteResource: vi.fn(),
}))
vi.mock('../services/oneOffTaskService.js', () => ({
  getCompletedOneOffTaskIds: vi.fn(),
}))
vi.mock('../services/reservationService.js', () => ({
  getReservationsForResource: vi.fn(),
}))
vi.mock('../services/rotationService.js', () => ({
  getRotationParticipants: vi.fn(),
  advanceIfDue: vi.fn(),
  createRotation: vi.fn(),
  updateRotation: vi.fn(),
}))

import { updateResource, deleteResource, getResourcesForGroup, createResource } from '../services/resourceService.js'
import { getRotationParticipants, advanceIfDue, updateRotation } from '../services/rotationService.js'
import { getCompletedOneOffTaskIds } from '../services/oneOffTaskService.js'
import { getReservationsForResource } from '../services/reservationService.js'
import { updateActivity, deleteActivity, loadActivities, createOneOffTask } from '../services/activityService.js'

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
  getResourcesForGroup.mockReset()
  createResource.mockReset()
  getCompletedOneOffTaskIds.mockReset()
  getReservationsForResource.mockReset()
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

  describe('one-off tasks', () => {
    it('creates one-off tasks as group resources without rotation members', async () => {
      const resource = { id: 8, name: 'Wipe counters', sharing_method: 'One-off' }
      createResource.mockResolvedValue(resource)

      await expect(createOneOffTask({
        name: 'Wipe counters',
        description: 'Kitchen',
        groupId: 3,
      })).resolves.toEqual(resource)
      expect(createResource).toHaveBeenCalledWith('Wipe counters', 'Kitchen', 'One-off', 3)
    })

    it('hides completed one-off tasks while loading group activities', async () => {
      getResourcesForGroup.mockResolvedValue([
        { id: 8, name: 'Wipe counters', sharing_method: 'One-off' },
        { id: 9, name: 'Wash dishes', sharing_method: 'One-off' },
        { id: 10, name: 'Take out trash', sharing_method: 'Rotation' },
      ])
      getCompletedOneOffTaskIds.mockResolvedValue([8])
      getRotationParticipants.mockResolvedValue([])
      advanceIfDue.mockResolvedValue(null)

      const activities = await loadActivities(3, 4)

      expect(activities.map(item => item.id).sort((a, b) => a - b)).toEqual([9, 10])
      expect(getCompletedOneOffTaskIds).toHaveBeenCalledWith([8, 9])
      expect(getRotationParticipants).toHaveBeenCalledTimes(1)
    })

    it('does not show potentially completed tasks if completion status cannot be loaded', async () => {
      getResourcesForGroup.mockResolvedValue([
        { id: 8, name: 'Wipe counters', sharing_method: 'One-off' },
      ])
      getCompletedOneOffTaskIds.mockResolvedValue(null)

      await expect(loadActivities(3, 4)).resolves.toBeNull()
    })
  })

  it('reports failure only when the delete actually failed', async () => {
    deleteResource.mockResolvedValue(null)

    expect(await deleteActivity(5)).toBe(false)
  })
})
