import { supabase } from '../lib/supabase.js'
import { getParticipants } from './participantService.js'

// Creates a rotation schedule for a resource (e.g. every 1 "week").
// Returns the new rotation object, or null on failure.
//rotation logic gives it a next person and the date of the next rotation
async function createRotation(resourceId, frequencyValue, frequencyUnit)
{
        try {
        const {data, error } = await supabase
        .from("rotations")
        .insert({
            resource_id: resourceId,
            frequency_value: frequencyValue,
            frequency_unit: frequencyUnit
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

// Gets the rotation for a resource. Returns a single object.
// Returns null (without an error) if the resource has no rotation yet.
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
// Returns rows like { position: 1, participants: { id, name } }.
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

    
    console.log("successfully retrieved rotation participants: ", data)
    return data

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
    const participants = await getParticipants(resourceId)

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
    getNextParticipantForResource
}