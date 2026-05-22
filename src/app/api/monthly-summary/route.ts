import { NextResponse } from 'next/server'
import { createAdminClient, createRouteClient, getAuthenticatedUser } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'
import { recordAiUsage } from '@/lib/ai-usage'
import { aiLanguageInstruction, aiLanguageName, normalizeAiLanguage } from '@/lib/ai-language'

async function fetchMonthlyWorkoutLogs(supabase: any, userId: string, thirtyDaysAgo: string) {
  const primary = await supabase
    .from('workout_log')
    .select('*')
    .eq('user_id', userId)
    .gte('date', thirtyDaysAgo)

  if (!primary.error) return primary

  return supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', `${thirtyDaysAgo}T00:00:00`)
}

function workoutDurationMinutes(log: any) {
  return Number(log?.duration_min ?? log?.duration_minutes ?? 0)
}

export async function GET(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    const client = new Anthropic()
    const supabase = await createRouteClient(req)
    const { user } = await getAuthenticatedUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    const admin = createAdminClient()
    const [profileRes, userLangRes, measurementsRes, workoutLogsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      admin.from('users').select('language').eq('id', user.id).maybeSingle(),
      supabase.from('measurements').select('*').eq('user_id', user.id).gte('date', thirtyDaysAgo).order('date'),
      fetchMonthlyWorkoutLogs(supabase, user.id, thirtyDaysAgo),
    ])

    const profile = profileRes.data
    const measurements = measurementsRes.data || []
    const workoutLogs = workoutLogsRes.data || []

    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })
    const language = normalizeAiLanguage(userLangRes.data?.language ?? profile.language)

    const firstWeight = measurements[0]?.weight_kg
    const lastWeight = measurements[measurements.length - 1]?.weight_kg
    const weightChange = firstWeight && lastWeight ? (lastWeight - firstWeight).toFixed(1) : null

    const prompt = `You are Ion, an AI personal trainer generating a monthly coaching summary card for ${profile.name}.

Data from the past 30 days:
- Workouts completed: ${workoutLogs.length}
- Avg workout duration: ${workoutLogs.length ? Math.round(workoutLogs.reduce((s: number, l: any) => s + workoutDurationMinutes(l), 0) / workoutLogs.length) : 0} min
- Weight change: ${weightChange !== null ? `${weightChange}kg` : 'no data'}
- Goal: ${profile.goal}
- Language: ${language}

${aiLanguageInstruction(language, 'the full monthly summary')}
Write a monthly summary in ${aiLanguageName(language)} as Ion. Make it personal, data-driven, and motivating. Max 4 sentences. Include what went well, one honest observation, and one focus for next month. Do NOT use generic phrases.`

    const message = await client.messages.create({
      model: process.env.ANTHROPIC_CHAT_MODEL || 'claude-sonnet-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    await recordAiUsage({ userId: user.id, feature: 'monthly_summary', model: message.model, usage: message.usage })

    const summary = (message.content[0] as any).text

    return NextResponse.json({
      summary,
      stats: {
        workouts: workoutLogs.length,
        weightChange,
        avgDuration: workoutLogs.length
          ? Math.round(workoutLogs.reduce((s: number, l: any) => s + workoutDurationMinutes(l), 0) / workoutLogs.length)
          : 0,
        measurementCount: measurements.length,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
