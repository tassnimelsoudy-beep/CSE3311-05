import { supabase } from '../lib/supabase.js'

const ONLY_HOLDER_CAN_ADVANCE = true //this and activity panel control who can advance turn


// Turns a date picked in the creation form ("2026-11-20") into the moment the
// first turn hands over. The whole of that day still belongs to the first
// person, so the turn ends as the day does: formatDue compares whole days, and
// an earlier time would advance the rotation at midnight while the card still
// read "Today". Returns null for a blank or malformed date, so callers fall
// back to the normal frequency.
function startDateToFirstHandoff(dateInput)
{
    if (!dateInput) {
        return null
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateInput).trim())
    if (!match) {
        return null
    }

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])

    // Built from parts rather than parsed, because new Date("2026-11-20")
    // reads as UTC midnight and would land on the previous day west of GMT.
    const date = new Date(year, month - 1, day, 23, 59, 59, 999)

    // Rejects dates that don't exist (Feb 30 rolls into March).
    if (Number.isNaN(date.getTime()) || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null
    }

    return date.toISOString()
}

// Creates a rotation schedule for a resource (e.g. every 1 "week").
// Sets the current person to the first in the turn order. next_rotation_at
// becomes the given start date (the first handoff) when one is supplied,
// and now + the frequency otherwise.
// Returns the new rotation object, or null on failure.
async function createRotation(resourceId, frequencyValue, frequencyUnit, startDate = null)
{
        try {

            const participants = await getRotationParticipants(resourceId)
            const current = getFirstParticipant(participants)
            // An explicit start date is the first handoff; otherwise the
            // first turn runs one full period from now.
            const dueDate = startDateToFirstHandoff(startDate)
                || nextRotationDate(frequencyValue, frequencyUnit)

            if (!dueDate) {
            console.error("invalid frequency unit")
            return null
            }

        const {data, error } = await supabase
        .from("rotations")
        .insert({
            resource_id: resourceId,
            frequency_value: frequencyValue,
            frequency_unit: frequencyUnit,
            current_participant_id: current ? current.id : null,
            next_rotation_at: dueDate
        })
        .select()
        .single()

        if (error) {
            throw error
        }

        console.log("successfully created rotation: ", data)
        return data
    } catch (error)
    {
        console.error("Error inserting rotation data: ", error.message)
        return null
    }
}

// Gets the rotation row for a resource (frequency, current person, next rotation time).
// Returns a single object, or null (without an error) if the resource has no rotation method
async function getRotation(resourceId)
{
        try {
        const {data, error} = await supabase
            .from("rotations")
            .select('*')
            .eq("resource_id", resourceId)
            .maybeSingle()
            
            if (error) {
                throw error
            }

            console.log("successfully retrieved rotation: ", data)
            return data

    } catch (error)
    {
        console.error("Error retrieving rotation data: ", error.message)
        return null
    }
}


// Updates a rotation by its id. "updates" is an object of fields to change
// (e.g. { frequency_value: 2 }). Returns the updated rotation object.
async function updateRotation(rotationId, updates) 
{
    try {
    const {data, error} = await supabase
    .from("rotations")
    .update(updates)
    .eq("id", rotationId)
    .select()
    .single()
    
    if (error) {
        throw error
    }

    console.log("successfully updated rotation: ", data)
    return data
    } catch (error)
    {
        console.error("Error updating rotation data: ", error.message)
        return null
    }
}

// Gets the members in a resource's rotation, ordered by turn position.
// Returns a flat array like [{ id: 3, name: "Sam", position: 1 }, ...].
async function getRotationParticipants(resourceId)
{
    try {
    const {data, error} = await supabase
    .from("resource_members")
    .select('participants(id, name), position')
    .eq("resource_id", resourceId)
    .order("position", {ascending: true})
    
    
    if (error) {
        throw error
    }

    const participants = data.map(member => ({
        ...member.participants,
        position: member.position
    }))

    
    console.log("successfully retrieved rotation participants: ", data)
    return participants

    } catch (error)
    {
        console.error("Error retrieving rotation participant data: ", error.message)
        return null
    }
}

// Sets a participant's turn position in one resource's rotation.
// Updates the "position" column in resource_members.
// Positions must be unique per resource, so to swap two people,
// set one to null first, then update both.
// Returns null if the participant isn't in the resource or the update fails.
async function updateParticipantPosition(resourceId, participantId, position)
{
    try {
    const {data, error} = await supabase
    .from("resource_members")
    .update({"position": position })
    .eq("participant_id", participantId)
    .eq("resource_id", resourceId)
    .select()
    
    if (error) {
        throw error
    }

    if (data.length === 0) {
    console.error("Participant not found in this resource")
    return null
    }

    console.log("successfully updated participant position: ", data)
    return data
    } catch (error)
    {
        console.error("Error updating position data: ", error.message)
        return null
    }
}

