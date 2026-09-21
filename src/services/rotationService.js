import { supabase } from '../lib/supabase.js'


// Creates a rotation schedule for a resource (e.g. every 1 "week").
// Sets the current person to the first in the turn order and
// next_rotation_at to now + the frequency.
// Returns the new rotation object, or null on failure.
async function createRotation(resourceId, frequencyValue, frequencyUnit)
{
        try {

            const participants = await getRotationParticipants(resourceId)
            const current = getFirstParticipant(participants)
            const dueDate = nextRotationDate(frequencyValue, frequencyUnit)

            if (!dueDate) {
            console.error("invalid frequency unit")
            return null
            }

        const {data, error } = await supabase
        .from("rotations")
        .insert({
            resource_id: resourceId,
            frequency_value: frequencyValue,
            frequency_unit: frequencyUnit,
            current_participant_id: current ? current.id : null,
            next_rotation_at: dueDate
        })
        .select()
        .single()

        if (error) {
            throw error
        }

        console.log("successfully created rotation: ", data)
        return data
    } catch (error)
    {
        console.error("Error inserting rotation data: ", error.message)
        return null
    }
}

// Gets the rotation row for a resource (frequency, current person, next rotation time).
// Returns a single object, or null (without an error) if the resource has no rotation method
async function getRotation(resourceId)
{
        try {
        const {data, error} = await supabase
            .from("rotations")
            .select('*')
            .eq("resource_id", resourceId)
            .maybeSingle()
            
            if (error) {
                throw error
            }

            console.log("successfully retrieved rotation: ", data)
            return data

    } catch (error)
    {
        console.error("Error retrieving rotation data: ", error.message)
        return null
    }
}


// Updates a rotation by its id. "updates" is an object of fields to change
// (e.g. { frequency_value: 2 }). Returns the updated rotation object.
async function updateRotation(rotationId, updates) 
{
    try {
    const {data, error} = await supabase
    .from("rotations")
    .update(updates)
    .eq("id", rotationId)
    .select()
    .single()
    
    if (error) {
        throw error
    }

    console.log("successfully updated rotation: ", data)
    return data
    } catch (error)
    {
        console.error("Error updating rotation data: ", error.message)
        return null
    }
}

// Gets the members in a resource's rotation, ordered by turn position.
// Returns a flat array like [{ id: 3, name: "Sam", position: 1 }, ...].
async function getRotationParticipants(resourceId)
{
    try {
    const {data, error} = await supabase
    .from("resource_members")
    .select('participants(id, name), position')
    .eq("resource_id", resourceId)
    .order("position", {ascending: true})
    
    
    if (error) {
        throw error
    }

    const participants = data.map(member => ({
        ...member.participants,
        position: member.position
    }))

    
    console.log("successfully retrieved rotation participants: ", data)
    return participants

    } catch (error)
    {
        console.error("Error retrieving rotation participant data: ", error.message)
        return null
    }
}

// Sets a participant's turn position in one resource's rotation.
// Updates the "position" column in resource_members.
// Positions must be unique per resource, so to swap two people,
// set one to null first, then update both.
// Returns null if the participant isn't in the resource or the update fails.
async function updateParticipantPosition(resourceId, participantId, position)
{
    try {
    const {data, error} = await supabase
    .from("resource_members")
    .update({"position": position })
    .eq("participant_id", participantId)
    .eq("resource_id", resourceId)
    .select()
    
    if (error) {
        throw error
    }

    if (data.length === 0) {
    console.error("Participant not found in this resource")
    return null
    }

    console.log("successfully updated participant position: ", data)
    return data
    } catch (error)
    {
        console.error("Error updating position data: ", error.message)
        return null
    }
}

// Finds the next participant in a rotation
function getNextParticipant(participants, currentParticipantId)
{
    if (!participants || participants.length === 0) {
        return null
    }

    const currentIndex = participants.findIndex(
        participant => participant.id === currentParticipantId
    )

    if (currentIndex === -1) {
        return null
    }

    const nextIndex = (currentIndex + 1) % participants.length

    return participants[nextIndex]
}

// Returns the date of the next rotation (now + frequency) as an ISO string.
// Returns null if the unit isn't minute, hour, day, week, or month.
function nextRotationDate(frequencyValue, frequencyUnit, fromDate = new Date())
{
    const date = new Date(fromDate)

     if (frequencyUnit === "minute") {
        date.setMinutes(date.getMinutes() + frequencyValue)
    } else if (frequencyUnit === "hour") {
        date.setHours(date.getHours() + frequencyValue)
    } else if (frequencyUnit === "day") {
        date.setDate(date.getDate() + frequencyValue)
    } else if (frequencyUnit === "week") {
        date.setDate(date.getDate() + frequencyValue * 7)
    } else if (frequencyUnit === "month") {
        date.setMonth(date.getMonth() + frequencyValue)
    } else {
        return null
    }

    return date.toISOString()
}

// Passes the turn to the next person and sets the next rotation date.
// Falls back to the first person if the current one is no longer a member.
// Returns the updated rotation, or null if there's no rotation or no members.
async function advanceTurn(resourceId)
{
    const rotation = await getRotation(resourceId)
    if (!rotation) {
    return null
    }
    const participants = await getRotationParticipants(resourceId)

    const next = getNextParticipant(participants, rotation.current_participant_id) || getFirstParticipant(participants)

    if (!next) {
    return null
    }

    return updateRotation(rotation.id, {
            current_participant_id: next.id,
            next_rotation_at: nextRotationDate(rotation.frequency_value, rotation.frequency_unit)
    })
}

// Advances the turn only if the next rotation time has passed.
// Returns the updated rotation if it advanced, otherwise the unchanged rotation.
async function advanceIfDue(resourceId)
{
    const rotation = await getRotation(resourceId)

    if (!rotation || !rotation.next_rotation_at) {
        return rotation
    }

    if (new Date(rotation.next_rotation_at) <= new Date()) {
        return advanceTurn(resourceId)
    }

    return rotation
}

// Gets the first participant when a rotation starts
function getFirstParticipant(participants)
{
    if (!participants || participants.length === 0) {
        return null
    }

    return participants[0]
}
// Gets the next participant for a resource
async function getNextParticipantForResource(resourceId, currentParticipantId)
{
    const participants = await getRotationParticipants(resourceId)

    if (!participants) {
        return null
    }

    return getNextParticipant(participants, currentParticipantId)
}
export {
    createRotation,
    getRotation,
    updateRotation,
    getRotationParticipants,
    updateParticipantPosition,
    getNextParticipant,
    getFirstParticipant,
    getNextParticipantForResource,
    advanceIfDue,
    advanceTurn,
    nextRotationDate
}