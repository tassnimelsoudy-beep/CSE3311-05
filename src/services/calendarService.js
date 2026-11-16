import { getRotationParticipants, advanceIfDue, nextRotationDate } from './rotationService.js'
import { getResourcesForGroup } from './resourceService.js'
import { getReservationsForResource } from './reservationService.js'
import { isRotation, turnOrderFromCurrent } from '../utils/activity.js'


const MAX_STEPS = 2000
const MAX_EVENTS_PER_ACTIVITY = 200

// Loads every calendar event for a group inside the visible date range:
// each rotation's turns and each reservation.
// Returns an array of events, or null if loading failed.
function loadCalendarEvents(activities, rangeStart, rangeEnd) {
    const events = []

    for (const activity of activities || []) {
        if (isRotation(activity)) {
            events.push(...getRotationEvents(activity, rangeStart, rangeEnd))
        } else {
            events.push(...getReservationEvents(activity, rangeStart, rangeEnd))
        }
    }

    return events
}


function getRotationEvents(activity, rangeStart, rangeEnd, now = new Date()) {

    const rotation = activity.rotation
    const members = activity.members || []

    if (!rotation || !rotation.next_rotation_at || members.length === 0) {
        return []
    }
        console.log(
        activity.name,
        'members:', members.map(member => member.name),
        'current:', rotation.current_participant_id )

    const orderedMembers = turnOrderFromCurrent(
        members,
        rotation.current_participant_id
    )

    let currentStart = new Date(now)
    let currentEnd = new Date(rotation.next_rotation_at)

    if (!Number.isFinite(currentEnd.getTime()) || currentEnd <= currentStart) {
        return []
    }

    const events = []
    let participantIndex = 0
    let steps = 0

    while (
        currentStart < rangeEnd &&
        steps < MAX_STEPS &&
        events.length < MAX_EVENTS_PER_ACTIVITY
    ) {
        const participant = orderedMembers[participantIndex]
        if (!participant) break

        // Only show the event if the rotation changes inside the visible range.
        if (currentEnd >= rangeStart && currentEnd < rangeEnd) {
            events.push({
                id: `turn-${activity.id}-${participant.id}-${currentEnd.toISOString()}`,
                title: `${activity.name}: ${participant.name}`,
                start: currentEnd.toISOString(),
                allDay: true,
                extendedProps: {
                    kind: 'Turn due',
                    activity: activity.name,
                    person: participant.name,
                    when: currentEnd.toISOString(),
                },
            })
        }

        currentStart = new Date(currentEnd)

        const nextEnd = nextRotationDate(
            rotation.frequency_value,
            rotation.frequency_unit,
            currentStart
        )

        if (!nextEnd) break

        currentEnd = new Date(nextEnd)
        participantIndex = (participantIndex + 1) % orderedMembers.length
        steps++
    }

    return events
}


// One event per reservation that overlaps the visible range.
function getReservationEvents(activity, rangeStart, rangeEnd)
{
    return (activity.reservations || [])
        .filter(reservation =>
            new Date(reservation.ends_at) > rangeStart &&
            new Date(reservation.starts_at) < rangeEnd
        )
        .map(reservation => ({
            id: `res-${reservation.id}`,
            title: `${activity.name}: ${reservation.participants?.name || 'Group member'}`,
            start: reservation.starts_at,
            end: reservation.ends_at,
            extendedProps: {
                kind: 'Reservation',
                activity: activity.name,
                person: reservation.participants?.name,
                when: reservation.starts_at,
                until: reservation.ends_at,
            },
        }))
}

export { loadCalendarEvents }