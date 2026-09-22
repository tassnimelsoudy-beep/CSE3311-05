import { supabase } from '../lib/supabase.js'


// Creates a new resource in the "resources" table.
// Requires a name and share method. Returns the new resource object, or null on failure.
// description can be null
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

// Gets every resource, newest first.
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

// Gets one resource by its id. Returns a single object.
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

// Updates a resource. "updates" is an object of fields to change
// (e.g. { name: "New Name" }), and resourceId picks which resource.
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

// Permanently deletes a resource by its id.
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

// Gets all resources a participant belongs to.
// Looks up resource_members and returns the linked resource details.
async function getResourcesForUser(userId) 
{
    try {
        const {data, error} = await supabase
        .from("resource_members")
        .select('resources(id, name, description, sharing_method, created_at)')
        .eq("participant_id", userId)
        
        
        if (error) {
            throw error
        }

        const resources = data.map(member => member.resources)
        resources.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        console.log("successfully retrieved recourses: ", data)
        return resources
    } catch (error)
    {
        console.error("Error retrieving data: ", error.message)
        return null
    }
}

// Adds a participant to a resource with a role (e.g. "owner" or "member") role can null.
// position (position > 0 or null) is optional and can be used to order participants in a resource.
// Creates the link row in resource_members.
async function addResourceMember(resourceId, userId, userRole, userPosition)
{
       try {
     
        const {data, error } = await supabase
        .from("resource_members")
        .insert({
            resource_id: resourceId, 
            participant_id: userId, 
            role: userRole,
            position: userPosition
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

// Adds several participants to a resource at once, in turn order.
// The first id gets position 1, the next position 2, and so on.
// Returns the new resource_members rows, or null on failure.
async function addResourceMembers(resourceId, participantIds)
{
    try {
        const rows = participantIds.map((participantId, index) => ({
            resource_id: resourceId,
            participant_id: participantId,
            role: null,
            position: index + 1
        }))

        const {data, error} = await supabase
        .from("resource_members")
        .insert(rows)
        .select()

        if (error) {
            throw error
        }

        return data
    } catch (error)
    {
        console.error("Error inserting resource members: ", error.message)
        return null
    }
}

export { 
    createResource, 
    getResources, 
    getResource, 
    updateResource, 
    deleteResource, 
    getResourcesForUser, 
    addResourceMember,
    addResourceMembers }