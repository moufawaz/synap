import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'
import { sendEmail } from '@/lib/resend'
import { sendPushNotification } from '@/lib/onesignal'

const client = new Anthropic()

// POST /api/renew-plan — called by the adaptation-check job when a plan is expiring
export async function POST(req: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { planType }: { planType: 'diet' | 'workout' } = await req.json()
    if (!planType) return NextResponse.json({ error: 'Missing planType' }, { status: 400 })

    // Load profile + measurements
    const [profileRes, measureRes, oldPlanRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('measurements').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(4),
      supabase.from(planType === 'diet' ? 'diet_plans' : 'workout_plans')
        .select('*').eq('user_id', user.id).eq('active', true).single(),
    ])

    const profile = profileRes.data
    const recentMeasurements = measureRes.data || []

    const weightTrend = recentMeasurements.map((m: any) => `${m.date}: ${m.weight_kg}kg`).join(', ')

    const prompt = planType === 'diet'
      ? `You are Ion, an AI personal trainer. Generate an updated 4-week diet plan for this user based on their progress.

User: ${profile.name}, ${profile.age}yr, ${profile.gender}
Goal: ${profile.goal}
Current weight trend: ${weightTrend || 'No recent data'}
Daily calories: ${profile.goal === 'lose_weight' ? 'slight deficit' : profile.goal === 'gain_muscle' ? 'surplus' : 'maintenance'}
Dietary preference: ${profile.dietary_preference}
Meals per day: ${profile.meals_per_day}
Allergies: ${profile.allergies || 'none'}

Generate a refreshed diet plan as JSON. Return ONLY valid JSON with this structure:
{
  "name": "Plan name",
  "daily_calories": number,
  "macros": { "protein_g": number, "carbs_g": number, "fat_g": number },
  "hydration_liters": number,
  "weeks": [
    {
      "week": 1,
      "days": [
        {
          "day_name": "Monday",
          "total_calories": number,
          "meals": [
            {
              "meal_name": "Breakfast",
              "time": "7:00 AM",
              "calories": number,
              "protein_g": number,
              "foods": [{"name": "food", "amount": "quantity"}]
            }
          ]
        }
      ]
    }
  ],
  "notes": "Ion's coaching note"
}`
      : `You are Ion, an AI personal trainer. Generate an updated 6-week progressive workout plan for this user.

User: ${profile.name}, ${profile.age}yr, ${profile.gender}
Goal: ${profile.goal}
Equipment: ${profile.gym_access ? 'Full gym' : profile.equipment || 'Home'}
Sessions per week: ${profile.training_days}
Duration: ${profile.session_duration} min
Experience: intermediate (has been training)

Generate a progressive workout plan as JSON. Return ONLY valid JSON:
{
  "name": "Plan name",
  "days_per_week": number,
  "session_duration_min": number,
  "split_type": "push_pull_legs|upper_lower|full_body",
  "level": "intermediate",
  "progressive_overload": "overload strategy",
  "weeks": [
    {
      "week": 1,
      "focus": "Foundation",
      "days": [
        {
          "day_name": "Monday",
          "muscle_focus": "Chest & Triceps",
          "duration_min": number,
          "exercises": [
            {
              "name": "Bench Press",
              "sets": 4,
              "reps": "8-10",
              "rest_sec": 90,
              "muscle_group": "Chest",
              "form_tip": "tip",
              "weight_guidance": "guidance"
            }
          ]
        }
      ]
    }
  ],
  "notes": "Ion's note"
}`

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as any).text
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Failed to parse plan' }, { status: 500 })
    const planJson = JSON.parse(match[0])

    const table = planType === 'diet' ? 'diet_plans' : 'workout_plans'
    const durationWeeks = planType === 'diet' ? 4 : 6

    // Deactivate old plan
    await supabase.from(table).update({ active: false }).eq('user_id', user.id).eq('active', true)

    // Insert new plan
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + durationWeeks * 7 * 86400000).toISOString().split('T')[0]

    await supabase.from(table).insert({
      user_id: user.id,
      plan_json: planJson,
      active: true,
      start_date: startDate,
      end_date: endDate,
    })

    // Ion chat message
    const ionMessage = planType === 'diet'
      ? `Your new ${durationWeeks}-week diet plan is live, ${profile.name}. I've adjusted the calories and macros based on your recent progress. Check My Plan to see what's changed.`
      : `New workout programme unlocked, ${profile.name}. I've increased the intensity and adjusted exercises based on your training over the last ${durationWeeks} weeks. Time to level up.`

    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'ion',
      content: ionMessage,
      message_type: 'new_plan',
    })

    // Notifications
    await Promise.allSettled([
      sendEmail({ to: user.email!, type: 'new_plan', data: { name: profile.name, planType, weeks: durationWeeks } }),
      sendPushNotification({ userId: user.id, type: 'plan_renewal' }),
    ])

    return NextResponse.json({ ok: true, plan: planJson })
  } catch (err: any) {
    console.error('[renew-plan]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
