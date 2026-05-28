/**
 * Expo Push Notification Service
 * Free, no API key required — uses Expo tokens already stored in push_tokens table.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { createAdminClient } from '@/lib/supabase-server'

export interface ExpoPushMessage {
  to: string | string[]
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
  channelId?: string
}

export async function getExpoTokensForUser(userId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('provider', 'expo')
    .eq('enabled', true)
  return (data || []).map(r => r.token).filter(Boolean)
}

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<{ ok: boolean; results?: any[]; error?: string }> {
  if (!messages.length) return { ok: true, results: [] }

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[expo-push] HTTP error', res.status, text)
      return { ok: false, error: `HTTP ${res.status}` }
    }

    const json = await res.json()
    // Expo returns { data: [{ status, id, ... }] }
    const results: any[] = Array.isArray(json.data) ? json.data : [json.data]
    const failed = results.filter(r => r?.status === 'error')
    if (failed.length) {
      console.warn('[expo-push] Some pushes failed:', JSON.stringify(failed))
    }
    return { ok: true, results }
  } catch (err: any) {
    console.error('[expo-push] send error:', err?.message)
    return { ok: false, error: err?.message }
  }
}

/**
 * High-level helper: look up a user's Expo token(s) and send a push notification.
 * Returns { ok: false, reason: 'no_token' } when the user has no registered device.
 */
export async function sendPushToUser(
  userId: string,
  payload: Omit<ExpoPushMessage, 'to'>,
): Promise<{ ok: boolean; reason?: string; results?: any[] }> {
  const tokens = await getExpoTokensForUser(userId)
  if (!tokens.length) {
    console.info('[expo-push] No Expo token for user', userId)
    return { ok: false, reason: 'no_token' }
  }

  const messages: ExpoPushMessage[] = tokens.map(token => ({
    to: token,
    sound: 'default',
    ...payload,
  }))

  return sendExpoPush(messages)
}
