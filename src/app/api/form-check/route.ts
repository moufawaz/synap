import { createServerClient } from '@/lib/supabase-server'
import { recordAiUsage } from '@/lib/ai-usage'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const exercise = String(body.exercise ?? 'exercise').slice(0, 80)
  const image = String(body.image ?? '')
  const mimeType = String(body.mimeType ?? 'image/jpeg')

  if (!image || !mimeType.startsWith('image/')) {
    return NextResponse.json(
      { error: 'Upload a clear photo or screenshot frame from the lift. Video analysis will use selected frames in a later release.' },
      { status: 400 },
    )
  }

  const client = new Anthropic({ apiKey })
  const prompt = `You are Ion, a strict but supportive personal trainer. Analyze this ${exercise} form from one image frame.

Return ONLY valid JSON:
{
  "score": number from 1 to 10,
  "summary": "one direct sentence",
  "fixes": ["3 short technical fixes"],
  "safety": "one injury-risk note",
  "next_set_cue": "one cue the athlete should remember on the next set"
}

Do not diagnose medical conditions. If the image is unclear, say that clearly and give safe general cues.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: image.replace(/^data:[^,]+,/, ''),
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  })

  await recordAiUsage({ userId: user.id, feature: 'form_check', model: response.model, usage: response.usage })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Could not read form feedback. Try a clearer image.' }, { status: 422 })
  }

  try {
    return NextResponse.json({ feedback: JSON.parse(jsonMatch[0]) })
  } catch {
    return NextResponse.json({ error: 'Form feedback returned invalid data. Try again.' }, { status: 422 })
  }
}
