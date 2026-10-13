// Combines the resource, participant and rotation services into what the
// dashboard needs: each activity together with its members and rotation.
import {
    getResourcesForGroup,
    createResource,
    addResourceMembers,
    updateResource,
    deleteResource
} from './resourceService.js'
import { getRotationParticipants, advanceIfDue, createRotation, updateRotation } from './rotationService.js'
import { isRotation, sortActivities } from '../utils/activity.js'
import { getReservationsForResource } from './reservationService.js'

// Loads the activities to show on the dashboard. Overdue turns are passed on
// first (advanceIfDue), so it always shows whose turn it is now.
// With a groupId, loads that group's activities. Without one, falls back to
// every activity the participant belongs to, so someone who isn't in a group
// yet still sees their own rather than an empty page.
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
// (first id goes first), and the rotation schedule. The activity belongs to
// groupId, and createResource records the logged-in participant as its owner.
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

// Saves edits to an activity. "changes" may hold any of:
//   name, description      -> saved on the resource
//   frequencyValue, frequencyUnit -> saved on its rotation (rotations only)
// Only the fields present are touched. The next due date is deliberately left
// alone, so changing the schedule doesn't skip or rush the turn in progress.
// Returns { resource, rotation } with whatever was updated, or null on failure.
async function updateActivity(activity, changes)
{
    const resourceFields = {}
    if (changes.name !== undefined) resourceFields.name = changes.name
    if (changes.description !== undefined) resourceFields.description = changes.description || null

    let resource = activity
    if (Object.keys(resourceFields).length > 0) {
        const rows = await updateResource(activity.id, resourceFields)
        if (!rows) {
            return null
        }
        resource = { ...activity, ...resourceFields }
    }

    let rotation = activity.rotation
    const rotationChanged =
        rotation &&
        (changes.frequencyValue !== undefined || changes.frequencyUnit !== undefined)

    if (rotationChanged) {
        const updated = await updateRotation(rotation.id, {
            frequency_value: changes.frequencyValue ?? rotation.frequency_value,
            frequency_unit: changes.frequencyUnit ?? rotation.frequency_unit
        })
        if (!updated) {
            return null
        }
        rotation = updated
    }

    return { resource, rotation }
}

// Permanently deletes an activity. The database removes its members, rotation
// and reservations through ON DELETE CASCADE, so only the resource is deleted
// here. Returns true on success, false if the delete failed.
async function deleteActivity(resourceId)
{
    const result = await deleteResource(resourceId)
    return result !== null
}

async function createReservationActivity({ name, description, groupId }) {
    if (!groupId) {
        return null
    }

    return createResource(name, description || null, 'Reservation', groupId)
}

export {
    loadActivities,
    createRotatingActivity,
    createReservationActivity,
    updateActivity,
    deleteActivity
}

