import { supabase } from '../lib/supabase.js'

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
            throw groupError
        }

        const { error: memberError } = await supabase
            .from("group_members")
            .insert({
                group_id: group.id,
                participant_id: groupCreator,
            })

        if (memberError) {
            throw memberError
        }


        console.log("successfully created: ", data)
        return data
    } catch (error)
    {
        console.error("Error inserting data: ", error.message)
        return null
    }
}

async function getGroupsForUser(groupMember)
{
        try {
        const {data, error} = await supabase
        .from("group_members")
        .select('groups(id, name, created_at, created_by)')
        .eq("participant_id", groupMember)
        
        
        if (error) {
            throw error
        }

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
    getGroupMembers
}