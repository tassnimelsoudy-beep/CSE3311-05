// Pure helpers for showing activities: labels, dates, turn order, and the
// household summary. No database calls here, so they're easy to test.

const DAY_MS = 24 * 60 * 60 * 1000

// True if the activity is shared by taking turns.
function isRotation(activity)
{
    return (activity?.sharing_method || '').toLowerCase() === 'rotation'
}

// (1, "week") -> "Weekly", (2, "week") -> "Every 2 weeks"
function formatFrequency(value, unit)
{
    if (!value || !unit) {
        return null
    }
    if (value === 1) {
        const single = { hour: 'Hourly', day: 'Daily', week: 'Weekly', month: 'Monthly' }
        return single[unit] || `Every ${unit}`
    }
    return `Every ${value} ${unit}s`
}

function startOfDay(date)
{
    const copy = new Date(date)
    copy.setHours(0, 0, 0, 0)
    return copy
}

// Friendly due date: "Today", "Tomorrow", a weekday this week, or "Oct 3".
function formatDue(isoDate, now = new Date())
{
    if (!isoDate) {
        return null
    }
    const due = new Date(isoDate)
    const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY_MS)

    if (days < 0) return 'Overdue'
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days < 7) return due.toLocaleDateString('en-US', { weekday: 'long' })
    return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Reorders the turn list so the current person comes first, keeping the
// same cycle: [Alex, Sam, Jordan] with Sam current -> [Sam, Jordan, Alex].
function turnOrderFromCurrent(members, currentId)
{
    const index = members.findIndex(member => member.id === currentId)
    if (index <= 0) {
        return members
    }
    return [...members.slice(index), ...members.slice(0, index)]
}

// Everyone who shares at least one activity with the user, the user first.
function getHousehold(activities, me)
{
    const people = new Map()
    if (me) {
        people.set(me.id, { id: me.id, name: me.name, isYou: true })
    }

    for (const activity of activities) {
        for (const member of activity.members) {
            if (!people.has(member.id)) {
                people.set(member.id, { id: member.id, name: member.name, isYou: false })
            }
        }
    }

    return [...people.values()]
}

// The rotation that's due soonest, and whose turn it is.
function getNextUp(activities)
{
    let soonest = null
    for (const activity of activities) {
        const dueAt = activity.rotation?.next_rotation_at
        if (!isRotation(activity) || !dueAt) continue
        if (!soonest || new Date(dueAt) < new Date(soonest.rotation.next_rotation_at)) {
            soonest = activity
        }
    }
    if (!soonest) {
        return null
    }
    const person = soonest.members.find(m => m.id === soonest.rotation.current_participant_id)
    return person ? { activity: soonest, person } : null
}

// Rotations first (soonest due first), then everything else by name.
function sortActivities(activities)
{
    return [...activities].sort((a, b) => {
        const aDue = isRotation(a) && a.rotation?.next_rotation_at
        const bDue = isRotation(b) && b.rotation?.next_rotation_at
        if (aDue && bDue) return new Date(aDue) - new Date(bDue)
        if (aDue) return -1
        if (bDue) return 1
        return a.name.localeCompare(b.name)
    })
}

export {
    isRotation,
    formatFrequency,
    formatDue,
    turnOrderFromCurrent,
    getHousehold,
    getNextUp,
    sortActivities
}
