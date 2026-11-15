import { getRotation, nextRotationDate } from "./rotationService"
import { getResourcesForGroup } from "./resourceService"
import {} from "./reservationService"
import { turnOrderFromCurrent } from '../utils/activity.js'


async function loadCalendarEvents(groupId, rangeStart, rangeEnd) {
    if (!groupId) return []

    try {
        // Get all resources belonging to this group.
        const resources = await getResourcesForGroup(groupId)

        if (!resources) return null

        const events = await Promise.all(
            resources.map(async resource => {
                const resourceEvents = []

                // Generate rotation events if this resource uses rotations.
                if (isRotation(resource)) {
                    const [rotation, members] = await Promise.all([
                        getRotation(resource.id),
                        getRotationParticipants(resource.id)
                    ])

                    if (rotation && members) {
                        const activity = {
                            ...resource,
                            rotation,
                            members
                        }

                        resourceEvents.push(
                            ...generateRotationEvents(
                                activity,
                                rangeStart,
                                rangeEnd
                            )
                        )
                    }
                }

                // Retrieve reservations for this resource.
                const reservations = await getReservationsForResource(
                    resource.id,
                    rangeStart,
                    rangeEnd
                )

                if (reservations) {
                    const activity = {
                        ...resource,
                        reservations
                    }

                    resourceEvents.push(
                        ...generateReservationEvents(
                            activity,
                            rangeStart,
                            rangeEnd
                        )
                    )
                }

                return resourceEvents
            })
        )

        // Combine all resource events into one array.
        return events.flat()

    } catch (error) {
        console.error('Error loading calendar events:', error.message)
        return null
    }
}

function getRotationEvents(activity, rangeStart, rangeEnd, now = new Date())
{
    const rotation = activity.rotation
    const members = activity.members || []

    // Make sure we have enough information to generate events.
    if (!rotation || !rotation.next_rotation_at || members.length === 0) {
        return []
    }

    // current participant first
    const orderedMembers = turnOrderFromCurrent(
        members,
        rotation.current_participant_id
    )

    // Find the date when the current participant's turn ends.
    let currentStart = new Date(now)
    let currentEnd = new Date(rotation.next_rotation_at)

   
    if (!Number.isFinite(currentEnd.getTime())) {
        return []
    }


    const events = []

    let participantIndex = 0

    while (currentStart < rangeEnd) {
        const participant = orderedMembers[participantIndex]

        if (!participant) break

        // Only include events that overlap the requested calendar range.
        if (currentEnd > rangeStart) {
            events.push({
                id: `${activity.id}-${participant.id}-${currentStart.toISOString()}`,
                title: `${activity.name} - ${participant.name}`,
                start: currentStart.toISOString(),
                end: currentEnd.toISOString(),
                allDay: false,
                extendedProps: {
                    type: 'rotation',
                    resourceId: activity.id,
                    participantId: participant.id,
                    participantName: participant.name
                }
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
    }

    return events
}

function getReservationEvents(activity, rangeStart, rangeEnd)
{

    const reservations = activity.reservations || []

    return reservations 
        .filter(reservation => {
            const start = new Date(reservation.starts_at)
            const end = new Date(reservation.ends_at)

            // Ignore invalid dates.
            if (!Number.isFinite(start.getTime()) ||
                !Number.isFinite(end.getTime())) {
                return false
            }

            // Include reservations that overlap the calendar range.
            return start < rangeEnd && end > rangeStart
        })
        .map(reservation => ({
            id: `reservation-${reservation.id}`,
            title: `${activity.name} - ${reservation.participants?.name || 'Reserved'}`,
            start: reservation.starts_at,
            end: reservation.ends_at,
            allDay: false,
            extendedProps: {
                type: 'reservation',
                resourceId: activity.id,
                reservationId: reservation.id,
                participantId: reservation.participant_id,
                participantName: reservation.participants?.name || null
            }
        }))
    
}


export {
    loadCalendarEvents,
    getRotationEvents,
    getReservationEvents
}