// Rewrites a rotation's turn order and hands the current turn to whoever is
// now first. The due date is deliberately untouched: reordering decides who is
// on duty, not how long the period lasts.
//
// Positions are unique per resource, so the new order can't be written straight
// over the old one - the first write would collide with whoever still holds
// that slot. Everyone is parked above the highest position in use first, then
// written down into 1..n. Parking above rather than below keeps the values
// positive, in case the column only allows that, and the parked values ascend
// in the new order, so a failure between the two passes leaves the rotation in
// the intended order rather than a scrambled one.
//
// Returns the updated rotation, or null if any write fails.
async function reorderRotation(resourceId, orderedParticipantIds)
{
    if (!resourceId || !Array.isArray(orderedParticipantIds) || orderedParticipantIds.length === 0) {
        console.error("Nothing to reorder")
        return null
    }

    const existing = await getRotationParticipants(resourceId)
    if (!existing) {
        return null
    }

    const count = orderedParticipantIds.length
    const highest = existing.reduce((max, member) => Math.max(max, member.position || 0), 0)
    const parkFrom = Math.max(highest, count) + 1

    for (let index = 0; index < count; index++) {
        const parked = await updateParticipantPosition(resourceId, orderedParticipantIds[index], parkFrom + index)
        if (!parked) {
            console.error("Could not park turn positions")
            return null
        }
    }

    for (let index = 0; index < count; index++) {
        const placed = await updateParticipantPosition(resourceId, orderedParticipantIds[index], index + 1)
        if (!placed) {
            console.error("Could not write the new turn order")
            return null
        }
    }

    const rotation = await getRotation(resourceId)
    if (!rotation) {
        return null
    }

    return updateRotation(rotation.id, { current_participant_id: orderedParticipantIds[0] })
}

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

// Returns the date of the next rotation (now + frequency) as an ISO string.
// Returns null if the unit isn't minute, hour, day, week, or month.
function nextRotationDate(frequencyValue, frequencyUnit, fromDate = new Date())
{
    const date = new Date(fromDate)

     if (frequencyUnit === "minute") {
        date.setMinutes(date.getMinutes() + frequencyValue)
    } else if (frequencyUnit === "hour") {
        date.setHours(date.getHours() + frequencyValue)
    } else if (frequencyUnit === "day") {
        date.setDate(date.getDate() + frequencyValue)
    } else if (frequencyUnit === "week") {
        date.setDate(date.getDate() + frequencyValue * 7)
    } else if (frequencyUnit === "month") {
        // Keep the same day of the month, but clamp to the last day when the
        // target month is shorter (Jan 31 + 1 month -> Feb 28, not Mar 3).
        const day = date.getDate()
        date.setDate(1)
        date.setMonth(date.getMonth() + frequencyValue)
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        date.setDate(Math.min(day, lastDay))
    } else {
        return null
    }

    return date.toISOString()
}

// Passes the turn to the next person and sets the next rotation date.
// Falls back to the first person if the current one is no longer a member.
// Returns the updated rotation, or null if there's no rotation or no members.
async function advanceTurn(resourceId)
{
    const rotation = await getRotation(resourceId)
    if (!rotation) {
    return null
    }
    const participants = await getRotationParticipants(resourceId)

    const next = getNextParticipant(participants, rotation.current_participant_id) || getFirstParticipant(participants)

    if (!next) {
    return null
    }

    return updateRotation(rotation.id, {
            current_participant_id: next.id,
            next_rotation_at: followingDueDate(rotation)
    })
}

// The due date for the next turn: one period after the current due date, so
// completing a turn twice moves the date forward twice (counting from "now"
// would give the same date both times). If that date is still in the past
// (turns were missed for several periods), keeps stepping forward until it's
// in the future. Starts from now if the rotation has no due date yet.
function followingDueDate(rotation, now = new Date())
{
    const { frequency_value: value, frequency_unit: unit } = rotation
    let next = nextRotationDate(value, unit, rotation.next_rotation_at || now)

    for (let steps = 0; next && new Date(next) <= now && steps < 1000; steps++) {
        next = nextRotationDate(value, unit, next)
    }

    return next
}

// Advances the turn only if the next rotation time has passed.
// Returns the updated rotation if it advanced, otherwise the unchanged rotation.
async function advanceIfDue(resourceId)
{
    const rotation = await getRotation(resourceId)

    if (!rotation || !rotation.next_rotation_at) {
        return rotation
    }

    if (new Date(rotation.next_rotation_at) <= new Date()) {
        return advanceTurn(resourceId)
    }

    return rotation
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
    const participants = await getRotationParticipants(resourceId)

    if (!participants) {
        return null
    }

    return getNextParticipant(participants, currentParticipantId)
}

// Called when someone clicks "mark done". Only the person whose turn it is
// may pass the turn on. Returns the updated rotation, or null if not allowed.
async function completeTurn(resourceId, participantId)
{
    const rotation = await getRotation(resourceId)

    if (ONLY_HOLDER_CAN_ADVANCE && (!rotation || !participantId || rotation.current_participant_id !== participantId)) {
        console.error("Only the current holder can mark this turn done")
        return null
    }

    return advanceTurn(resourceId)
}
export {
    createRotation,
    getRotation,
    updateRotation,
    getRotationParticipants,
    updateParticipantPosition,
    reorderRotation,
    getNextParticipant,
    getFirstParticipant,
    getNextParticipantForResource,
    advanceIfDue,
    advanceTurn,
    nextRotationDate,
    startDateToFirstHandoff,
    followingDueDate,
    completeTurn
}