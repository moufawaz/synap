import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { profileData } = body

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prompt = buildPrompt(profileData)

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    let plan: any
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      plan = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent)
    } catch {
      console.error('JSON parse error, raw:', rawContent.slice(0, 200))
      return NextResponse.json({ error: 'Failed to parse plan' }, { status: 500 })
    }

    // Save workout plan
    const { data: workoutPlan } = await supabase.from('workout_plans').insert({
      user_id: user.id,
      plan_json: plan.workout_plan,
      active: true,
    }).select().single()

    // Save diet plan
    const { data: dietPlan } = await supabase.from('diet_plans').insert({
      user_id: user.id,
      plan_json: plan.diet_plan,
      active: true,
    }).select().single()

    // Save Ion's personal message as first chat message
    if (plan.ion_message) {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: plan.ion_message,
      })
    }

    return NextResponse.json({
      success: true,
      workout_plan_id: workoutPlan?.id,
      diet_plan_id: dietPlan?.id,
    })
  } catch (err: any) {
    console.error('Generate plan error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

function buildPrompt(p: any): string {
  const goalLabels: Record<string, string> = {
    lose_fat: 'Lose Body Fat',
    build_muscle: 'Build Muscle',
    recomposition: 'Body Recomposition (lose fat + gain muscle)',
    improve_fitness: 'Improve General Fitness',
    be_healthier: 'Improve Overall Health',
  }

  return `You are Ion, a world-class AI personal trainer and nutritionist. Create a complete, personalized 12-week fitness and nutrition plan for this specific person.

PERSON PROFILE:
- Name: ${p.name}
- Age: ${p.age}
- Gender: ${p.gender}
- Weight: ${p.weight_kg} kg
- Height: ${p.height_cm} cm
- Goal: ${goalLabels[p.goal] || p.goal}
- Goal Speed: ${p.goal_speed}
- Target: ${p.goal_target || 'Not specified'}
- Deadline: ${p.goal_date || 'No specific date'}

LIFESTYLE:
- Schedule: ${p.work_schedule}
- Hours: ${p.work_hours || 'Standard'}
- Wake: ${p.wake_time} | Sleep: ${p.sleep_time}
- Lunch: ${p.lunch_break || 'Flexible'}
- Stress: ${p.stress_level} | Sleep quality: ${p.sleep_quality}

TRAINING:
- Experience: ${p.currently_training === 'already' ? 'Currently training' : 'Starting fresh'}
- Current routine: ${p.current_training_desc || 'None'}
- Training location: ${p.gym_access || 'gym'}
- Equipment (if home): ${p.equipment || 'N/A'}
- Days/week: ${p.training_days}
- Session duration: ${p.session_duration} min
- Best time to train: ${p.training_time}
- Preferred style: ${p.training_style || 'mix'}
- Exercises to avoid: ${p.exercises_hated || 'None'}

NUTRITION:
- Foods loved: ${p.foods_loved}
- Foods hated: ${p.foods_hated || 'None'}
- Dietary restrictions: ${p.dietary_preference || 'None'}
- Allergies: ${p.allergies || 'None'}
- Meals per day: ${p.meals_per_day}
- Cooking ability: ${p.cooking_ability}
- Food budget: ${p.food_budget}

HEALTH:
- Injuries: ${p.injuries || 'None'}
- Medical conditions: ${p.medical_conditions || 'None'}
- Supplements: ${p.supplements || 'None'}

Generate a complete personalized plan. Respond with ONLY valid JSON in this exact structure (no markdown, no extra text):

{
  "summary": "2-3 sentence overview of the approach",
  "workout_plan": {
    "name": "Plan name (e.g. 'Power Hypertrophy Upper Lower')",
    "schedule": "X days/week",
    "split_type": "push_pull_legs / upper_lower / full_body / etc",
    "weeks": 12,
    "notes": "Key training principles for this person",
    "rest_days": ["list", "of", "rest", "days"],
    "days": [
      {
        "day_name": "Monday",
        "muscle_focus": "Push / Upper / Full Body / etc",
        "warmup_min": 10,
        "duration_min": 60,
        "exercises": [
          {
            "name": "Exercise Name",
            "sets": 4,
            "reps": "8-12",
            "rest_sec": 90,
            "weight_guidance": "Start moderate, RPE 7-8",
            "form_tip": "Key form cue in one sentence",
            "muscle_group": "Primary muscle"
          }
        ]
      }
    ]
  },
  "diet_plan": {
    "daily_calories": 2400,
    "protein_g": 180,
    "carbs_g": 240,
    "fat_g": 80,
    "water_l": 3.0,
    "approach": "e.g. Moderate caloric deficit of 400 kcal to promote fat loss",
    "pre_workout": "Suggested pre-workout meal timing and content",
    "post_workout": "Suggested post-workout meal timing and content",
    "meals": [
      {
        "name": "Breakfast",
        "time": "7:30 AM",
        "calories": 600,
        "protein_g": 40,
        "carbs_g": 70,
        "fat_g": 15,
        "description": "Short meal description",
        "foods": [
          {
            "item": "Specific food name",
            "amount": "80g / 1 cup / 2 slices",
            "calories": 300,
            "protein_g": 10,
            "carbs_g": 55,
            "fat_g": 5
          }
        ]
      }
    ]
  },
  "ion_message": "A warm, personal, motivating message from you (Ion) to this specific person. Reference their name, their specific goal, and something personal from their profile. 3-4 sentences. Sound like a real coach."
}`
}
