import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import { getAnthropicClient, withAnthropicRetry } from '@/lib/anthropic'
import { recordAiUsage } from '@/lib/ai-usage'
import { NextResponse } from 'next/server'

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function num(value: any, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getMacros(dietPlan: any) {
  return {
    calories: num(dietPlan?.daily_calories ?? dietPlan?.calories_per_day),
    protein_g: num(dietPlan?.macros?.protein_g ?? dietPlan?.protein_g),
    carbs_g: num(dietPlan?.macros?.carbs_g ?? dietPlan?.carbs_g),
    fat_g: num(dietPlan?.macros?.fat_g ?? dietPlan?.fat_g),
  }
}

function parseJsonObject(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { situation } = await req.json().catch(() => ({}))
  const promptText = String(situation ?? '').trim()
  if (promptText.length < 2) {
    return NextResponse.json({ error: 'Tell Ion where or what you are ordering.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const today = todayKey()
  const [profileRes, dietRes, mealsRes] = await Promise.all([
    admin.from('profiles').select('goal, dietary_preference, food_allergies, food_preferences, language').eq('user_id', user.id).maybeSingle(),
    admin.from('diet_plans').select('plan_json').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('meals_log').select('description,calories_estimated,protein_g,carbs_g,fats_g').eq('user_id', user.id).eq('date', today),
  ])

  const targets = getMacros(dietRes.data?.plan_json ?? {})
  const eaten = (mealsRes.data ?? []).reduce((acc, log: any) => ({
    calories: acc.calories + num(log.calories_estimated),
    protein_g: acc.protein_g + num(log.protein_g),
    carbs_g: acc.carbs_g + num(log.carbs_g),
    fat_g: acc.fat_g + num(log.fats_g),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })

  const remaining = {
    calories: Math.max(targets.calories - eaten.calories, 0),
    protein_g: Math.max(targets.protein_g - eaten.protein_g, 0),
    carbs_g: Math.max(targets.carbs_g - eaten.carbs_g, 0),
    fat_g: Math.max(targets.fat_g - eaten.fat_g, 0),
  }

  const system = `You are Ion, SYNAP's practical nutrition coach. Help a global user eat out or order delivery while staying close to their daily macros.

Rules:
- Be global-first. Do not assume Saudi Arabia or any one country.
- The user may name a restaurant, cuisine, delivery app, buffet, airport, cafe, or vague situation.
- If exact menu data is not known, explicitly say the guidance is an estimate based on cuisine/menu patterns.
- Respect allergies, dietary preference, and goal.
- Give a specific best order, a safer alternative, what to avoid, portion guidance, and a macro estimate.
- Return ONLY valid JSON with this exact shape:
{
  "context_note": "short note about whether this is exact menu knowledge or an estimate",
  "best_order": {
    "title": "order name",
    "items": ["item 1", "item 2"],
    "why": "why it fits",
    "estimated_macros": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }
  },
  "backup_order": {
    "title": "alternative order",
    "items": ["item 1", "item 2"],
    "estimated_macros": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }
  },
  "avoid": ["2-4 things to avoid or limit"],
  "portion_rules": ["2-4 short portion rules"],
  "how_to_log": "one sentence with a practical logging name and estimate"
}`

  const userPrompt = `User is ordering/eating out: ${promptText}

Profile:
${JSON.stringify(profileRes.data ?? {}, null, 2)}

Daily targets:
${JSON.stringify(targets, null, 2)}

Already eaten today:
${JSON.stringify(eaten, null, 2)}

Remaining macros today:
${JSON.stringify(remaining, null, 2)}

Give the best order now.`

  try {
    const client = getAnthropicClient()
    const response = await withAnthropicRetry(() => client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }))
    await recordAiUsage({ userId: user.id, feature: 'eating_out_mode', model: response.model, usage: response.usage })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const recommendation = parseJsonObject(raw)
    if (!recommendation?.best_order) {
      return NextResponse.json({ error: 'Ion could not build an order. Try a clearer restaurant or cuisine.' }, { status: 422 })
    }

    return NextResponse.json({ recommendation, remaining, targets })
  } catch (err: any) {
    console.error('[eating-out] error:', err?.message || err)
    return NextResponse.json({ error: 'Could not generate eating-out guidance.' }, { status: 500 })
  }
}
