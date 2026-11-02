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

// Splits a clock label like "3 PM" or "3:30 PM" into its parts, so the AM/PM
// can be dropped when it would otherwise be repeated. The separator before
// AM/PM is a normal space in some browsers and a narrow one in others, so the
// match allows either.
function splitClock(label)
{
    const match = label.match(/^(.*?)[\s\u202f]*([AP]M)$/)
    return match ? { time: match[1], half: match[2] } : { time: label, half: '' }
}

// "3 PM" on the hour, "3:30 PM" otherwise. Seconds are never useful here.
function formatClock(date)
{
    const options = { hour: 'numeric' }
    if (date.getMinutes() !== 0) {
        options.minute = '2-digit'
    }
    return date.toLocaleTimeString('en-US', options)
}

// The day a reservation falls on, in the same words the due dates use:
// "Today", "Tomorrow", a weekday later this week, or "Nov 9".
function formatDayLabel(date, now = new Date())
{
    const days = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS)

    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days > 1 && days < 7) return date.toLocaleDateString('en-US', { weekday: 'long' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// A reservation's time window in words, replacing two full timestamps:
//   same day    -> "Today, 3 – 5 PM"      (AM/PM is written once)
//   across days -> "Today, 10 PM – Tomorrow, 8 AM"
// Returns null if either timestamp is unusable.
function formatReservationWindow(startsAt, endsAt, now = new Date())
{
    const start = new Date(startsAt)
    const end = new Date(endsAt)

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        return null
    }

    const from = splitClock(formatClock(start))
    const to = splitClock(formatClock(end))

    if (startOfDay(start).getTime() === startOfDay(end).getTime()) {
        // Morning to morning, or afternoon to afternoon: "3 – 5 PM" reads
        // better than "3 PM – 5 PM".
        const fromLabel = from.half === to.half ? from.time : `${from.time} ${from.half}`
        return `${formatDayLabel(start, now)}, ${fromLabel} – ${to.time} ${to.half}`
    }

    return `${formatDayLabel(start, now)}, ${from.time} ${from.half}`
        + ` – ${formatDayLabel(end, now)}, ${to.time} ${to.half}`
}

// True while a reservation is under way, so the row can say so instead of
// claiming the item is available.
function isReservationActive(reservation, now = new Date())
{
    if (!reservation) {
        return false
    }
    const start = new Date(reservation.starts_at)
    const end = new Date(reservation.ends_at)
    return start <= now && now < end
}

// The reservation happening right now, if there is one.
function getActiveReservation(activity, now = new Date())
{
    return (activity?.reservations || []).find(r => isReservationActive(r, now)) || null
}

// Who is allowed to edit or delete an activity.
// Only its creator (resources.created_by) may. An activity with no creator
// recorded is left open to everyone, so rows created before ownership existed
// don't become permanently stuck.
function canManage(activity, participantId)
{
    const owner = activity?.created_by
    return owner == null || owner === participantId
}

// The name of whoever created the activity, for "only X can edit this".
// Falls back to a generic phrase when the creator isn't among its members.
function getOwnerName(activity, participantId)
{
    const owner = activity?.created_by
    if (owner == null) {
        return null
    }
    if (owner === participantId) {
        return 'You'
    }
    const person = (activity.members || []).find(member => member.id === owner)
    return person ? person.name : 'another member'
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
    formatClock,
    formatDayLabel,
    formatReservationWindow,
    isReservationActive,
    getActiveReservation,
    canManage,
    getOwnerName,
    formatFrequency,
    formatDue,
    turnOrderFromCurrent,
    getHousehold,
    getNextUp,
    sortActivities
}
