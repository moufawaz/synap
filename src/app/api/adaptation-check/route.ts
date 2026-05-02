import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'
import { sendPushNotification } from '@/lib/onesignal'
import { sendEmail } from '@/lib/resend'

// POST /api/adaptation-check
// Called daily (e.g., via Vercel Cron or external scheduler) for a specific user
// Also called from dashboard load for the current user
export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    const client = new Anthropic()
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const checks: string[] = []

    // 1. Load data
    const [profileRes, measurementsRes, workoutLogsRes, dietPlanRes, workoutPlanRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('measurements').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(10),
      supabase.from('workout_log').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(30),
      supabase.from('diet_plans').select('*').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('workout_plans').select('*').eq('user_id', user.id).eq('active', true).single(),
    ])

    const profile = profileRes.data
    if (!profile) return NextResponse.json({ ok: false, reason: 'no_profile' })

    const measurements = measurementsRes.data || []
    const workoutLogs = workoutLogsRes.data || []
    const dietPlan = dietPlanRes.data
    const workoutPlan = workoutPlanRes.data

    const issues: Array<{ type: string; message: string; priority: 'high' | 'medium' | 'low' }> = []

    // ── Check 1: Weight plateau ────────────────────────────
    if (measurements.length >= 4) {
      const recent = measurements.slice(0, 4).map((m: any) => m.weight_kg).filter(Boolean)
      if (recent.length >= 3) {
        const variance = Math.max(...recent) - Math.min(...recent)
        if (variance < 0.5 && profile.goal !== 'maintain') {
          issues.push({ type: 'plateau', message: 'Weight plateau detected — no change in 3+ measurements.', priority: 'high' })
          checks.push('plateau')
        }
      }
    }

    // ── Check 2: Diet plan expiring ────────────────────────
    if (dietPlan?.end_date) {
      const daysLeft = Math.round((new Date(dietPlan.end_date).getTime() - Date.now()) / 86400000)
      if (daysLeft <= 3 && daysLeft >= 0) {
        issues.push({ type: 'diet_renewal', message: `Diet plan expires in ${daysLeft} day(s).`, priority: 'high' })
        checks.push('diet_renewal')
        await sendEmail({ to: user.email!, type: 'plan_renewal_warning', data: { name: profile.name, planType: 'diet', daysLeft } })
        await sendPushNotification({ userId: user.id, type: 'plan_renewal' })
      }
    }

    // ── Check 3: Workout plan expiring ─────────────────────
    if (workoutPlan?.end_date) {
      const daysLeft = Math.round((new Date(workoutPlan.end_date).getTime() - Date.now()) / 86400000)
      if (daysLeft <= 3 && daysLeft >= 0) {
        issues.push({ type: 'workout_renewal', message: `Workout plan expires in ${daysLeft} day(s).`, priority: 'high' })
        checks.push('workout_renewal')
        if (!checks.includes('diet_renewal')) {
          await sendEmail({ to: user.email!, type: 'plan_renewal_warning', data: { name: profile.name, planType: 'workout', daysLeft } })
        }
      }
    }

    // ── Check 4: Low workout frequency ────────────────────
    const lastWeekLogs = workoutLogs.filter((l: any) => {
      const logDate = new Date(l.logged_at)
      return Date.now() - logDate.getTime() < 7 * 86400000
    })
    if (profile.training_days && lastWeekLogs.length < profile.training_days * 0.5) {
      issues.push({ type: 'low_frequency', message: `Only ${lastWeekLogs.length} workouts this week vs ${profile.training_days} planned.`, priority: 'medium' })
      checks.push('low_frequency')
    }

    // ── Check 5: No measurements in 2 weeks ───────────────
    if (measurements.length > 0) {
      const lastMeas = new Date(measurements[0].date)
      const daysSince = Math.round((Date.now() - lastMeas.getTime()) / 86400000)
      if (daysSince >= 14) {
        issues.push({ type: 'measurement_overdue', message: `No measurements logged in ${daysSince} days.`, priority: 'medium' })
        checks.push('measurement_overdue')
        await sendPushNotification({ userId: user.id, type: 'measurement_reminder' })
      }
    }

    // ── Check 6: Symmetry gap ─────────────────────────────
    if (measurements.length > 0) {
      const latest = measurements[0]
      const bicepGap = Math.abs((latest.bicep_left_cm || 0) - (latest.bicep_right_cm || 0))
      const thighGap = Math.abs((latest.thigh_left_cm || 0) - (latest.thigh_right_cm || 0))
      if (bicepGap > 1.5 || thighGap > 2) {
        issues.push({ type: 'symmetry', message: `Limb asymmetry detected: bicep gap ${bicepGap.toFixed(1)}cm, thigh gap ${thighGap.toFixed(1)}cm.`, priority: 'medium' })
        checks.push('symmetry')
      }
    }

    // ── Check 7: Streak milestone ─────────────────────────
    const uniqueDays = [...new Set(workoutLogs.map((l) =>
      new Date(l.logged_at).toDateString()
    ))]
    let streak = 0
    for (let i = 0; i < uniqueDays.length; i++) {
      const expected = new Date()
      expected.setDate(expected.getDate() - i)
      if (uniqueDays[i] === expected.toDateString()) {
        streak++
      } else {
        break
      }
    }
    if ([7, 14, 21, 30].includes(streak)) {
      issues.push({ type: 'streak_milestone', message: `${streak}-day workout streak! 🔥`, priority: 'low' })
      checks.push('streak_milestone')
      await sendPushNotification({ userId: user.id, type: 'streak_milestone', overrides: { body: `You've trained ${streak} days in a row! Ion is tracking every session.` } })
      await sendEmail({ to: user.email!, type: 'milestone', data: { name: profile.name, milestone: `${streak}-Day Streak`, message: `You've trained ${streak} days consecutively. Consistency is what separates good from great.` } })
    }

    // ── Generate Ion message if there are issues ───────────
    if (issues.length > 0) {
      const highPriority = issues.filter(i => i.priority === 'high')
      const issueText = issues.map(i => `- ${i.message}`).join('\n')

      const ionPrompt = `You are Ion, an AI personal trainer. Based on the following observations about ${profile.name}'s progress, write a short, direct coaching message (2-3 sentences max). Be like a sharp, caring human coach — not a robot. Use the user's name.

Observations:
${issueText}

User goal: ${profile.goal}
Language: ${profile.language || 'en'}`

      const aiMsg = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: ionPrompt }],
      })

      const ionContent = (aiMsg.content[0] as any).text

      // Determine message type
      const msgType = highPriority.length > 0 ? 'alert' : 'suggestion'

      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'ion',
        content: ionContent,
        message_type: msgType,
        metadata: { checks, issues: issues.map(i => i.type) },
      })

      if (highPriority.length > 0) {
        await sendPushNotification({ userId: user.id, type: 'ion_message', overrides: { body: ionContent.slice(0, 100) } })
      }
    }

    return NextResponse.json({ ok: true, checks, issues: issues.length })
  } catch (err: any) {
    console.error('[adaptation-check]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
