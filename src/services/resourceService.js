import { supabase } from '../lib/supabase.js'

async function createResource(resourceName, description, shareMethod)
{
    try {
        if (resourceName == null || shareMethod == null || !resourceName.trim() || !shareMethod.trim()) {
            console.error("resource name or sharemethod cannot be empty")
            return null
        }
         const {data, error } = await supabase
        .from("resources")
        .insert({
            name: resourceName, 
            description: description, 
            sharing_method: shareMethod
        })
        .select()

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
async function getResources()
{
    try {
        const {data, error} = await supabase
            .from("resources")
            .select('*')
            .order("created_at", {ascending: false})
            
            if (error) {
                throw error
            }

            console.log("successfully retrieved resources")
            return data
    } catch (error)
    {
        console.error("Error retrieving data: ", error.message)
        return null
    }
}
async function getResource(resourceId)
{
    try {
        const {data, error} = await supabase
            .from("resources")
            .select('*')
            .eq("id", resourceId)
            .single()
            
            if (error) {
                throw error
            }

            console.log("successfully retrieved resource: ", data)
            return data

    } catch (error)
    {
        console.error("Error retrieving data: ", error.message)
        return null
    }
    
}
async function updateResource(resourceId, updates)
{
    try {
        const {data, error} = await supabase
            .from("resources")
            .update(updates)
            .eq("id", resourceId)
            .select()
            
            if (error) {
                throw error
            }

            console.log("successfully updated resource: ", data)
            return data
    } catch (error)
    {
        console.error("Error updating data: ", error.message)
        return null
    }
    
}
async function deleteResource(resourceId)
{
    try {
        const {data, error} = await supabase
            .from("resources")
            .delete()
            .eq("id", resourceId)
            
            if (error) {
                throw error
            }

            console.log("successfully deleted resource: ", data)
            return data
    } catch (error)
    {
        console.error("Error deleting data: ", error.message)
        return null
    }
}
async function getResourcesForUser(userId) 
{
    try {
        const {data, error} = await supabase
            .from("resource_members")
            .select('resource_id(id, name, description, sharing_method, created_at)')
            .eq("participant_id", userId)

            .order("resource.created_at", {ascending: false})
            
            if (error) {
                throw error
            }

            console.log("successfully retrieved resources")
            return data

    } catch (error)
    {
        console.error("Error retrieving data: ", error.message)
        return null
    }
}
async function addResourceMember(resourceId, userId, userRole)
{
       try {
     
        const {data, error } = await supabase
        .from("resource_members")
        .insert({
            resource_id: resourceId, 
            participant_id: userId, 
            role: userRole
        })
        .select()

        if (error) {
            throw error
        }

        console.log("successfully created: ", data)
        return data
    } catch (error)
    {
        console.error("Error inserting resource member data: ", error.message)
        return null
    }
}