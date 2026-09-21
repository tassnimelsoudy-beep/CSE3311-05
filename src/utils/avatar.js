// Helpers for initials avatars, used anywhere a person is shown.

const AVATAR_COLORS = ['#1f6b5c', '#b4552d', '#5b5fa8', '#8a5a2b', '#2f7a9c', '#9a3f6b']

// "Sarah Miller" -> "SM", "alex" -> "A"
function getInitials(name)
{
    if (!name || !name.trim()) {
        return '?'
    }
    const parts = name.trim().split(/\s+/)
    const first = parts[0][0]
    const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
    return (first + last).toUpperCase()
}

// Picks a stable color for a name, so the same person always gets the same color.
function getAvatarColor(name)
{
    let hash = 0
    for (const char of name || '') {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// The name to show for a logged-in user: participant name if we have it,
// otherwise the name they signed up with, otherwise their email before the @.
function getDisplayName(participant, user)
{
    return participant?.name
        || user?.user_metadata?.name
        || user?.email?.split('@')[0]
        || 'You'
}

export { getInitials, getAvatarColor, getDisplayName }
