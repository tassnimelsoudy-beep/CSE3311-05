import { useCallback, useEffect, useState } from 'react'
import { getPendingInvites, acceptGroupInvite, declineGroupInvite } from '../services/groupService.js'

// Loads a participant's pending group invites and exposes accept/decline.
// Refreshes every minute, like the notifications. onAccepted reloads the user's groups.
export function useInvites(participantId, onAccepted) {
  const [invites, setInvites] = useState([])
  const [busyId, setBusyId] = useState(null)

  const reload = useCallback(async () => {
    if (!participantId) return
    const data = await getPendingInvites(participantId)
    if (data) setInvites(data)
  }, [participantId])

  useEffect(() => {
    reload()
    const interval = setInterval(reload, 60000)
    return () => clearInterval(interval)
  }, [reload])

  async function accept(invite) {
    setBusyId(invite.id)
    const result = await acceptGroupInvite(invite.id)
    if (result) await onAccepted?.()
    await reload()
    setBusyId(null)
  }

  async function decline(invite) {
    setBusyId(invite.id)
    await declineGroupInvite(invite.id)
    await reload()
    setBusyId(null)
  }

  return { invites, busyId, accept, decline, reload }
}