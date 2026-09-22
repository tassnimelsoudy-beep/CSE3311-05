import { useCallback, useEffect, useState } from 'react'
import { getCurrentParticipant } from '../services/participantService.js'
import { advanceTurn } from '../services/rotationService.js'
import { loadActivities, createRotatingActivity } from '../services/activityService.js'
import { loadActivitiesWithDemo } from '../services/demoService.js'
import { getDisplayName } from '../utils/avatar.js'
import { getHousehold, getNextUp } from '../utils/activity.js'
import TopNav from './TopNav.jsx'
import ActivityPanel from './ActivityPanel.jsx'
import NextUpBar from './NextUpBar.jsx'
import MembersPanel from './MembersPanel.jsx'
import AddResourceModal from './AddResourceModal.jsx'
import Toast from './Toast.jsx'
import './Home.css'

export default function Home({ user }) {
  const [participant, setParticipant] = useState(null)
  const [activities, setActivities] = useState(null) // null while loading
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [adding, setAdding] = useState(false)
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
        setActivities([])
        return
      }
      const list = await loadActivitiesWithDemo(me)
      if (active) setActivities(list || [])
    }
    load()
    return () => {
      active = false
    }
  }, [user.id])

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
    const created = await createRotatingActivity(values)
    if (!created) {
      return 'Couldn’t add the activity. Try again.'
    }
    const list = await loadActivities(meId)
    if (list) setActivities(list)
    setAdding(false)
    showToast(`Added ${values.name}.`)
    return null
  }

  return (
    <div className="home">
      <TopNav name={name} onComingSoon={comingSoon} />

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

          <MembersPanel household={household} email={user.email} />
        </div>
      </main>

      {adding && (
        <AddResourceModal household={household} meId={meId} onClose={closeModal} onCreate={handleCreate} />
      )}
      <Toast toast={toast} onDone={hideToast} />
    </div>
  )
}
