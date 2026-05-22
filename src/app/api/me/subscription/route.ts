import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase-server'
import { getUserSubscription, effectivePlan } from '@/lib/subscription'

// GET /api/me/subscription
// Returns the authenticated user's effective plan tier.
// Accepts web Supabase cookies or native mobile bearer tokens.
export async function GET(req: Request) {
  const { user, error } = await getAuthenticatedUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sub = await getUserSubscription(user.id)
  const tier = effectivePlan(sub)

  return NextResponse.json({
    tier,
    status: sub?.status ?? null,
    planName: sub?.plan_name ?? null,
  })
}
