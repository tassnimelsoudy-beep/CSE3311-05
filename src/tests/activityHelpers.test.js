// Tests for the dashboard helpers in utils/activity.js: labels, dates,
// turn order, and the household summary.
import { describe, it, expect } from 'vitest'
import {
  formatFrequency,
  formatDue,
  turnOrderFromCurrent,
  getHousehold,
  getNextUp,
  sortActivities,
} from '../utils/activity.js'

const me = { id: 1, name: 'Sarah Miller' }
const alex = { id: 2, name: 'Alex Chen' }
const sam = { id: 3, name: 'Sam Rivera' }

function rotation(name, members, currentId, dueAt) {
  return {
    id: name,
    name,
    sharing_method: 'Rotation',
    members,
    rotation: { current_participant_id: currentId, next_rotation_at: dueAt },
  }
}

describe('formatFrequency', () => {
  it('uses plain words for common schedules', () => {
    expect(formatFrequency(1, 'week')).toBe('Weekly')
    expect(formatFrequency(1, 'day')).toBe('Daily')
    expect(formatFrequency(2, 'week')).toBe('Every 2 weeks')
    expect(formatFrequency(null, 'week')).toBeNull()
  })
})

describe('formatDue', () => {
  const now = new Date(2027, 2, 15, 9, 0) // Monday, March 15, 2027

  it('says Today, Tomorrow, or the weekday for the coming week', () => {
    expect(formatDue(new Date(2027, 2, 15, 20, 0).toISOString(), now)).toBe('Today')
    expect(formatDue(new Date(2027, 2, 16, 8, 0).toISOString(), now)).toBe('Tomorrow')
    expect(formatDue(new Date(2027, 2, 19, 8, 0).toISOString(), now)).toBe('Friday')
  })

  it('shows a short date further out, and flags past dates', () => {
    expect(formatDue(new Date(2027, 3, 2, 8, 0).toISOString(), now)).toBe('Apr 2')
    expect(formatDue(new Date(2027, 2, 14, 8, 0).toISOString(), now)).toBe('Overdue')
  })
})

describe('turnOrderFromCurrent', () => {
  it('starts the list at the current person without changing the cycle', () => {
    expect(turnOrderFromCurrent([me, alex, sam], alex.id)).toEqual([alex, sam, me])
    expect(turnOrderFromCurrent([me, alex, sam], 99)).toEqual([me, alex, sam])
  })
})

describe('getHousehold', () => {
  it('lists everyone who shares an activity once, the user first', () => {
    const activities = [
      rotation('Trash', [alex, me], alex.id, null),
      rotation('Kitchen', [sam, alex], alex.id, null),
    ]

    expect(getHousehold(activities, me)).toEqual([
      { id: 1, name: 'Sarah Miller', isYou: true },
      { id: 2, name: 'Alex Chen', isYou: false },
      { id: 3, name: 'Sam Rivera', isYou: false },
    ])
  })
})

describe('getNextUp and sortActivities', () => {
  const soon = rotation('Trash', [me, alex], me.id, '2027-03-16T10:00:00Z')
  const later = rotation('Kitchen', [alex, me], alex.id, '2027-03-20T10:00:00Z')
  const car = { id: 'car', name: 'Car', sharing_method: 'Reservation', members: [me], rotation: null }

  it('picks the rotation due soonest and whose turn it is', () => {
    const nextUp = getNextUp([later, car, soon])
    expect(nextUp.activity.name).toBe('Trash')
    expect(nextUp.person).toEqual(me)
  })

  it('orders rotations by due date, with reservations after them', () => {
    expect(sortActivities([car, later, soon]).map(a => a.name)).toEqual(['Trash', 'Kitchen', 'Car'])
  })
})
