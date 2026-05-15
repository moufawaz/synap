import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getUserSubscription, effectivePlan, isLaunchMode } from '@/lib/subscription'
import { generateSupplementRecsIfElite } from '@/lib/supplement-gen'
import { normalizeAiLanguage } from '@/lib/ai-language'

function eliteGate(plan: string) {
  if (isLaunchMode()) return false // no gate in launch mode
  return plan !== 'elite'
}

// GET — fetch latest recommendations
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isLaunchMode()) {
    const sub = await getUserSubscription(user.id)
    if (eliteGate(effectivePlan(sub))) {
      return NextResponse.json({ error: 'Elite plan required', tier: effectivePlan(sub) }, { status: 403 })
    }
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

// POST — generate recommendations on demand (for users who have a plan but no recs yet)
export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })

  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isLaunchMode()) {
    const sub = await getUserSubscription(user.id)
    if (eliteGate(effectivePlan(sub))) {
      return NextResponse.json({ error: 'Elite plan required' }, { status: 403 })
    }
  }

  const admin = createAdminClient()
  const [profileRes, userLangRes, dietRes] = await Promise.all([
    admin.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    admin.from('users').select('language').eq('id', user.id).maybeSingle(),
    admin.from('diet_plans').select('plan_json').eq('user_id', user.id).eq('active', true).maybeSingle(),
  ])

  const profile = profileRes.data
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const language = normalizeAiLanguage(userLangRes.data?.language ?? profile.language)
  const dietPlan = dietRes.data?.plan_json ?? null
  const client = new Anthropic({ apiKey })

  try {
    await generateSupplementRecsIfElite(supabase, client, user.id, profile, dietPlan, language)
    // Fetch the newly created row
    const { data } = await supabase
      .from('supplement_recommendations')
      .select('id, cycle_number, recommendations, generated_at')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return NextResponse.json({ recommendation: data || null })
  } catch (err: any) {
    console.error('[supplement-recommendations POST]', err)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
