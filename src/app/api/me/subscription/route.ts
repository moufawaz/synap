import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase-server'
import { getUserSubscription, effectivePlan, getTrialDaysRemaining, isFreeTrial } from '@/lib/subscription'

// GET /api/me/subscription
// Returns the authenticated user's effective plan tier + trial info.
// Accepts web Supabase cookies or native mobile bearer tokens.
export async function GET(req: Request) {
  const { user, error } = await getAuthenticatedUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sub = await getUserSubscription(user.id)
  const tier = effectivePlan(sub)
  // The free 7-day signup trial (and paid LS trial) grant access without a paid
  // subscription — surface it so the app can show "Elite trial — N days left".
  const onTrial = isFreeTrial(sub) || sub?.status === 'trial'
  const trialDaysLeft = getTrialDaysRemaining(sub)

  return NextResponse.json({
    tier,
    status: sub?.status ?? null,
    planName: sub?.plan_name ?? null,
    isTrial: onTrial,
    trialDaysLeft,
  })
}
