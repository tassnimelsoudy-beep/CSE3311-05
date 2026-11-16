import { describe, it, expect } from 'vitest'
import {
    getRotationEvents,
    getReservationEvents
} from '../services/calendarService.js'

describe('getRotationEvents', () => {
    const now = new Date('2026-11-15T00:00:00.000Z')
    const rangeStart = new Date('2026-11-15T00:00:00.000Z')
    const rangeEnd = new Date('2026-12-07T00:00:00.000Z')

    const activity = {
        id: 'resource-1',
        name: 'Take Out Trash',
        rotation: {
            current_participant_id: 'p1',
            next_rotation_at: '2026-11-22T00:00:00.000Z',
            frequency_value: 1,
            frequency_unit: 'week'
        },
        members: [
            { id: 'p1', name: 'Alex', position: 1 },
            { id: 'p2', name: 'Jordan', position: 2 },
            { id: 'p3', name: 'Taylor', position: 3 }
        ]
    }

    it('creates one event per due date, named for the person whose turn it is', () => {
        const events = getRotationEvents(activity, rangeStart, rangeEnd, now)

        expect(events).toHaveLength(3)

        expect(events[0].title).toBe('Take Out Trash: Alex')
        expect(events[1].title).toBe('Take Out Trash: Jordan')
        expect(events[2].title).toBe('Take Out Trash: Taylor')
    })

    it('puts each event on the date the turn is due', () => {
        const events = getRotationEvents(activity, rangeStart, rangeEnd, now)

        expect(events[0].start).toBe('2026-11-22T00:00:00.000Z')
        expect(events[1].start).toBe('2026-11-29T00:00:00.000Z')
        expect(events[2].start).toBe('2026-12-06T00:00:00.000Z')
        expect(events[0].allDay).toBe(true)
    })

    it('starts the order from the current holder', () => {
        const jordanFirst = {
            ...activity,
            rotation: { ...activity.rotation, current_participant_id: 'p2' }
        }

        const events = getRotationEvents(jordanFirst, rangeStart, rangeEnd, now)

        expect(events[0].title).toBe('Take Out Trash: Jordan')
        expect(events[1].title).toBe('Take Out Trash: Taylor')
        expect(events[2].title).toBe('Take Out Trash: Alex')
    })

    it('only includes due dates inside the visible range', () => {
        const shortRange = new Date('2026-11-25T00:00:00.000Z')

        const events = getRotationEvents(activity, rangeStart, shortRange, now)

        expect(events).toHaveLength(1)
        expect(events[0].title).toBe('Take Out Trash: Alex')
    })

    it('includes turn details in extendedProps', () => {
        const events = getRotationEvents(activity, rangeStart, rangeEnd, now)

        expect(events[0].extendedProps.kind).toBe('Turn due')
        expect(events[0].extendedProps.activity).toBe('Take Out Trash')
        expect(events[0].extendedProps.person).toBe('Alex')
        expect(events[0].extendedProps.when).toBe('2026-11-22T00:00:00.000Z')
    })

    it('returns no events when the due date has already passed', () => {
        const overdue = {
            ...activity,
            rotation: { ...activity.rotation, next_rotation_at: '2026-11-10T00:00:00.000Z' }
        }

        const events = getRotationEvents(overdue, rangeStart, rangeEnd, now)

        expect(events).toHaveLength(0)
    })

    it('returns no events when there is no rotation', () => {
        const noRotation = { ...activity, rotation: null }

        const events = getRotationEvents(noRotation, rangeStart, rangeEnd, now)

        expect(events).toHaveLength(0)
    })

    it('returns no events when there are no members', () => {
        const noMembers = { ...activity, members: [] }

        const events = getRotationEvents(noMembers, rangeStart, rangeEnd, now)

        expect(events).toHaveLength(0)
    })
})

describe('getReservationEvents', () => {
    const rangeStart = new Date('2026-11-15T00:00:00.000Z')
    const rangeEnd = new Date('2026-11-30T00:00:00.000Z')

    const activity = {
        id: 'resource-2',
        name: 'Study Room',
        reservations: [
            {
                id: 'reservation-1',
                participant_id: 'p1',
                starts_at: '2026-11-16T10:00:00.000Z',
                ends_at: '2026-11-16T12:00:00.000Z',
                participants: { id: 'p1', name: 'Alex' }
            },
            {
                id: 'reservation-2',
                participant_id: 'p2',
                starts_at: '2026-11-29T14:00:00.000Z',
                ends_at: '2026-11-29T16:00:00.000Z',
                participants: { id: 'p2', name: 'Jordan' }
            },
            {
                id: 'reservation-3',
                participant_id: 'p3',
                starts_at: '2026-12-01T10:00:00.000Z',
                ends_at: '2026-12-01T12:00:00.000Z',
                participants: { id: 'p3', name: 'Taylor' }
            }
        ]
    }

    it('generates events for reservations inside the date range', () => {
        const events = getReservationEvents(activity, rangeStart, rangeEnd)

        expect(events).toHaveLength(2)
    })

    it('includes a reservation that starts before the range but ends inside it', () => {
        const overlapping = {
            ...activity,
            reservations: [
                {
                    id: 'reservation-4',
                    participant_id: 'p1',
                    starts_at: '2026-11-14T22:00:00.000Z',
                    ends_at: '2026-11-15T02:00:00.000Z',
                    participants: { id: 'p1', name: 'Alex' }
                }
            ]
        }

        const events = getReservationEvents(overlapping, rangeStart, rangeEnd)

        expect(events).toHaveLength(1)
    })

    it('uses the reserver name in the event title', () => {
        const events = getReservationEvents(activity, rangeStart, rangeEnd)

        expect(events[0].title).toBe('Study Room: Alex')
        expect(events[1].title).toBe('Study Room: Jordan')
    })

    it('uses the reservation start and end times', () => {
        const events = getReservationEvents(activity, rangeStart, rangeEnd)

        expect(events[0].start).toBe('2026-11-16T10:00:00.000Z')
        expect(events[0].end).toBe('2026-11-16T12:00:00.000Z')
    })

    it('includes reservation information in extendedProps', () => {
        const events = getReservationEvents(activity, rangeStart, rangeEnd)

        expect(events[0].extendedProps.kind).toBe('Reservation')
        expect(events[0].extendedProps.activity).toBe('Study Room')
        expect(events[0].extendedProps.person).toBe('Alex')
        expect(events[0].extendedProps.when).toBe('2026-11-16T10:00:00.000Z')
        expect(events[0].extendedProps.until).toBe('2026-11-16T12:00:00.000Z')
    })

    it('returns no events when there are no reservations', () => {
        const noReservations = { ...activity, reservations: [] }

        const events = getReservationEvents(noReservations, rangeStart, rangeEnd)

        expect(events).toHaveLength(0)
    })
})