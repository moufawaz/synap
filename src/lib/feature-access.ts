import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getUserSubscription, isLaunchMode, isProUser } from '@/lib/subscription'

export async function requireFoodScanAccess() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

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
