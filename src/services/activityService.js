// Combines the resource, participant and rotation services into what the
// dashboard needs: each activity together with its members and rotation.
import { getResourcesForUser, createResource, addResourceMembers } from './resourceService.js'
import { getRotationParticipants, advanceIfDue, createRotation } from './rotationService.js'
import { isRotation, sortActivities } from '../utils/activity.js'

// Loads every activity the participant belongs to. Overdue turns are passed
// on first (advanceIfDue), so the dashboard always shows whose turn it is now.
// Returns an array, or null if loading failed.
async function loadActivities(participantId)
{
    const resources = await getResourcesForUser(participantId)
    if (!resources) {
        return null
    }

    const activities = await Promise.all(
        resources.filter(Boolean).map(async resource => {
            const members = (await getRotationParticipants(resource.id)) || []
            const rotation = isRotation(resource) ? await advanceIfDue(resource.id) : null
            return { ...resource, members, rotation }
        })
    )

    return sortActivities(activities)
}

// Creates a rotating activity: the resource, its members in turn order
// (first id goes first), and the rotation schedule.
// Returns the new resource, or null if any step failed.
async function createRotatingActivity({ name, description, frequencyValue, frequencyUnit, memberIds })
{
    const resource = await createResource(name, description || null, 'Rotation')
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

export { loadActivities, createRotatingActivity }
