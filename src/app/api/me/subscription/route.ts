import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { effectivePlan } from '@/lib/subscription'

// GET /api/me/subscription
// Returns the authenticated user's effective plan tier using the service-role
// key so RLS never blocks the read.
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_name, plan_type, status, trial_ends_at, current_period_ends_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const tier = effectivePlan(sub)

  return NextResponse.json({
    tier,
    status:   sub?.status   ?? null,
    planName: sub?.plan_name ?? null,
  })
}
