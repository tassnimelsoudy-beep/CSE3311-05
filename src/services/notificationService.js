
import { supabase } from '../lib/supabase.js'

// Get notifications belonging to the signed-in user
export async function getNotifications() {
  const { data: { user }, error: authError } =
    await supabase.auth.getUser()

  if (authError) throw authError
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, type, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

// Mark a notification as read
export async function markNotificationRead(notificationId) {
  const { data: { user }, error: authError } =
    await supabase.auth.getUser()

  if (authError) throw authError
  if (!user) throw new Error('You must be logged in.')

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error

  return data
}

// Mark all notifications as read
export async function markAllNotificationsRead() {
  const { data: { user }, error: authError } =
    await supabase.auth.getUser()

  if (authError) throw authError
  if (!user) throw new Error('You must be logged in.')

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) throw error

  return true
}
