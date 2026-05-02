import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'

// Called daily by Vercel Cron — sends trial day 5 & 6 reminders
// Add to vercel.json: { "crons": [{ "path": "/api/cron/trial-reminders", "schedule": "0 9 * * *" }] }

export async function GET(req: Request) {
  // Verify this is a Vercel cron request (or admin testing)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const now = new Date()
  const day5Start = new Date(now.getTime() + 2 * 86400000) // trial ends in 2 days
  const day5End   = new Date(day5Start.getTime() + 86400000)
  const day6Start = new Date(now.getTime() + 1 * 86400000) // trial ends in 1 day
  const day6End   = new Date(day6Start.getTime() + 86400000)

  // Find trials ending in exactly 2 days (day 5 reminder)
  const { data: day5Trials } = await supabase
    .from('subscriptions')
    .select('user_id, plan_name, billing_period, trial_ends_at')
    .eq('status', 'trial')
    .gte('trial_ends_at', day5Start.toISOString())
    .lt('trial_ends_at', day5End.toISOString())

  // Find trials ending in exactly 1 day (day 6 reminder)
  const { data: day6Trials } = await supabase
    .from('subscriptions')
    .select('user_id, plan_name, billing_period, trial_ends_at')
    .eq('status', 'trial')
    .gte('trial_ends_at', day6Start.toISOString())
    .lt('trial_ends_at', day6End.toISOString())

  let sent = 0

  // ── Day 5 reminders ──────────────────────────────────────
  for (const sub of day5Trials || []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id)
    const { data: profile } = await supabase.from('profiles').select('name').eq('user_id', sub.user_id).single()
    const name = profile?.name || 'Athlete'
    const email = authUser?.user?.email
    const planLabel = sub.plan_name === 'unlimited' ? 'Pro+Unlimited' : 'Pro'
    const renewsOn = new Date(sub.trial_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

    // Ion chat message
    await supabase.from('chat_messages').insert({
      user_id: sub.user_id,
      role: 'assistant',
      content: `⏰ Hey ${name}! Quick heads-up — your free trial ends in 2 days. If you love what SYNAP is doing for your training, no action needed — you'll be charged on Day 7 for your ${planLabel} plan. If you want to cancel and pay nothing, go to Settings → Billing. Zero charges, that's my promise. 💪`,
      message_type: 'text',
    })

    // Email
    if (email) {
      await sendEmail({
        to: email,
        type: 'trial_ending_day5',
        data: { name, planName: planLabel, renewsOn },
      }).catch(() => {})
    }
    sent++
  }

  // ── Day 6 reminders ──────────────────────────────────────
  for (const sub of day6Trials || []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id)
    const { data: profile } = await supabase.from('profiles').select('name').eq('user_id', sub.user_id).single()
    const name = profile?.name || 'Athlete'
    const email = authUser?.user?.email

    // Ion chat message
    await supabase.from('chat_messages').insert({
      user_id: sub.user_id,
      role: 'assistant',
      content: `🚨 ${name}, your trial ends TOMORROW. Last chance to cancel with zero charges — go to Settings → Billing before midnight. After that, your subscription activates and you get billed. If you're keeping it, you don't need to do anything. I'll be here either way. 🔥`,
      message_type: 'text',
    })

    if (email) {
      await sendEmail({
        to: email,
        type: 'trial_ending_day6',
        data: { name },
      }).catch(() => {})
    }
    sent++
  }

  return NextResponse.json({
    ok: true,
    day5Count: (day5Trials || []).length,
    day6Count: (day6Trials || []).length,
    totalSent: sent,
  })
}
