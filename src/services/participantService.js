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

        const resources = data.map(member => member.resources)
        resources.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return resources
        } catch (error)
        {
            console.error("Error fetching participnats: ", error.message)
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

// Gets all participants in the participants table (id and name)


export {
    addParticipant,
    getParticipants,
    deleteUser,
    updateUser,
    removeParticipant
}