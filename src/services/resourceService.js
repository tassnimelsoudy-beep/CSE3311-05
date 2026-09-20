import { supabase } from '../lib/supabase.js'

// Create a new resource record.
// Use: createResource("Slides", "Notes", "email")
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

// Get all resources, newest first.
// Use: getResources()
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

// Fetch one resource using its id.
// Use: getResource(12)
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

// Update a resource with any field changes.
// Use: updateResource(12, { sharing_method: "link" })
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

// Delete a resource by its id.
// Use: deleteResource(12)
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

// Return all resources tied to a user.
// Use: getResourcesForUser(currentUserId)
async function getResourcesForUser(userId) 
{
    try {
        const {data, error} = await supabase
            .from("resource_members")
            .select('resources(id, name, description, sharing_method, created_at)')
            .eq("participant_id", userId)
            .order("resources.created_at", {ascending: false})
            
            if (error) {
                throw error
            }

            const resources = data.map(member => member.resources)

            console.log("successfully retrieved resources")
            return resources
    } catch (error)
    {
        console.error("Error retrieving data: ", error.message)
        return null
    }
}

// Add a participant to a resource with their role.
// Use: addResourceMember(resourceId, userId, "owner")
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