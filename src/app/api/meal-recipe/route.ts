import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 20

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Recipe generation is not configured.' }, { status: 503 })
  }

  try {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { meal } = await req.json()
    if (!meal) return NextResponse.json({ error: 'Missing meal.' }, { status: 400 })

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: `Create a practical cooking recipe for this exact diet-plan meal.

MEAL JSON:
${JSON.stringify(meal, null, 2)}

Rules:
- Use only the foods/ingredients listed in the meal, plus basic zero/low-calorie seasonings like salt, pepper, garlic, lemon, vinegar, herbs, spices, and calorie-free spray if needed.
- Preserve the planned portions and macros as much as possible.
- Make the steps specific to the listed ingredients, not generic.
- If an ingredient is already ready-to-eat, explain how to assemble it.
- Keep it simple for someone who may not know how to cook.
- Return ONLY valid JSON, no markdown.

JSON shape:
{
  "title": "Recipe name",
  "prep_time_min": 5,
  "cook_time_min": 15,
  "ingredients": ["exact amount + ingredient"],
  "steps": ["specific step 1", "specific step 2", "specific step 3"],
  "tips": "one practical cooking or meal-prep tip"
}`,
        },
      ],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const recipe = parseJsonObject(raw)
    if (!recipe?.title || !Array.isArray(recipe.steps)) {
      return NextResponse.json({ error: 'Invalid recipe response.' }, { status: 500 })
    }

    return NextResponse.json({ recipe })
  } catch (err: any) {
    console.error('Meal recipe error:', err?.message || err)
    return NextResponse.json({ error: 'Could not generate recipe.' }, { status: 500 })
  }
}

function parseJsonObject(raw: string): any | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    return JSON.parse(match ? match[0] : cleaned)
  } catch {
    return null
  }
}
