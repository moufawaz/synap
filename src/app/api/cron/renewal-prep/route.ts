import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Daily cron: 2 days before a user's plan cycle ends, Ion proactively asks for
 * a fresh weight in chat. The freshness gate at renew-time will still appear,
 * but most users will already have updated data by then.
 *
 * Add to vercel.json:
 *   { "path": "/api/cron/renewal-prep", "schedule": "0 9 * * *" }
 *
 * Idempotency: we skip if a renewal-prep nudge has already been written for
 * this user in the last 5 days (metadata.renewal_prep flag).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const now = new Date()
  const inTwoDays = new Date(now.getTime() + 2 * 86400000)
  // Match anything whose end_date is on the calendar day 2 days from now.
  const dayStart = new Date(inTwoDays); dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart.getTime() + 86400000)

  let sent = 0
  let skipped = 0
  let errors = 0

  for (const table of ['diet_plans', 'workout_plans'] as const) {
    const { data: plans, error } = await supabase
      .from(table)
      .select('user_id, end_date')
      .eq('active', true)
      .gte('end_date', dayStart.toISOString().slice(0, 10))
      .lt('end_date', dayEnd.toISOString().slice(0, 10))

    if (error) { errors++; continue }
    if (!plans?.length) continue

    const planLabel = table === 'diet_plans' ? 'nutrition' : 'training'

    for (const p of plans) {
      // Idempotency: skip if we already nudged this user in the last 5 days
      const since = new Date(Date.now() - 5 * 86400000).toISOString()
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', p.user_id)
        .gte('created_at', since)
        .contains('metadata', { renewal_prep: planLabel })
      if ((count ?? 0) > 0) { skipped++; continue }

      // User's language for the message
      const { data: profile } = await supabase.from('profiles').select('language, name').eq('user_id', p.user_id).maybeSingle()
      const ar = profile?.language === 'ar'
      const name = (profile?.name || '').split(' ')[0]

      const content = ar
        ? `${name ? `${name}، ` : ''}دورة ${planLabel === 'nutrition' ? 'التغذية' : 'التمرين'} الخاصة بك تنتهي بعد يومين. سجّل وزن اليوم سريعاً من *القياسات* حتى أعيد ضبط الخطة بدقة عند التجديد.`
        : `${name ? `${name}, ` : ''}your ${planLabel} cycle ends in 2 days. Drop today's weight into *Measurements* and I'll recalibrate the renewal around your current body.`

      const { error: insertErr } = await supabase.from('chat_messages').insert({
        user_id: p.user_id,
        role: 'assistant',
        content,
        message_type: 'suggestion',
        metadata: { renewal_prep: planLabel },
      })
      if (insertErr) errors++
      else sent++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors })
}
