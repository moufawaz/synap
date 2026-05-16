import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/resend'

/**
 * GET /api/cron/onboarding-reminder
 *
 * Runs daily at 10:00 UTC via Vercel Cron.
 * Two-stage re-engagement for users who never completed onboarding:
 *
 *   Stage 1 — 24h reminder
 *     Triggered: user created > 24h ago and not yet reminded
 *     Sends:     Ion chat message + email (type: onboarding_reminder)
 *     Marker:    role='system', message_type='text', metadata.marker='onboarding_reminder_24h'
 *
 *   Stage 2 — 7-day reminder
 *     Triggered: user created ≥ 7 days ago and 7d reminder not yet sent
 *     Sends:     Ion chat message + email (type: onboarding_reminder_7d)
 *     Marker:    role='system', message_type='text', metadata.marker='onboarding_reminder_7d'
 *
 * Onboarding completion = having an active workout_plan row.
 * Markers are stored as invisible system messages (role='system') in chat_messages
 * using message_type='text' (to satisfy the DB check constraint) with the
 * marker identity in metadata.marker. Per run, each user gets at most one reminder.
 */

const MARKER_24H   = 'onboarding_reminder_24h'
const MARKER_7D    = 'onboarding_reminder_7d'
const MIN_AGE_H    = 24   // hours before first nudge
const STAGE2_DAYS  = 7    // days before second nudge
const MAX_AGE_DAYS = 12   // stop reminding after this many days

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

  // Outer window: users created between 24h ago and 12 days ago
  const windowStart = new Date(now.getTime() - MIN_AGE_H * 3600 * 1000).toISOString()
  const windowEnd   = new Date(now.getTime() - MAX_AGE_DAYS * 86400 * 1000).toISOString()

  // ── 1. Fetch all auth users in the nudge window ───────────────
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const windowUsers = (authData?.users || []).filter(u =>
    u.created_at < windowStart &&  // older than 24h
    u.created_at > windowEnd       // within 12 days
  )

  if (windowUsers.length === 0) {
    return NextResponse.json({ ok: true, sent_24h: 0, sent_7d: 0, reason: 'no_users_in_window' })
  }

  const userIds = windowUsers.map(u => u.id)

  // ── 2. Users who already completed onboarding (have an active plan) ──
  const { data: plannedData } = await admin
    .from('workout_plans')
    .select('user_id')
    .in('user_id', userIds)
    .eq('active', true)
  const plannedSet = new Set((plannedData || []).map((r: any) => r.user_id))

  // ── 3. Fetch all existing reminder markers in one query ───────
  // Markers are stored as role='system', message_type='text' with metadata.marker to
  // avoid violating the chat_messages_message_type_check DB constraint.
  const { data: markerData } = await admin
    .from('chat_messages')
    .select('user_id, metadata')
    .in('user_id', userIds)
    .eq('role', 'system')
    .eq('message_type', 'text')
    .not('metadata', 'is', null)

  const sent24hSet = new Set(
    (markerData || []).filter((r: any) => r.metadata?.marker === MARKER_24H).map((r: any) => r.user_id)
  )
  const sent7dSet = new Set(
    (markerData || []).filter((r: any) => r.metadata?.marker === MARKER_7D).map((r: any) => r.user_id)
  )

  // ── 4. Fetch profiles (name) in one batch ─────────────────────
  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, name')
    .in('user_id', userIds)
  const profileMap: Record<string, string> = {}
  for (const p of profiles || []) profileMap[p.user_id] = p.name

  // ── 5. Process each user ──────────────────────────────────────
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://synapfit.app'
  let sent24h = 0
  let sent7d   = 0
  const errors: string[] = []

  for (const u of windowUsers) {
    // Skip users who completed onboarding
    if (plannedSet.has(u.id)) continue

    const name       = profileMap[u.id] || u.email?.split('@')[0] || 'Athlete'
    const email      = u.email
    const ageMs      = now.getTime() - new Date(u.created_at).getTime()
    const daysSince  = Math.floor(ageMs / 86400000)
    const hoursSince = ageMs / 3600000

    try {
      // ── Stage 2: 7-day reminder (higher priority) ─────────────
      if (daysSince >= STAGE2_DAYS && !sent7dSet.has(u.id)) {
        // In-app Ion message
        await admin.from('chat_messages').insert({
          user_id:      u.id,
          role:         'assistant',
          content:      `${name}, it's been a week 🗓️\n\nI know life gets busy — but your personalised plan is still waiting for you here. While your free trial has been ticking away, I haven't been able to help yet.\n\nAnswer my questions (takes 3 minutes) and I'll build your complete training and nutrition system from scratch — calibrated to your goals, schedule, and body. Ready to start? 💪`,
          message_type: 'text',
        })

        // Invisible system marker — prevents sending this stage again
        // message_type must be 'text' to satisfy the DB check constraint;
        // the marker identity is stored in metadata.marker instead.
        await admin.from('chat_messages').insert({
          user_id:      u.id,
          role:         'system',
          content:      '',
          message_type: 'text',
          metadata:     { marker: MARKER_7D, sentAt: now.toISOString(), daysSince },
        })

        // Email
        if (email) {
          await sendEmail({
            to:   email,
            type: 'onboarding_reminder_7d',
            data: { name, daysSince, onboardingUrl: `${APP_URL}/onboarding` },
          }).catch(err => errors.push(`email_7d:${u.id}:${err?.message}`))
        }

        sent7d++
        continue // one reminder per cron run per user
      }

      // ── Stage 1: 24h reminder ──────────────────────────────────
      if (hoursSince >= MIN_AGE_H && !sent24hSet.has(u.id)) {
        // In-app Ion message
        await admin.from('chat_messages').insert({
          user_id:      u.id,
          role:         'assistant',
          content:      `Hey ${name} 👋 I've been waiting to build your plan!\n\nYou signed up ${daysSince} day${daysSince !== 1 ? 's' : ''} ago but I still don't know your goals, schedule, or body metrics. It only takes 3 minutes — answer my questions and I'll build your personalised training and nutrition plan from scratch.\n\nReady? 💪`,
          message_type: 'text',
        })

        // Invisible system marker — prevents sending this stage again
        // message_type must be 'text' to satisfy the DB check constraint;
        // the marker identity is stored in metadata.marker instead.
        await admin.from('chat_messages').insert({
          user_id:      u.id,
          role:         'system',
          content:      '',
          message_type: 'text',
          metadata:     { marker: MARKER_24H, sentAt: now.toISOString(), daysSince },
        })

        // Email
        if (email) {
          await sendEmail({
            to:   email,
            type: 'onboarding_reminder',
            data: { name, daysSince, onboardingUrl: `${APP_URL}/onboarding` },
          }).catch(err => errors.push(`email_24h:${u.id}:${err?.message}`))
        }

        sent24h++
      }
    } catch (err: any) {
      errors.push(`user:${u.id}:${err?.message}`)
    }
  }

  return NextResponse.json({
    ok:        true,
    window:    windowUsers.length,
    onboarded: plannedSet.size,
    sent_24h:  sent24h,
    sent_7d:   sent7d,
    errors:    errors.length > 0 ? errors : undefined,
  })
}
