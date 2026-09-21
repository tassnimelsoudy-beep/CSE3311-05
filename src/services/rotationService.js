import { getParticipants } from './participantService.js'
import { supabase } from '../lib/supabase.js'
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
// Gets the rotation information for a resource
async function getRotation(resourceId)
{
    try {
        const { data, error } = await supabase
            .from("rotations")
            .select("*")
            .eq("resource_id", resourceId)
            .single()

        if (error) {
            throw error
        }

        return data
    } catch (error) {
        console.error("Error retrieving rotation: ", error.message)
        return null
    }
}
// Moves the rotation to the next participant
async function advanceRotation(resourceId)
{
    try {
        // Get the current rotation from the database
        const rotation = await getRotation(resourceId)

        if (!rotation) {
            return null
        }

        // Get all participants that belong to this resource
        const participants = await getParticipants(resourceId)

        if (!participants || participants.length === 0) {
            return null
        }

        // Find who comes after the current next participant
        const nextParticipant = getNextParticipant(
            participants,
            rotation.next_participant_id
        )

        if (!nextParticipant) {
            return null
        }

        // Save the new next participant in Supabase
        const { data, error } = await supabase
            .from("rotations")
            .update({
                next_participant_id: nextParticipant.id
            })
            .eq("resource_id", resourceId)
            .select()
            .single()

        if (error) {
            throw error
        }

        console.log("Successfully advanced rotation: ", data)
        return data

    } catch (error) {
        console.error("Error advancing rotation: ", error.message)
        return null
    }
}
export {
    getNextParticipant,
    getFirstParticipant,
    getNextParticipantForResource,
    getRotation,
    advanceRotation
}