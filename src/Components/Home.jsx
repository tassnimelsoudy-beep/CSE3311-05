import { useCallback, useEffect, useState } from 'react'
import { updateAccount } from '../services/authService.js'
import { getCurrentParticipant, updateCurrentParticipantName } from '../services/participantService.js'
import { completeTurn } from '../services/rotationService.js'
import { getGroupsForUser, getGroupMembers } from "../services/groupService";
import { loadActivities, createRotatingActivity, createReservationActivity } from '../services/activityService.js'
import { createReservation, subscribeToReservationChanges } from '../services/reservationService.js'
import { getDisplayName } from '../utils/avatar.js'
import { getNextUp } from '../utils/activity.js'
import { useActivityEditing } from '../hooks/useActivityEditing.js'
import TopNav from './TopNav.jsx'
import ActivityPanel from './ActivityPanel.jsx'
import NextUpBar from './NextUpBar.jsx'
import RemindersPanel from './RemindersPanel.jsx'
import MembersPanel from './MembersPanel.jsx'
import NoGroupPrompt from './NoGroupPrompt.jsx'
import AddResourceModal from './AddResourceModal.jsx'
import ActivityDialogs from './ActivityDialogs.jsx'
import ReservationModal from './ReservationModal.jsx'
import AddGroupModal from "./AddGroupModal"
import ManageGroupMembersModal from './ManageGroupMembersModal.jsx'
import Toast from './Toast.jsx'
import ProfileModal from './ProfileModal.jsx'
import './Home.css'

