import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { recordAiUsage } from '@/lib/ai-usage'
import { withAnthropicRetry } from '@/lib/anthropic'
import { equipmentString } from '@/lib/plan-builder'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/swap-exercise
 * One-tap in-gym exercise swap. Given the exercise the user can't or won't do
 * right now (machine taken, joint niggle, just hates it today), return 3
 * equivalent alternatives that hit the same muscles, respect the user's
 * equipment / injuries / hated-exercise list, and keep roughly the same
 * sets × reps scheme.
 *
 * Haiku on purpose: this is a 3-item structured lookup the user is waiting
 * on mid-workout — speed (~2-3s) matters more than prose quality, and the
 * constraint space is small.
 *
 * Body: { exercise: { name, sets?, reps?, muscle_group? }, day_focus? }
 * Returns: { alternatives: [{ name, sets, reps, rest_sec, why }] }
 */
export async function POST(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const exercise = body?.exercise
  const name = String(exercise?.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Missing exercise name' }, { status: 400 })

  const admin = createAdminClient()
  const [{ data: profile }, { data: langRow }] = await Promise.all([
    admin.from('profiles')
      .select('gym_access, equipment, injuries, exercises_hated, training_style, training_experience')
      .eq('user_id', user.id).maybeSingle(),
    admin.from('users').select('language').eq('id', user.id).maybeSingle(),
  ])
  const ar = langRow?.language === 'ar'

  const prompt = `You are Ion, an expert personal trainer. The client is MID-WORKOUT and cannot do this exercise right now (machine taken, discomfort, or preference):

EXERCISE TO REPLACE: ${name}
${exercise?.muscle_group ? `Primary muscle: ${exercise.muscle_group}` : ''}
${exercise?.sets ? `Planned: ${exercise.sets} sets × ${exercise.reps ?? '?'} reps` : ''}
${body?.day_focus ? `Today's session focus: ${body.day_focus}` : ''}

CLIENT CONSTRAINTS:
- Location: ${profile?.gym_access ? 'full gym' : 'home'} | Equipment: ${equipmentString(profile || {})}
- Injuries to respect: ${profile?.injuries || 'none'}
- Exercises they HATE (never suggest): ${profile?.exercises_hated || 'none'}
- Experience: ${profile?.training_experience || 'intermediate'}

Give EXACTLY 3 alternatives that:
1. Target the SAME primary muscles with a similar movement pattern.
2. Use only available equipment.
3. Keep a similar sets × reps scheme (adjust reps slightly if mechanics demand).
4. Are actually different from each other (different equipment or angle).

${ar ? 'All "name" and "why" strings must be in Arabic.' : ''}
Return ONLY valid JSON:
{"alternatives":[{"name":"...","sets":${exercise?.sets ?? 4},"reps":"${exercise?.reps ?? '8-12'}","rest_sec":90,"why":"one short line on why this substitutes well"}]}`

  try {
    const client = new Anthropic()
    const message = await withAnthropicRetry(() => client.messages.create({
      model: process.env.ANTHROPIC_SWAP_MODEL || 'claude-haiku-4-5',
      max_tokens: 700,
      system: 'You respond with valid, complete JSON only. No markdown, no text outside the JSON object.',
      messages: [{ role: 'user', content: prompt }],
    }))
    await recordAiUsage({ userId: user.id, feature: 'exercise_swap', model: message.model, usage: message.usage })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('bad response shape')
    const parsed = JSON.parse(match[0])
    const alternatives = (Array.isArray(parsed?.alternatives) ? parsed.alternatives : [])
      .filter((a: any) => a && String(a.name || '').trim())
      .slice(0, 3)
      .map((a: any) => ({
        name: String(a.name).trim(),
        sets: Number(a.sets) || Number(exercise?.sets) || 4,
        reps: String(a.reps || exercise?.reps || '8-12'),
        rest_sec: Number(a.rest_sec) || 90,
        why: String(a.why || '').slice(0, 140),
      }))
    if (!alternatives.length) throw new Error('no alternatives returned')

    return NextResponse.json({ alternatives })
  } catch (err: any) {
    console.error('[swap-exercise]', err?.message || err)
    return NextResponse.json(
      { error: ar ? 'تعذّر إيجاد بدائل الآن — حاول مرة أخرى.' : "Couldn't find alternatives right now — try again." },
      { status: 500 },
    )
  }
}
