import { useEffect, useState } from 'react'
import { addParticipant, getAllParticipants } from '../services/participantService'

export default function ParticipantManager() {
  const [name, setName] = useState('')
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    const data = await getAllParticipants()
    if (data) setParticipants(data)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const created = await addParticipant(name.trim())
    setLoading(false)
    if (created) {
      setName('')
      refresh()
    }
  }

  return (
    <div>
      <h3>Participants</h3>
      <form onSubmit={handleAdd} style={{ marginBottom: 10 }}>
        <input placeholder="New participant name" value={name} onChange={e => setName(e.target.value)} />
        <button type="submit" disabled={loading}>Add</button>
      </form>

      <ul>
        {participants.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  )
}
