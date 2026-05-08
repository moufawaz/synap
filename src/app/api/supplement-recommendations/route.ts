import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getUserSubscription, effectivePlan } from '@/lib/subscription'

// GET /api/supplement-recommendations â€” returns latest recommendation for the user (Elite only)
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only Elite users can access supplement recommendations
  const sub = await getUserSubscription(user.id)
  const plan = effectivePlan(sub)
  if (plan !== 'elite') {
    return NextResponse.json({ error: 'Elite plan required', tier: plan }, { status: 403 })
  }

  const { data } = await supabase
    .from('supplement_recommendations')
    .select('id, cycle_number, recommendations, generated_at')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ recommendation: data || null })
}
