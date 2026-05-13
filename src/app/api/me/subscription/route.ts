import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getUserSubscription, effectivePlan } from '@/lib/subscription'

// GET /api/me/subscription
// Returns the authenticated user's effective plan tier.
// Uses getUserSubscription so free-trial users get 'elite' not 'starter'.
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sub = await getUserSubscription(user.id)
  const tier = effectivePlan(sub)

  return NextResponse.json({
    tier,
    status:   sub?.status   ?? null,
    planName: sub?.plan_name ?? null,
  })
}
