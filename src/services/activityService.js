// Combines the resource, participant and rotation services into what the
// dashboard needs: each activity together with its members and rotation.
import {
    getResourcesForUser,
    getResourcesForGroup,
    createResource,
    addResourceMembers,
    updateResource,
    deleteResource
} from './resourceService.js'
import { getRotationParticipants, advanceIfDue, createRotation, updateRotation } from './rotationService.js'
import { isRotation, sortActivities } from '../utils/activity.js'

// Loads the activities to show on the dashboard. Overdue turns are passed on
// first (advanceIfDue), so it always shows whose turn it is now.
// With a groupId, loads that group's activities. Without one, falls back to
// every activity the participant belongs to, so someone who isn't in a group
// yet still sees their own rather than an empty page.
// Returns an array, or null if loading failed.
async function loadActivities(participantId, groupId)
{
    const resources = groupId
        ? await getResourcesForGroup(groupId)
        : await getResourcesForUser(participantId)

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
// (first id goes first), and the rotation schedule. The activity belongs to
// groupId, and createResource records the logged-in participant as its owner.
// Returns the new resource, or null if any step failed.
async function createRotatingActivity({ name, description, frequencyValue, frequencyUnit, memberIds, groupId })
{
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

export { loadActivities, createRotatingActivity, updateActivity, deleteActivity }
