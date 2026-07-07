import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { getSparksBalance, SPARK_EVENTS, SPARK_REWARDS } from '@/lib/sparks'

/**
 * GET /api/me/sparks
 * Balance + recent ledger + the reward/earning catalogs (server-owned so the
 * app never hardcodes prices — we can rebalance the economy without a build).
 */
export async function GET(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()

  const [balance, historyRes, profileRes] = await Promise.all([
    getSparksBalance(admin, user.id),
    admin.from('loyalty_points')
      .select('event_type, points, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin.from('profiles').select('bonus_elite_until').eq('user_id', user.id).maybeSingle(),
  ])

  return NextResponse.json({
    balance,
    history: historyRes.data || [],
    bonusEliteUntil: profileRes.data?.bonus_elite_until ?? null,
    rewards: SPARK_REWARDS,
    earning: SPARK_EVENTS,
  })
}