export default function Home({ user }) {
  const [participant, setParticipant] = useState(null)
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null) //added
  const [activities, setActivities] = useState(null) // null while loading
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [reserving, setReserving] = useState(null)
  const [reservationBusyId, setReservationBusyId] = useState(null)
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [showManageMembers, setShowManageMembers] = useState(false)
  const [groupMembers, setGroupMembers] = useState([])
  const [groupsLoaded, setGroupsLoaded] = useState(false)
  const [groupPromptHidden, setGroupPromptHidden] = useState(false)
  const [showReminders, setShowReminders] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [accountUser, setAccountUser] = useState(user)
  const [toast, setToast] = useState(null)


  // Find this account's participant, then load (or, for a new account, create)
  // their household's activities.
  useEffect(() => {
    let active = true
    async function load() {
      const me = await getCurrentParticipant(user.id)
      if (!active) return
      setParticipant(me)
      if (!me) {
        setGroups([])
        setSelectedGroup(null)
        setGroupsLoaded(true)
        setToast({
          id: Date.now(),
          message: "Couldn’t load your participant profile. Please ask your project administrator to check participant setup.",
        })
        return
      }

      const userGroups = await getGroupsForUser(me.id)
      if (!active) return

      const availableGroups = userGroups || []
      setGroups(availableGroups)

      const initialGroup = availableGroups[0] || null
      setSelectedGroup(initialGroup)
      setGroupsLoaded(true)

      
    // Load activities for the selected group
      // if (initialGroup) {
      //   const list = await loadActivities(me.id, initialGroup.id)
      //   if (active) setActivities(list || [])
      // } else {
      //   setActivities([])
      // }
    }

    load()
    return () => {
      active = false
    }
  }, [user.id])

  useEffect(() => {
    let active = true

    async function loadGroupActivities() {
      if (!participant || !selectedGroup) {
        setActivities([])
        return
      }

      setActivities(null)

      const list = await loadActivities(participant.id, selectedGroup.id)

      if (active) {
        setActivities(list || [])
      }
    }

    loadGroupActivities()

    return () => {
      active = false
    }
  }, [participant, selectedGroup])

  useEffect(() => {
    if (!participant || !selectedGroup) return

    let active = true
    let refreshing = false
    async function refreshActivities() {
      if (refreshing) return
      refreshing = true
      try {
        const list = await loadActivities(participant.id, selectedGroup.id)
        if (active && list) {
          setActivities(list)
        }
      } finally {
        refreshing = false
      }
    }

    const unsubscribe = subscribeToReservationChanges(refreshActivities)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshActivities()
      }
    }, 10_000)
    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') {
        refreshActivities()
      }
    }
    window.addEventListener('focus', refreshActivities)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshActivities)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      unsubscribe()
    }
  }, [participant, selectedGroup])

  useEffect(() => {
    let active = true

    async function fetchGroupMembers() {
      if (!selectedGroup) {
        setGroupMembers([])
        return
      }

      const members = await getGroupMembers(selectedGroup.id)

      if (active) {
        setGroupMembers((members || []).map(member => ({...member, isYou: member.id === participant?.id})))
      }
      
    }

    fetchGroupMembers()

    return () => {
      active = false
    }
  }, [selectedGroup, participant])

  // Only nudge once we know the answer, and stop as soon as they're in a group
  // or have waved it off.
  const showGroupPrompt = groupsLoaded && groups.length === 0 && !groupPromptHidden

  const showToast = useCallback(message => setToast({ id: Date.now(), message }), [])
  const hideToast = useCallback(() => setToast(null), [])
  const comingSoon = useCallback(feature => showToast(`${feature} will be available in a later version.`), [showToast])
  const closeModal = useCallback(() => setAdding(false), [])
  const editor = useActivityEditing({ setActivities, showToast })

  const name = getDisplayName(participant, user)
  const firstName = name.split(' ')[0]
  const meId = participant?.id

  async function handleProfileSave({ name: nextName, email, password, currentPassword }) {
    const changedName = nextName !== participant?.name
    function applyParticipantName(updatedParticipant) {
      setParticipant(updatedParticipant)
      setGroupMembers(members => members.map(member =>
        member.id === updatedParticipant.id ? { ...member, name: updatedParticipant.name } : member
      ))
      setActivities(list => (list || []).map(activity => ({
        ...activity,
        members: (activity.members || []).map(member =>
          member.id === updatedParticipant.id ? { ...member, name: updatedParticipant.name } : member
        ),
        reservations: (activity.reservations || []).map(reservation =>
          reservation.participant_id === updatedParticipant.id
            ? { ...reservation, participants: { ...reservation.participants, name: updatedParticipant.name } }
            : reservation
        ),
      })))
    }

    let updatedParticipant = participant
    if (changedName) {
      updatedParticipant = await updateCurrentParticipantName(participant.id, user.id, nextName)
      if (!updatedParticipant) {
        return {
          error: 'Your group display name could not be saved, so no account settings were changed. Please try again or contact your administrator.',
        }
      }
    }

    const accountResult = await updateAccount({
      name: changedName ? nextName : '',
      email,
      password,
      currentPassword,
      userId: user.id,
    })
    if (accountResult.error) {
      if (changedName) {
        const reverted = await updateCurrentParticipantName(participant.id, user.id, participant.name)
        if (!reverted) {
          applyParticipantName(updatedParticipant)
          return {
            error: `${accountResult.error} Your group display name was saved but could not be rolled back; please contact your administrator.`,
          }
        }
      }
      return { error: accountResult.error }
    }

    if (changedName) {
      applyParticipantName(updatedParticipant)
    }
    if (accountResult.data?.user) {
      setAccountUser(current => ({
        ...current,
        ...accountResult.data.user,
        user_metadata: {
          ...current.user_metadata,
          ...accountResult.data.user.user_metadata,
        },
      }))
    }
    if (email) {
      return {
        message: 'Profile saved. Check your email to confirm the new address before it takes effect.',
      }
    }
    showToast('Profile updated.')
    setShowProfile(false)
    return {}
  }


