import { useCallback, useEffect, useState } from 'react'
import { getCurrentParticipant } from '../services/participantService.js'
import { advanceTurn } from '../services/rotationService.js'
import { getGroupsForUser, getGroupMembers } from "../services/groupService";
import { loadActivities, createRotatingActivity } from '../services/activityService.js'
import { loadActivitiesWithDemo } from '../services/demoService.js'
import { getDisplayName } from '../utils/avatar.js'
import { getHousehold, getNextUp } from '../utils/activity.js'
import TopNav from './TopNav.jsx'
import ActivityPanel from './ActivityPanel.jsx'
import NextUpBar from './NextUpBar.jsx'
import MembersPanel from './MembersPanel.jsx'
import AddResourceModal from './AddResourceModal.jsx'
import AddGroupModal from "./AddGroupModal"
import ManageGroupMembersModal from './ManageGroupMembersModal.jsx'
import Toast from './Toast.jsx'
import './Home.css'

export default function Home({ user }) {
  const [participant, setParticipant] = useState(null)
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null) //added
  const [activities, setActivities] = useState(null) // null while loading
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [showManageMembers, setShowManageMembers] = useState(false)
  const [groupMembers, setGroupMembers] = useState([])
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
        // setActivities([])
        setGroups([])
        setSelectedGroup(null)
        return
      }

      const userGroups = await getGroupsForUser(me.id)
      if (!active) return

      const availableGroups = userGroups || []
      setGroups(availableGroups)

      const initialGroup = availableGroups[0] || null
      setSelectedGroup(initialGroup)

      //const list = await loadActivitiesWithDemo(me)
      
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

  const showToast = useCallback(message => setToast({ id: Date.now(), message }), [])
  const hideToast = useCallback(() => setToast(null), [])
  const comingSoon = useCallback(feature => showToast(`${feature} will be available in a later version.`), [showToast])
  const closeModal = useCallback(() => setAdding(false), [])

  const name = getDisplayName(participant, user)
  const firstName = name.split(' ')[0]
  const meId = participant?.id
  const household = getHousehold(activities || [], participant ? { id: meId, name } : null)

  async function handleMarkDone(activity) {
    setBusyId(activity.id)
    const updated = await advanceTurn(activity.id)
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
    const created = await createRotatingActivity(values)
    if (!created) {
      return 'Couldn’t add the activity. Try again.'
    }
    const list = await loadActivities(meId, selectedGroup?.id)
    if (list) setActivities(list)
    setAdding(false)
    showToast(`Added ${values.name}.`)
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
      <TopNav name={name} onComingSoon={comingSoon} groups={groups} onCreateGroup={() => setShowAddGroupModal(true)} selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup}/>
      {/* i added group stuff above */}


      <main className="home-main">
        <h1 className="greeting">Hi, {firstName}</h1>

        <div className="home-grid">
          <div className="home-content">
            <ActivityPanel
              activities={activities}
              meId={meId}
              search={search}
              onSearch={setSearch}
              busyId={busyId}
              onMarkDone={handleMarkDone}
              onComingSoon={comingSoon}
            />
            <NextUpBar
              nextUp={getNextUp(activities || [])}
              meId={meId}
              onAdd={() => setAdding(true)}
              onComingSoon={comingSoon}
              disabled={!participant || activities === null}
            />
          </div>

          <MembersPanel household={groupMembers} email={user.email} onManageMembers={() => setShowManageMembers(true)} />
        </div>
      </main>

    
      {adding && (        
        <AddResourceModal household={groupMembers} meId={meId} groupId={selectedGroup?.id} onClose={closeModal} onCreate={handleCreate} />
      )}

      {showAddGroupModal && participant && (
      <AddGroupModal participant={participant} onClose={() => setShowAddGroupModal(false)} onGroupCreated={handleGroupCreated}/>
      )}

      {showManageMembers && (
      <ManageGroupMembersModal groupId={selectedGroup?.id} onClose={() => setShowManageMembers(false)}  onMembersChanged={loadHouseholdMembers}/>
      )}

      <Toast toast={toast} onDone={hideToast} />
    </div>
  )
}
