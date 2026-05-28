/**
 * Unified push notification helper.
 * Tries Expo Push (uses stored device tokens — free, no config) first.
 * Falls back to OneSignal if Expo has no token for the user and OneSignal is configured.
 *
 * All server-side push calls should import from here, not from onesignal.ts directly.
 */

import { sendPushToUser } from '@/lib/expo-push'
import { sendPushNotification, oneSignalEnabled, VALID_PUSH_TYPES, type PushType } from '@/lib/onesignal'

const PUSH_TEMPLATES: Record<PushType, { title: string; body: string }> = {
  morning_checkin:      { title: '☀️ Good morning — Ion checking in',  body: "How are you feeling today? Log your breakfast and let's get moving." },
  pre_workout:          { title: '💪 Workout time',                     body: "Your training session is scheduled. Ion's got your programme ready." },
  meal_reminder:        { title: '🥗 Time to log your meal',            body: "Don't forget to track what you eat. Every entry helps Ion optimise your plan." },
  measurement_reminder: { title: '📏 Weekly measurements due',          body: 'Log your measurements so Ion can track your body composition progress.' },
  plateau_alert:        { title: '📊 Ion detected a plateau',           body: "Your weight hasn't changed in 2 weeks. Ion wants to adjust your plan." },
  streak_milestone:     { title: '🔥 Streak milestone!',                body: "You're on a roll. Ion has something to say about your consistency." },
  plan_renewal:         { title: '🔄 Plan renewal in 3 days',           body: 'Ion is preparing your next phase. Stay consistent this week.' },
  ion_message:          { title: '⚡ Ion has a message for you',         body: 'Open to see what Ion noticed about your progress.' },
}

interface PushOptions {
  userId: string
  type: PushType
  overrides?: { title?: string; body?: string; url?: string }
}

export async function pushToUser({ userId, type, overrides }: PushOptions) {
  const template = PUSH_TEMPLATES[type]
  const title = overrides?.title || template.title
  const body  = overrides?.body  || template.body
  const url   = overrides?.url   || `/(tabs)/chat`

  // ── Primary: Expo Push (stored device tokens, no config needed) ──────────
  const expoResult = await sendPushToUser(userId, { title, body, data: { url, type } })
  if (expoResult.ok) return expoResult

  // ── Fallback: OneSignal ───────────────────────────────────────────────────
  if (oneSignalEnabled && VALID_PUSH_TYPES.includes(type)) {
    return sendPushNotification({ userId, type, overrides })
  }

  return expoResult // { ok: false, reason: 'no_token' } — user hasn't enabled push yet
}
