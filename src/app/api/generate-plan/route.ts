import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { sendEmail } from '@/lib/resend'
import { resolveExerciseVideo } from '@/lib/youtube-search'
import { withAnthropicRetry } from '@/lib/anthropic'
import { estimateAnthropicCostUsd } from '@/lib/token-cost'
import { recordAiUsage } from '@/lib/ai-usage'

export async function POST(req: Request) {
  // Guard: API key must be set
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set')
    return NextResponse.json(
      { error: 'Ion is not configured. The ANTHROPIC_API_KEY environment variable is missing in your Vercel project settings.' },
      { status: 503 }
    )
  }

  const client = new Anthropic({ apiKey })

  try {
    const body = await req.json()
    const { profileData } = body

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prompt = buildPrompt(profileData)

    const message = await withAnthropicRetry(() => client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 16000,   // 8000 was too low; full plans with recipes easily exceed it
      system: 'You are Ion, a world-class AI personal trainer and nutritionist. You ALWAYS respond with valid, complete JSON only: no markdown, no explanation, no text before or after the JSON object.',
      messages: [{ role: 'user', content: prompt }],
    }))

    // Log finish_reason so truncation is visible in Vercel logs
    const finishReason = message.stop_reason
    console.info('[generate-plan] finish_reason:', finishReason, '| tokens:', message.usage)
    if (finishReason === 'max_tokens') {
      console.error('[generate-plan] Response was truncated; increase max_tokens further if this persists')
    }

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
    await recordAiUsage({
      userId: user.id,
      feature: 'generate_plan',
      model: message.model,
      usage: message.usage,
    })

    // Extract JSON using multiple strategies in order
    let plan: any
    try {
      plan = extractJSON(rawContent)
      if (!plan) throw new Error('no valid JSON found')
    } catch {
      console.error('[generate-plan] JSON parse failed. finish_reason:', finishReason)
      console.error('[generate-plan] Invalid response length:', rawContent.length)
      return NextResponse.json({ error: 'Ion returned an invalid plan format. Please try again.' }, { status: 500 })
    }

    // Enrich every exercise with a verified YouTube video ID
    // Run all lookups in parallel (static-map hits are instant; dynamic
    // searches run concurrently so the total wait is ~one search, not N).
    const allExercises: any[] = (plan.workout_plan?.days || []).flatMap(
      (day: any) => day.exercises || []
    )
    await Promise.all(
      allExercises.map(async (ex: any) => {
        try {
          ex.video_id = await Promise.race([
            resolveExerciseVideo(ex.name),
            new Promise<null>(res => setTimeout(() => res(null), 10_000)),
          ])
        } catch {
          ex.video_id = null
        }
      })
    )

    // Deactivate any existing plans first
    await Promise.all([
      supabase.from('workout_plans').update({ active: false }).eq('user_id', user.id),
      supabase.from('diet_plans').update({ active: false }).eq('user_id', user.id),
    ])

    // Save workout plan
    const { data: workoutPlan, error: wpError } = await supabase.from('workout_plans').insert({
      user_id: user.id,
      plan_json: plan.workout_plan,
      active: true,
    }).select().single()

    if (wpError) {
      console.error('Workout plan save error:', wpError)
      return NextResponse.json({ error: `Failed to save workout plan: ${wpError.message}` }, { status: 500 })
    }

    // Save diet plan
    const { data: dietPlan, error: dpError } = await supabase.from('diet_plans').insert({
      user_id: user.id,
      plan_json: plan.diet_plan,
      active: true,
    }).select().single()

    if (dpError) {
      console.error('Diet plan save error:', dpError)
      return NextResponse.json({ error: `Failed to save diet plan: ${dpError.message}` }, { status: 500 })
    }

    // Save Ion's personal message as first chat message
    if (plan.ion_message) {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: plan.ion_message,
        message_type: 'text',
        metadata: {
          usage: {
            model: message.model,
            input_tokens: message.usage.input_tokens,
            output_tokens: message.usage.output_tokens,
            cache_creation_input_tokens: message.usage.cache_creation_input_tokens || 0,
            cache_read_input_tokens: message.usage.cache_read_input_tokens || 0,
            estimated_cost_usd: estimateAnthropicCostUsd(message.usage, message.model),
            source: 'generate_plan',
          },
        },
      })
    }

    // Send welcome email (fire-and-forget; do not block response)
    if (user.email) {
      sendEmail({
        to: user.email,
        type: 'welcome',
        data: { name: profileData.name || 'Athlete' },
      }).catch(() => {}) // silently ignore email errors
    }

    return NextResponse.json({
      success: true,
      workout_plan_id: workoutPlan?.id,
      diet_plan_id: dietPlan?.id,
    })
  } catch (err: any) {
    console.error('Generate plan error:', err?.message || err)
    const raw = err?.message || ''
    let friendly = "Ion couldn't build your plan right now. Please try again."
    if (raw.includes('credit balance') || raw.includes('billing') || raw.includes('quota')) {
      friendly = "Plan generation is temporarily unavailable. Please try again shortly."
    } else if (raw.includes('overloaded') || raw.includes('rate_limit')) {
      friendly = "Ion is busy right now. Wait a moment and try again."
    }
    return NextResponse.json({ error: friendly }, { status: 500 })
  }
}

