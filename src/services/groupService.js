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
        // The group owner can't be removed. They must transfer ownership or delete the group.
        const { data: group, error: groupError } = await supabase
            .from("groups")
            .select("created_by")
            .eq("id", groupId)
            .single()

        if (groupError) throw groupError

        if (group.created_by === memberId) {
            throw new Error("The group owner can't be removed. Transfer ownership or delete the group first.")
        }

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

async function deleteGroup(groupId)
{
    try {
        const {data, error} = await supabase
            .from("groups")
            .delete()
            .eq("id", groupId)
            .select()
            
            if (error) {
                throw error
            }

            console.log("successfully deleted group: ", data)
            return data
    } catch (error)
    {
        console.error("Error deleting group: ", error.message)
        return null
    }
}

// Hands group ownership to another member.
// Only works if currentOwnerId is the group's current owner and newOwnerId is already a member.
// Returns the updated group, or null on failure.
async function transferGroupOwnership(groupId, currentOwnerId, newOwnerId)
{
    try {
        if (currentOwnerId === newOwnerId) {
            throw new Error("That person is already the owner")
        }

        const { data: membership, error: memberError } = await supabase
            .from("group_members")
            .select("participant_id")
            .eq("group_id", groupId)
            .eq("participant_id", newOwnerId)
            .maybeSingle()

        if (memberError) throw memberError

        if (!membership) {
            throw new Error("The new owner must already be a member of the group")
        }

        // .eq("created_by", currentOwnerId) means this only updates if the caller really is the owner
        const { data, error } = await supabase
            .from("groups")
            .update({ created_by: newOwnerId })
            .eq("id", groupId)
            .eq("created_by", currentOwnerId)
            .select()
            .maybeSingle()

        if (error) throw error

        if (!data) {
            throw new Error("Only the group owner can transfer ownership")
        }

        console.log("successfully transferred ownership: ", data)
        return data
    } catch (error)
    {
        console.error("Error transferring ownership: ", error.message)
        return null
    }
}
// Sends a group invite to a participant instead of adding them directly.
// Returns the invite, or null if they're already a member, already invited, or the insert fails.
async function sendGroupInvite(groupId, invitedParticipantId, invitedBy)
{
    try {
        // skip if they're already in the group
        const { data: existing, error: existingError } = await supabase
            .from("group_members")
            .select("participant_id")
            .eq("group_id", groupId)
            .eq("participant_id", invitedParticipantId)
            .maybeSingle()

        if (existingError) {
            throw existingError
        }

        if (existing) {
            console.error("Participant is already in this group")
            return null
        }

        const { data, error } = await supabase
            .from("group_invites")
            .insert({
                group_id: groupId,
                invited_participant_id: invitedParticipantId,
                invited_by: invitedBy
            })
            .select()
            .single()

        if (error) {
            throw error
        }

        console.log("successfully sent invite: ", data)
        return data
    } catch (error)
    {
        console.error("Error sending invite: ", error.message)
        return null
    }
}

// Gets all pending invites for a participant, with the group's name and who sent it.
async function getPendingInvites(participantId)
{
    try {
        const { data, error } = await supabase
            .from("group_invites")
            .select("id, created_at, groups(id, name), invited_by_participant:participants!group_invites_invited_by_fkey(id, name)")
            .eq("invited_participant_id", participantId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })

        if (error) {
            throw error
        }

        return data
    } catch (error)
    {
        console.error("Error retrieving invites: ", error.message)
        return null
    }
}

// Accepts a pending invite: adds the person to the group, then marks the invite accepted.
// Returns the updated invite, or null on failure.
async function acceptGroupInvite(inviteId)
{
    try {
        const { data: invite, error: inviteError } = await supabase
            .from("group_invites")
            .select("*")
            .eq("id", inviteId)
            .eq("status", "pending")
            .single()

        if (inviteError) {
            throw inviteError
        }

        const member = await addGroupMember(invite.invited_participant_id, invite.group_id)

        if (!member) {
            throw new Error("Could not add participant to group")
        }

        const { data, error } = await supabase
            .from("group_invites")
            .update({ status: "accepted" })
            .eq("id", inviteId)
            .select()
            .single()

        if (error) {
            throw error
        }

        console.log("successfully accepted invite: ", data)
        return data
    } catch (error)
    {
        console.error("Error accepting invite: ", error.message)
        return null
    }
}

// Declines a pending invite. Nobody is added to the group.
async function declineGroupInvite(inviteId)
{
    try {
        const { data, error } = await supabase
            .from("group_invites")
            .update({ status: "declined" })
            .eq("id", inviteId)
            .eq("status", "pending")
            .select()
            .single()

        if (error) {
            throw error
        }

        console.log("successfully declined invite: ", data)
        return data
    } catch (error)
    {
        console.error("Error declining invite: ", error.message)
        return null
    }
}

export {
    createGroup,
    getGroupsForUser,
    addGroupMember,
    getGroupMembers,
    removeGroupMember,
    deleteGroup,
    declineGroupInvite,
    acceptGroupInvite,
    getPendingInvites,
    sendGroupInvite,
    transferGroupOwnership
}