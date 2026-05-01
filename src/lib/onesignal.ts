const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY

export const oneSignalEnabled =
  !!ONESIGNAL_APP_ID &&
  ONESIGNAL_APP_ID !== 'your_onesignal_app_id' &&
  !!ONESIGNAL_API_KEY &&
  ONESIGNAL_API_KEY !== 'your_onesignal_api_key'

export type PushType =
  | 'morning_checkin'
  | 'pre_workout'
  | 'meal_reminder'
  | 'measurement_reminder'
  | 'plateau_alert'
  | 'streak_milestone'
  | 'plan_renewal'
  | 'ion_message'

const PUSH_TEMPLATES: Record<PushType, { title: string; body: string; url: string }> = {
  morning_checkin: {
    title: '☀️ Good morning — Ion checking in',
    body: 'How are you feeling today? Log your breakfast and let\'s get moving.',
    url: '/chat',
  },
  pre_workout: {
    title: '💪 Workout time',
    body: 'Your training session is scheduled. Ion\'s got your programme ready.',
    url: '/workout/today',
  },
  meal_reminder: {
    title: '🥗 Time to log your meal',
    body: 'Don\'t forget to track what you eat. Every entry helps Ion optimise your plan.',
    url: '/nutrition',
  },
  measurement_reminder: {
    title: '📏 Weekly measurements due',
    body: 'Log your measurements so Ion can track your body composition progress.',
    url: '/measurements',
  },
  plateau_alert: {
    title: '📊 Ion detected a plateau',
    body: 'Your weight hasn\'t changed in 2 weeks. Ion wants to adjust your plan.',
    url: '/chat',
  },
  streak_milestone: {
    title: '🔥 Streak milestone!',
    body: 'You\'re on a roll. Ion has something to say about your consistency.',
    url: '/progress',
  },
  plan_renewal: {
    title: '🔄 Plan renewal in 3 days',
    body: 'Ion is preparing your next phase. Stay consistent this week.',
    url: '/plan',
  },
  ion_message: {
    title: '⚡ Ion has a message for you',
    body: 'Open to see what Ion noticed about your progress.',
    url: '/chat',
  },
}

interface SendPushOptions {
  userId: string       // OneSignal external user ID
  type: PushType
  overrides?: { title?: string; body?: string; url?: string }
}

export async function sendPushNotification({ userId, type, overrides }: SendPushOptions) {
  if (!oneSignalEnabled) {
    console.log('[OneSignal] Not configured — push skipped:', type)
    return { ok: false, reason: 'not_configured' }
  }

  const template = PUSH_TEMPLATES[type]
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    external_id: userId,
    include_aliases: { external_id: [userId] },
    target_channel: 'push',
    headings: { en: overrides?.title || template.title },
    contents: { en: overrides?.body || template.body },
    url: `https://synapfit.app${overrides?.url || template.url}`,
    ttl: 86400,
  }

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return { ok: res.ok, data }
  } catch (err) {
    console.error('[OneSignal] Push failed:', err)
    return { ok: false, error: err }
  }
}
