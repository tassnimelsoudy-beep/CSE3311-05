import { supabase } from '../lib/supabase.js'

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
async function getParticipants(resourceId)
{
    try {
        
        const {data, error } = await supabase
        .from("resource_members")
        .select('participants(id, name)')
        .eq('resource_id', resourceId)
        .order("participants.created_at", {ascending: false})

        if (error) {
            throw error
        }

        const participants = data.map(member => member.participants)
        console.log("successfully got particpants: ", data)
        return participants
        } catch (error)
        {
            console.error("Error fetching participnats: ", error.message)
            return null
        } 
}
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