import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { getSparksBalance, SPARK_REWARDS, type SparkRewardType } from '@/lib/sparks'

/**
 * POST /api/me/sparks/redeem  { reward: 'elite_3d' | 'elite_7d' | 'elite_30d' }
 *
 * Converts Sparks into free Elite days via profiles.bonus_elite_until.
 *
 * Banking rule: the bonus window starts from the LATEST of now / existing
 * bonus / the paid subscription's current period end. A paying subscriber's
 * redemption therefore lands AFTER their paid period instead of burning
 * silently underneath it — redeeming is never a waste, and it doubles as a
 * churn safety-net (cancel → your banked days kick in).
 *
 * Concurrency: the ledger insert is the source of truth. We deduct first,
 * then re-check the balance; if a concurrent redemption drove it negative we
 * roll our row back and 409. No cross-request locking needed.
 */
export async function POST(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()

  const body = await req.json().catch(() => ({}))
  const rewardKey = String(body?.reward || '') as SparkRewardType
  const reward = SPARK_REWARDS[rewardKey]
  if (!reward) return NextResponse.json({ error: 'Unknown reward' }, { status: 400 })

  const { data: langRow } = await admin.from('users').select('language').eq('id', user.id).maybeSingle()
  const ar = langRow?.language === 'ar'

  const balance = await getSparksBalance(admin, user.id)
  if (balance < reward.cost) {
    return NextResponse.json({
      error: ar
        ? `تحتاج ${reward.cost} شرارة لهذه المكافأة — رصيدك ${balance}.`
        : `You need ${reward.cost} Sparks for this reward — you have ${balance}.`,
    }, { status: 400 })
  }

  // Deduct (negative ledger row). ref_id unique per redemption attempt.
  const redemptionRef = `redeem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const { error: deductErr } = await admin.from('loyalty_points').insert({
    user_id: user.id,
    event_type: 'redemption',
    points: -reward.cost,
    ref_id: redemptionRef,
  })
  if (deductErr) return NextResponse.json({ error: deductErr.message }, { status: 500 })

  // Re-check for concurrent double-spend; roll back our row if overdrawn.
  const after = await getSparksBalance(admin, user.id)
  if (after < 0) {
    await admin.from('loyalty_points').delete()
      .eq('user_id', user.id).eq('event_type', 'redemption').eq('ref_id', redemptionRef)
    return NextResponse.json({
      error: ar ? 'رصيدك غير كافٍ.' : 'Insufficient balance.',
    }, { status: 409 })
  }

  // Grant days: base = latest of now / existing bonus / paid period end.
  const [{ data: profile }, { data: sub }] = await Promise.all([
    admin.from('profiles').select('bonus_elite_until').eq('user_id', user.id).maybeSingle(),
    admin.from('subscriptions').select('status, current_period_ends_at').eq('user_id', user.id).maybeSingle(),
  ])
  const candidates = [Date.now()]
  const existingBonus = profile?.bonus_elite_until ? new Date(profile.bonus_elite_until).getTime() : 0
  if (existingBonus) candidates.push(existingBonus)
  const paidEnd = sub?.current_period_ends_at ? new Date(sub.current_period_ends_at).getTime() : 0
  if (paidEnd && ['active', 'trial', 'cancelled', 'past_due'].includes(sub?.status || '')) candidates.push(paidEnd)
  const base = Math.max(...candidates)
  const bonusUntil = new Date(base + reward.days * 86400000).toISOString()

  const { error: grantErr } = await admin.from('profiles')
    .update({ bonus_elite_until: bonusUntil })
    .eq('user_id', user.id)
  if (grantErr) {
    // Refund on grant failure so the user never pays for nothing.
    await admin.from('loyalty_points').delete()
      .eq('user_id', user.id).eq('event_type', 'redemption').eq('ref_id', redemptionRef)
    return NextResponse.json({ error: grantErr.message }, { status: 500 })
  }

  await admin.from('loyalty_redemptions').insert({
    user_id: user.id,
    reward_type: rewardKey,
    points_spent: reward.cost,
    days_granted: reward.days,
  })

  // Ion confirms in chat so the reward feels personal.
  const untilDate = bonusUntil.slice(0, 10)
  await admin.from('chat_messages').insert({
    user_id: user.id,
    role: 'assistant',
    content: ar
      ? `⚡ استبدلت ${reward.cost} شرارة بـ${reward.days} ${reward.days === 3 ? 'أيام' : reward.days === 7 ? 'أيام' : 'يوماً'} Elite مجانية — مفعّلة حتى ${untilDate}. استمتع بكل الميزات، واستمر في كسب الشرارات بكل تمرين تسجّله.`
      : `⚡ You redeemed ${reward.cost} Sparks for ${reward.days} free Elite days — active until ${untilDate}. Enjoy the full toolkit, and keep earning Sparks with every workout you log.`,
    message_type: 'text',
    metadata: { sparks_redemption: true, reward: rewardKey, days: reward.days },
  }).then(() => {}, () => {})

  return NextResponse.json({
    ok: true,
    reward: rewardKey,
    daysGranted: reward.days,
    bonusEliteUntil: bonusUntil,
    balance: after,
  })
}