// JSON extraction with multiple strategies
function extractJSON(raw: string): any {
  // 1. Strip markdown code fences if present
  const stripped = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()

  // 2. Direct parse (ideal: model returned pure JSON)
  try { return JSON.parse(stripped) } catch {}

  // 3. Find the outermost { ... } block by tracking bracket depth
  //    This handles text before/after the JSON object.
  const start = stripped.indexOf('{')
  if (start !== -1) {
    let depth = 0
    let inString = false
    let escaped  = false
    for (let i = start; i < stripped.length; i++) {
      const ch = stripped[i]
      if (escaped)            { escaped = false; continue }
      if (ch === '\\')        { escaped = true;  continue }
      if (ch === '"')         { inString = !inString; continue }
      if (inString)           { continue }
      if (ch === '{')         { depth++ }
      if (ch === '}')         { depth--
        if (depth === 0) {
          try { return JSON.parse(stripped.slice(start, i + 1)) } catch {}
          break  // found the closing brace but it is still invalid; give up
        }
      }
    }
  }

  // 4. If truncated (max_tokens hit), attempt recovery by closing open brackets
  try {
    const recovered = repairTruncatedJSON(stripped.slice(stripped.indexOf('{')))
    if (recovered) return JSON.parse(recovered)
  } catch {}

  return null
}

/** Close any unclosed brackets/braces so a truncated JSON can be parsed. */
function repairTruncatedJSON(s: string): string | null {
  try {
    // Remove trailing partial string / comma / whitespace
    const trimmed = s.replace(/,\s*$/, '').replace(/"[^"]*$/, '"TRUNCATED"').trim()
    const stack: string[] = []
    let inString = false
    let escaped  = false
    for (const ch of trimmed) {
      if (escaped)            { escaped = false; continue }
      if (ch === '\\')        { escaped = true;  continue }
      if (ch === '"')         { inString = !inString; continue }
      if (inString)           { continue }
      if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']')
      if (ch === '}' || ch === ']') stack.pop()
    }
    return trimmed + stack.reverse().join('')
  } catch {
    return null
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

IMPORTANT: Respond with ONLY valid JSON. No markdown fences, no extra text before or after. Use this exact structure:

{
  "summary": "2-3 sentence overview of the approach",
  "workout_plan": {
    "name": "Plan name",
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
        "recipe": {
          "title": "Simple recipe name",
          "prep_time_min": 5,
          "cook_time_min": 15,
          "ingredients": ["Ingredient with exact amount from foods list"],
          "steps": ["Short practical cooking step 1", "Short practical cooking step 2", "Short practical cooking step 3"],
          "tips": "One helpful cooking or meal-prep tip for this user"
        },
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
  "ion_message": "A warm, personal, motivating message from Ion to this specific person. Reference their name, their specific goal, and something personal from their profile. 3-4 sentences. Sound like a real coach."
}`
}

