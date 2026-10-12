import { supabase } from '../lib/supabase.js'

// Returns active and upcoming reservations for a resource, or null on failure.
async function getReservationsForResource(resourceId) {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('id, resource_id, participant_id, starts_at, ends_at, participants(id, name)')
      .eq('resource_id', resourceId)
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error retrieving reservations:', error.message)
    return null
  }
}

// Returns { reservation, error }; the database exclusion constraint is the
// final guard against two simultaneous reservations for the same resource.
async function createReservation({ resourceId, participantId, startsAt, endsAt }) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (!resourceId || !participantId || !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) || end <= start || start <= new Date()) {
    return { reservation: null, error: 'Choose a future start and an end time after it.' }
  }

  try {
    const { data: conflict, error: conflictError } = await supabase
      .from('reservations')
      .select('id')
      .eq('resource_id', resourceId)
      .lt('starts_at', end.toISOString())
      .gt('ends_at', start.toISOString())
      .maybeSingle()

    if (conflictError) throw conflictError
    if (conflict) {
      return { reservation: null, error: 'That time conflicts with an existing reservation.' }
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        resource_id: resourceId,
        participant_id: participantId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      })
      .select('id, resource_id, participant_id, starts_at, ends_at')
      .single()

    if (error) {
      if (error.code === '23P01') {
        return { reservation: null, error: 'That time conflicts with an existing reservation.' }
      }
      throw error
    }
    return { reservation: data, error: null }
  } catch (error) {
    console.error('Error creating reservation:', error.message)
    return { reservation: null, error: 'Could not create the reservation. Try again.' }
  }
}

export { createReservation, getReservationsForResource }
