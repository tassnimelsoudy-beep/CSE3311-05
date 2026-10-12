// Combines the resource, participant and rotation services into what the
// dashboard needs: each activity together with its members and rotation.
import { createResource, addResourceMembers, getResourcesForGroup } from './resourceService.js'
import { getRotationParticipants, advanceIfDue, createRotation } from './rotationService.js'
import { isRotation, sortActivities } from '../utils/activity.js'
import { getReservationsForResource } from './reservationService.js'

// Loads every activity the participant belongs to. Overdue turns are passed
// on first (advanceIfDue), so the dashboard always shows whose turn it is now.
// Returns an array, or null if loading failed.
async function loadActivities(participantId, groupId)
{
    if (!groupId) {
        return []
    } 

    const resources = await getResourcesForGroup(groupId)
    if (!resources) {
        return null
    }

    const activities = await Promise.all(
        resources.filter(Boolean).map(async resource => {
            const rotating = isRotation(resource)
            const members = rotating ? (await getRotationParticipants(resource.id)) || [] : []
            const rotation = rotating ? await advanceIfDue(resource.id) : null
            const reservations = rotating ? [] : await getReservationsForResource(resource.id)
            return { ...resource, members, rotation, reservations: reservations || [] }
        })
    )

    return sortActivities(activities)
}

// Creates a rotating activity: the resource, its members in turn order
// (first id goes first), and the rotation schedule.
// Returns the new resource, or null if any step failed.
async function createRotatingActivity({ name, description, frequencyValue, frequencyUnit, memberIds, groupId })
{

    if (!groupId) {
        return null;
    }

    const resource = await createResource(name, description || null, 'Rotation', groupId)
    if (!resource) {
        return null
    }

    const members = await addResourceMembers(resource.id, memberIds)
    if (!members) {
        return null
    }

    const rotation = await createRotation(resource.id, frequencyValue, frequencyUnit)
    return rotation ? resource : null
}

async function createReservationActivity({ name, description, groupId }) {
    if (!groupId) {
        return null
    }

    return createResource(name, description || null, 'Reservation', groupId)
}

export { loadActivities, createRotatingActivity, createReservationActivity }
