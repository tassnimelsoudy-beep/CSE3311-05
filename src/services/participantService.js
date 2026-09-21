import { supabase } from '../lib/supabase.js'

// Adds a new participant to the "participants" table.
// Returns the new row, or null if the name is empty or the insert fails
async function addParticipant(userName)
{
    try {
            if (userName == null || !userName.trim()) {
                console.error("name cannot be empty")
                return null
            }
             const {data, error } = await supabase
            .from("participants")
            .insert({
                name: userName, 
            })
            .select()
            .single()
    
            if (error) {
                throw error
            }
    
            console.log("successfully created: ", data)
            return data
    } catch (error)
    {
        console.error("Error inserting data: ", error.message)
        return null
    }
}

// Gets all participants that belong to a given resource.
// Looks up the resource_members table and returns the linked participants' id and name
async function getParticipants(resourceId)
{
    try {
        const {data, error } = await supabase
        .from("resource_members")
        .select('participants(id, name)')
        .eq('resource_id', resourceId)

        if (error) {
            throw error
        }

        return data.map(member => member.participants)
    } catch (error)
    {
        console.error("Error fetching participants: ", error.message)
        return null
    }
}

// Permanently deletes a participant from the "participants" table by their id
async function deleteUser(userId)
{
    try {
    const {data, error} = await supabase
        .from("participants")
        .delete()
        .eq("id", userId)
        
        if (error) {
            throw error
        }

        console.log("successfully deleted user: ", data)
        return data
    } catch (error)
    {
        console.error("Error deleting data: ", error.message)
        return null
    }
}

// Updates a participant's info. "update" is an object of fields to change
// (e.g. { name: "New Name" }), and userId picks which participant to update.
async function updateUser(update, userId)
{
    try {

        const {data, error } = await supabase
        .from("participants")
        .update(update)
        .eq("id", userId)
        .select()

        if (error) {
            throw error
        }

    console.log("successfully updated participant: ", data)
    return data
        } catch (error)
        {
            console.error("Error updating user: ", error.message)
            return null
        }
}

// Removes a participant from one resource only (deletes the link in resource_members).
// The participant still exists in the "participants" table.
async function removeParticipant(participantId, resourceId)
{
    try {
    const {data, error} = await supabase
    .from("resource_members")
    .delete()
    .eq("participant_id", participantId)
    .eq("resource_id", resourceId)
    
    if (error) {
        throw error
    }

    console.log("successfully removed participant: ", data)
    return data
    } catch (error)
    {
        console.error("Error deleting data: ", error.message)
        return null
    }
}

// Gets all participants in the participants table (id and name), sorted by name
async function getAllParticipants()
{
    try {
        const {data, error} = await supabase
        .from("participants")
        .select('id, name')
        .order("name", {ascending: true})

        if (error) {
            throw error
        }

        return data
    } catch (error)
    {
        console.error("Error fetching participants: ", error.message)
        return null
    }
}

// Gets the participant row linked to a login account (participants.user_id).
// Returns the participant, or null if none is linked yet.
async function getCurrentParticipant(userId)
{
    try {
        const {data, error} = await supabase
        .from("participants")
        .select('id, name, user_id')
        .eq("user_id", userId)
        .maybeSingle()

        if (error) {
            throw error
        }

        return data
    } catch (error)
    {
        console.error("Error fetching current participant: ", error.message)
        return null
    }
}

export {
    addParticipant,
    getParticipants,
    getAllParticipants,
    getCurrentParticipant,
    deleteUser,
    updateUser,
    removeParticipant
}