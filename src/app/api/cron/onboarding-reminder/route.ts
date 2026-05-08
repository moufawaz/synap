import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/resend'

/**
 * GET /api/cron/onboarding-reminder
 *
 * Runs daily at 10:00 UTC via Vercel Cron.
 * Finds users who:
 *   - Signed up more than 24 hours ago
 *   - Have NOT completed onboarding (no active workout_plan)
 *   - Are within the first 7 days (after that, let them be)
 *   - Have NOT already received this reminder
 *
 * Uses chat_messages (role='system', message_type='onboarding_reminder_sent')
 * as a lightweight sent-log — zero schema changes needed.
 * Also inserts an Ion chat message they can see and reply to.
 */

const REMINDER_TYPE = 'onboarding_reminder_sent'
const MIN_AGE_H     = 24   // wait at least 24 h before nudging
const MAX_AGE_DAYS  = 7    // stop nudging after 7 days

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV !== 'development'
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const now        = new Date()
  const minAgeDate = new Date(now.getTime() - MIN_AGE_H * 3600 * 1000).toISOString()
  const maxAgeDate = new Date(now.getTime() - MAX_AGE_DAYS * 86400 * 1000).toISOString()

  // ── 1. All auth users in the nudge window (1–7 days old) ──────
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const windowUsers = (authData?.users || []).filter(u =>
    u.created_at < minAgeDate &&   // older than 24 h
    u.created_at > maxAgeDate      // within 7 days
  )

  if (windowUsers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no_users_in_window' })
  }

  const userIds = windowUsers.map(u => u.id)

  // ── 2. Users who already have a plan (onboarded) ──────────────
  const { data: plannedData } = await admin
    .from('workout_plans')
    .select('user_id')
    .in('user_id', userIds)
    .eq('active', true)
  const plannedSet = new Set((plannedData || []).map((r: any) => r.user_id))

  // ── 3. Users who already received this reminder ────────────────
  const { data: remindedData } = await admin
    .from('chat_messages')
    .select('user_id')
    .in('user_id', userIds)
    .eq('role', 'system')
    .eq('message_type', REMINDER_TYPE)
  const remindedSet = new Set((remindedData || []).map((r: any) => r.user_id))

  // ── 4. Target = in window, no plan, not reminded yet ──────────
  const targets = windowUsers.filter(
    u => !plannedSet.has(u.id) && !remindedSet.has(u.id)
  )

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'all_already_reminded_or_onboarded' })
  }

  // ── 5. Fetch profiles in one batch ────────────────────────────
  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, name')
    .in('user_id', targets.map(u => u.id))
  const profileMap: Record<string, string> = {}
  for (const p of profiles || []) profileMap[p.user_id] = p.name

  // ── 6. Send reminders ─────────────────────────────────────────
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.synapfit.app'
  let sent = 0
  const errors: string[] = []

  for (const u of targets) {
    const name  = profileMap[u.id] || u.email?.split('@')[0] || 'Athlete'
    const email = u.email
    const daysSince = Math.floor((now.getTime() - new Date(u.created_at).getTime()) / 86400000)

    try {
      // Ion chat message (visible in their app inbox)
      await admin.from('chat_messages').insert({
        user_id:      u.id,
        role:         'assistant',
        content:      `Hey ${name} 👋 I've been waiting to build your plan! You signed up ${daysSince} day${daysSince !== 1 ? 's' : ''} ago but I still don't know your goals, schedule, or body metrics. It only takes 3 minutes — answer my questions and I'll build your personalised training and nutrition plan from scratch. Ready? 💪`,
        message_type: 'text',
      })

      // System marker — prevents duplicate reminders (invisible in chat UI)
      await admin.from('chat_messages').insert({
        user_id:      u.id,
        role:         'system',
        content:      '',
        message_type: REMINDER_TYPE,
        metadata:     { sentAt: now.toISOString(), daysSincSignup: daysSince },
      })

      // Email
      if (email) {
        await sendEmail({
          to:   email,
          type: 'onboarding_reminder',
          data: { name, daysSince, onboardingUrl: `${APP_URL}/onboarding` },
        }).catch(err => errors.push(`email:${u.id}:${err?.message}`))
      }

      sent++
    } catch (err: any) {
      errors.push(`user:${u.id}:${err?.message}`)
    }
  }

  return NextResponse.json({
    ok:       true,
    window:   windowUsers.length,
    onboarded: plannedSet.size,
    already_reminded: remindedSet.size,
    targeted: targets.length,
    sent,
    errors: errors.length > 0 ? errors : undefined,
  })
}
