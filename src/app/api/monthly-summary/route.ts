import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    const [profileRes, measurementsRes, workoutLogsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('measurements').select('*').eq('user_id', user.id).gte('date', thirtyDaysAgo).order('date'),
      supabase.from('workout_log').select('*').eq('user_id', user.id).gte('logged_at', `${thirtyDaysAgo}T00:00:00`),
    ])

    const profile = profileRes.data
    const measurements = measurementsRes.data || []
    const workoutLogs = workoutLogsRes.data || []

    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

    const firstWeight = measurements[0]?.weight_kg
    const lastWeight = measurements[measurements.length - 1]?.weight_kg
    const weightChange = firstWeight && lastWeight ? (lastWeight - firstWeight).toFixed(1) : null

    const prompt = `You are Ion, an AI personal trainer generating a monthly coaching summary card for ${profile.name}.

Data from the past 30 days:
- Workouts completed: ${workoutLogs.length}
- Avg workout duration: ${workoutLogs.length ? Math.round(workoutLogs.reduce((s: number, l: any) => s + (l.duration_min || 0), 0) / workoutLogs.length) : 0} min
- Weight change: ${weightChange !== null ? `${weightChange}kg` : 'no data'}
- Goal: ${profile.goal}
- Language: ${profile.language || 'en'}

Write a monthly summary in ${profile.language === 'ar' ? 'Arabic' : 'English'} as Ion. Make it personal, data-driven, and motivating. Max 4 sentences. Include what went well, one honest observation, and one focus for next month. Do NOT use generic phrases.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const summary = (message.content[0] as any).text

    return NextResponse.json({
      summary,
      stats: {
        workouts: workoutLogs.length,
        weightChange,
        avgDuration: workoutLogs.length
          ? Math.round(workoutLogs.reduce((s: number, l: any) => s + (l.duration_min || 0), 0) / workoutLogs.length)
          : 0,
        measurementCount: measurements.length,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
