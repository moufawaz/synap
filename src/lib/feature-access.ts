import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase-server'
import { getUserSubscription, isLaunchMode, isProUser } from '@/lib/subscription'

export async function requireFoodScanAccess(req?: Request) {
  const { user, error } = await getAuthenticatedUser(req)

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (isLaunchMode()) {
    return { user, response: null }
  }

  const sub = await getUserSubscription(user.id)
  if (!isProUser(sub)) {
    return {
      user,
      response: NextResponse.json({ error: 'Pro plan required' }, { status: 403 }),
    }
  }

  return { user, response: null }
}
