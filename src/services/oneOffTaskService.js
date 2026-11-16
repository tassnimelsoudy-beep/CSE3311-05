import { supabase } from '../lib/supabase.js'

async function getCompletedOneOffTaskIds(resourceIds) {
  if (resourceIds.length === 0) return []

  try {
    const { data, error } = await supabase
      .from('one_off_task_completions')
      .select('resource_id')
      .in('resource_id', resourceIds)

    if (error) throw error
    return data.map(completion => completion.resource_id)
  } catch (error) {
    console.error('Error retrieving completed one-off tasks:', error.message)
    return null
  }
}

async function completeOneOffTask(resourceId, participantId) {
  if (!resourceId || !participantId) {
    return { completed: false, error: 'Could not verify the task or your group profile.' }
  }

  try {
    const { error } = await supabase
      .from('one_off_task_completions')
      .insert({
        resource_id: resourceId,
        completed_by: participantId,
      })

    if (error?.code === '23505') {
      return { completed: true, error: null }
    }
    if (error) throw error
    return { completed: true, error: null }
  } catch (error) {
    console.error('Error completing one-off task:', error.message)
    return { completed: false, error: 'Could not complete this task. Try again.' }
  }
}

export { completeOneOffTask, getCompletedOneOffTaskIds }
