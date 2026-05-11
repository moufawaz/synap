import { createAdminClient } from './supabase-server'

type AppEventInput = {
  userId?: string | null
  eventType: string
  severity?: 'info' | 'warning' | 'error' | 'critical'
  source?: string
  message?: string
  metadata?: Record<string, any>
}

export async function recordAppEvent({
  userId = null,
  eventType,
  severity = 'info',
  source,
  message,
  metadata = {},
}: AppEventInput) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('app_events').insert({
      user_id: userId,
      event_type: eventType,
      severity,
      source,
      message,
      metadata,
    })
    if (error) console.warn('[app_events] insert failed:', error.message)
  } catch (err: any) {
    console.warn('[app_events] unavailable:', err?.message || err)
  }
}
