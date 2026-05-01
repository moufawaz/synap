import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    const supabase = createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load user profile + active plans for context
    const [profileRes, workoutRes, dietRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('workout_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('diet_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('chat_messages').select('role, content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])

    const profile = profileRes.data
    const workoutPlan = workoutRes.data?.plan_json
    const dietPlan = dietRes.data?.plan_json
    const history = (historyRes.data || []).reverse()

    // Save user message
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'user',
      content: message,
    })

    const systemPrompt = buildSystemPrompt(profile, workoutPlan, dietPlan)

    // Build conversation history for Claude
    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    // Save assistant response
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: reply,
    })

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildSystemPrompt(profile: any, workoutPlan: any, dietPlan: any): string {
  return `You are Ion, an elite AI personal trainer and coach for SYNAP. You are talking to ${profile?.name || 'your client'}.

YOUR PERSONALITY:
- Direct, confident, and genuinely encouraging — like a real coach
- You know science but speak like a human, not a textbook
- You hold people accountable with warmth
- Short, punchy responses unless a detailed answer is truly needed
- Use the person's name naturally

CLIENT PROFILE:
${profile ? `Name: ${profile.name}, Age: ${profile.age}, Gender: ${profile.gender}
Goal: ${profile.goal} | Weight: ${profile.weight_kg}kg | Height: ${profile.height_cm}cm
Training days: ${profile.training_days}/week | Gym access: ${profile.gym_access}
Injuries: ${profile.injuries || 'None'} | Medical: ${profile.medical_conditions || 'None'}
Dietary: ${profile.dietary_preference?.join(', ') || 'No restrictions'}` : 'No profile loaded'}

THEIR CURRENT WORKOUT PLAN:
${workoutPlan ? JSON.stringify(workoutPlan, null, 2).slice(0, 1500) : 'No plan yet'}

THEIR CURRENT DIET PLAN:
${dietPlan ? `Daily targets: ${dietPlan.daily_calories} kcal, ${dietPlan.protein_g}g protein, ${dietPlan.carbs_g}g carbs, ${dietPlan.fat_g}g fat` : 'No plan yet'}

RULES:
- Never give generic advice — always reference their specific situation
- If asked to modify their plan, describe the modification clearly
- For medical questions, recommend consulting a doctor first
- Keep responses focused and conversational (2-4 sentences usually)
- If they're struggling, be encouraging but realistic`
}