async function handleMarkDone(activity) {
  // Only the person whose turn it is can pass it on
  if (activity.rotation?.current_participant_id !== meId) {
    showToast('Only the person whose turn it is can mark this done.')
    return
  }

  setBusyId(activity.id)
  const updated = await completeTurn(activity.id, meId)
  setBusyId(null)

  if (!updated) {
    showToast(`Couldn’t update ${activity.name}. Try again.`)
    return
  }
  // Update in place (no re-sort) so the row doesn't jump away from the pointer.
  setActivities(list => list.map(item => (item.id === activity.id ? { ...item, rotation: updated } : item)))
  const next = activity.members.find(member => member.id === updated.current_participant_id)
  const who = !next ? 'The next person is' : next.id === meId ? 'You’re' : `${next.name.split(' ')[0]} is`
  showToast(`Marked ${activity.name} done. ${who} up next.`)
}

  async function handleCreate(values) {
    if (!selectedGroup) {
      return 'Please select a group first.'
    }
    const created = values.sharingMethod === 'Reservation'
      ? await createReservationActivity(values)
      : await createRotatingActivity(values)
    if (!created) {
      return 'Couldn’t add the activity. Try again.'
    }
    const list = await loadActivities(meId, selectedGroup?.id)
    if (list) setActivities(list)
    setAdding(false)
    showToast(`Added ${values.name}.`)
    return null
  }

  async function handleReserve({ resource, startsAt, endsAt }) {
    setReservationBusyId(resource.id)
    const result = await createReservation({
      resourceId: resource.id,
      participantId: meId,
      startsAt,
      endsAt,
    })
    setReservationBusyId(null)

    if (result.error) return result.error

    const reservation = { ...result.reservation, participants: { id: meId, name } }
    setActivities(list => list.map(activity =>
      activity.id === resource.id
        ? { ...activity, reservations: [...(activity.reservations || []), reservation]
          .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)) }
        : activity
    ))
    setReserving(null)
    showToast(`Reserved ${resource.name}.`)
    return null
  }

  async function handleGroupCreated(newGroup) {
    if (!participant || !newGroup) return
    const fetched = (await getGroupsForUser(participant.id)) || []
    const list = fetched.filter(Boolean)
    const merged = list.some(g => g.id === newGroup.id) ? list : [...list, newGroup]
    setGroups(merged)
    setSelectedGroup(merged.find(g => g.id === newGroup.id))
  }

    // Reloads the user's groups (e.g. after accepting an invite) and keeps
  // the current selection if it still exists.
  async function reloadGroups() {
    if (!participant) return
    const fetched = ((await getGroupsForUser(participant.id)) || []).filter(Boolean)
    setGroups(fetched)
    setSelectedGroup(current =>
      fetched.find(g => g.id === current?.id) || fetched[0] || null
    )
  }

  async function loadHouseholdMembers() {
    if (!selectedGroup || !participant) {
      setGroupMembers([]);
      return;
    }

    const [members, list] = await Promise.all([
      getGroupMembers(selectedGroup.id),
      loadActivities(participant.id, selectedGroup.id)
    ]);

    setGroupMembers(
      (members || []).map(member => ({
          ...member,
          isYou: member.id === participant.id
      }))
    );

    setActivities(list || []);
  }

  return (
    <div className="home">
      <TopNav
        name={name}
        onComingSoon={comingSoon}
        participantId={meId}
        onGroupsChanged={reloadGroups}
        groups={groups}
        onCreateGroup={() => setShowAddGroupModal(true)}
        selectedGroup={selectedGroup}
        onSelectGroup={setSelectedGroup}
        onEditProfile={() => setShowProfile(true)}
      />

      <main className="home-main">
        <h1 className="greeting">Hi, {firstName}</h1>

        <div className="home-grid">
          <div className="home-content">
            {showGroupPrompt && (
              <NoGroupPrompt
                onCreateGroup={() => setShowAddGroupModal(true)}
                onDismiss={() => setGroupPromptHidden(true)}
              />
            )}
            <ActivityPanel
              activities={activities}
              meId={meId}
              search={search}
              onSearch={setSearch}
              busyId={busyId}
              reservationBusyId={reservationBusyId}
              onMarkDone={handleMarkDone}
              onEdit={editor.start}
              onReserve={setReserving}
            />
            <NextUpBar
              nextUp={getNextUp(activities || [])}
              meId={meId}
              onAdd={() => setAdding(true)}
              onComingSoon={comingSoon}
              onCheckUpcoming={() => setShowReminders(true)}
              disabled={!participant || activities === null}
            /> 
            {showReminders && (
  <RemindersPanel
    activities={activities}
    meId={meId}
    onClose={() => setShowReminders(false)}
  />
)}
            
          </div>

          <MembersPanel household={groupMembers} email={accountUser.email} onManageMembers={() => setShowManageMembers(true)} />
        </div>
      </main>

    
      {adding && (        
        <AddResourceModal household={groupMembers} meId={meId} groupId={selectedGroup?.id} onClose={closeModal} onCreate={handleCreate} />
      )}
      <ActivityDialogs editor={editor} />

      {reserving && (
        <ReservationModal
          resource={reserving}
          onClose={() => setReserving(null)}
          onReserve={handleReserve}
        />
      )}

      {showAddGroupModal && participant && (
      <AddGroupModal participant={participant} onClose={() => setShowAddGroupModal(false)} onGroupCreated={handleGroupCreated}/>
      )}

      {showProfile && participant && (
        <ProfileModal
          user={accountUser}
          participant={participant}
          onClose={() => setShowProfile(false)}
          onSave={handleProfileSave}
        />
      )}

      {showManageMembers && (
        <ManageGroupMembersModal
          groupId={selectedGroup?.id}
          currentParticipantId={meId}
          onClose={() => setShowManageMembers(false)}
          onMembersChanged={loadHouseholdMembers}
          onGroupsChanged={reloadGroups}
        />
      )}

      <Toast toast={toast} onDone={hideToast} />
    </div>
  )
}
