import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { sendPushToUser } from '@/lib/expo-push'
import { sendPushNotification, oneSignalEnabled, VALID_PUSH_TYPES, type PushType } from '@/lib/onesignal'

// Push-notification payloads — mirrors OneSignal templates so both paths work
const PUSH_TEMPLATES: Record<PushType, { title: string; body: string; url: string }> = {
  morning_checkin:        { title: '☀️ Good morning — Ion checking in',    body: "How are you feeling today? Log your breakfast and let's get moving.",                      url: '/(tabs)/chat' },
  pre_workout:            { title: '💪 Workout time',                       body: "Your training session is scheduled. Ion's got your programme ready.",                     url: '/(tabs)/train' },
  meal_reminder:          { title: '🥗 Time to log your meal',              body: "Don't forget to track what you eat. Every entry helps Ion optimise your plan.",           url: '/(tabs)/nutrition' },
  measurement_reminder:   { title: '📏 Weekly measurements due',            body: 'Log your measurements so Ion can track your body composition progress.',                  url: '/(tabs)/progress' },
  plateau_alert:          { title: '📊 Ion detected a plateau',             body: "Your weight hasn't changed in 2 weeks. Ion wants to adjust your plan.",                  url: '/(tabs)/chat' },
  streak_milestone:       { title: '🔥 Streak milestone!',                  body: "You're on a roll. Ion has something to say about your consistency.",                     url: '/(tabs)/progress' },
  plan_renewal:           { title: '🔄 Plan renewal in 3 days',             body: 'Ion is preparing your next phase. Stay consistent this week.',                           url: '/plan' },
  ion_message:            { title: '⚡ Ion has a message for you',           body: 'Open to see what Ion noticed about your progress.',                                      url: '/(tabs)/chat' },
  general:                { title: 'SYNAP',                                 body: '',                                                                                        url: '/(tabs)' },
} as any

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, overrides }: { type: PushType | 'general'; overrides?: any } = await req.json()
    if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

    const template = (PUSH_TEMPLATES as any)[type] ?? PUSH_TEMPLATES['ion_message']
    const title = overrides?.title || template.title
    const body  = overrides?.body  || template.body
    const url   = overrides?.url   || template.url

    // ── Primary: Expo Push (free, no config needed, uses stored tokens) ──
    const expoResult = await sendPushToUser(user.id, { title, body, data: { url, type } })

    // ── Fallback: OneSignal (only if configured) ──
    let onesignalResult: any = null
    if (!expoResult.ok && expoResult.reason !== 'no_token' && oneSignalEnabled && VALID_PUSH_TYPES.includes(type as PushType)) {
      onesignalResult = await sendPushNotification({ userId: user.id, type: type as PushType, overrides })
    }

    // Record notification in DB
    const admin = createAdminClient()
    // Record notification in DB (non-fatal — fire and forget)
    void admin.from('notifications').insert({
      user_id: user.id,
      type,
      title,
      body,
      channel: 'push',
    })

    return NextResponse.json({
      ok: expoResult.ok || onesignalResult?.ok || false,
      expo: expoResult,
      onesignal: onesignalResult,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
