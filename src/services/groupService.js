import { supabase } from '../lib/supabase.js'

// Creates a new group and adds the creator as its first member.
// Returns the new group object, or null if either insert fails.
async function createGroup(groupName, groupCreator)
{
    try {

        const { data: group, error: groupError } = await supabase
            .from("groups")
            .insert({
                name: groupName,
                created_by: groupCreator,
            })
            .select()
            .single()

        if (groupError) {
              console.error("GROUP INSERT FAILED:", groupError)
            throw groupError
        }

        const { error: memberError } = await supabase
            .from("group_members")
            .insert({
                group_id: group.id,
                participant_id: groupCreator,
            })

        if (memberError) {
             console.error("GROUP MEMBER INSERT FAILED:", memberError)
            throw memberError
        }


        console.log("successfully created: ", group)
        return group
    } catch (error)
    {
        console.error("Error inserting data: ", error.message)
        return null
    }
}

// Gets every group a participant belongs to, newest first.
// Looks up group_members and returns the linked group details.
async function getGroupsForUser(groupMember)
{
     console.log("Loading groups for participant:", groupMember)

        try {
        const {data, error} = await supabase
        .from("group_members")
        .select('groups(id, name, created_at, created_by)')
        .eq("participant_id", groupMember)
        
        
        if (error) {
            throw error
        }
        console.log("Membership rows returned:", data)

        const groups = data
            .map(member => member.groups)
            .filter(Boolean)
            .sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            )
        console.log("successfully retrieved groups: ", data)
        return groups
    } catch (error)
    {
        console.error("Error retrieving data: ", error.message)
        return null
    }
}

// Adds a participant to a group as a member.
async function addGroupMember(participantId, groupId)
{
    try {
     
        const {data, error } = await supabase
        .from("group_members")
        .insert({
            group_id: groupId, 
            participant_id: participantId, 
        })
        .select()

        if (error) {
            throw error
        }

        console.log("successfully added: ", data)
        return data
    } catch (error)
    {
        console.error("Error inserting group member data: ", error.message)
        return null
    }
}

// Removes a participant from a group via a database function (handles any
// related cleanup, e.g. resource memberships, on the database side).
async function removeGroupMember(memberId, groupId) {
    try {
        const { data, error } = await supabase.rpc(
            "remove_group_member",
            {
                target_group_id: groupId,
                target_participant_id: memberId
            }
        )

        if (error) throw error

        console.log("Successfully removed group member:", data)
        return data
    } catch (error) {
        console.error("Error removing group member:", error)
        return null
    }
}

// Gets every member of a group, along with the group's own name and creator.
async function getGroupMembers(groupId)
{
    try {
        const {data, error} = await supabase
        .from("group_members")
        .select('groups(name, created_by), participants(id, name)')
        .eq("group_id", groupId)
        
        
        if (error) {
            throw error
        }

        const members = data.map(row => ({
            id: row.participants.id,
            name: row.participants.name,
            groupName: row.groups.name,
            groupCreatorId: row.groups.created_by
        }))

   
        return members
    } catch (error)
    {
        console.error("Error retrieving data: ", error.message)
        return null
    }
}

export {
    createGroup,
    getGroupsForUser,
    addGroupMember,
    getGroupMembers,
    removeGroupMember
}