import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { recordAiUsage } from '@/lib/ai-usage'

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[analyze-inbody] ANTHROPIC_API_KEY not set')
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  const client = new Anthropic({ apiKey })

  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { inbody_url } = body

    if (!inbody_url || typeof inbody_url !== 'string') {
      return NextResponse.json({ error: 'Missing inbody_url' }, { status: 400 })
    }

    console.info('[analyze-inbody] Fetching uploaded InBody file')

    // Fetch the file from Supabase Storage public URL
    let fileResponse: Response
    try {
      fileResponse = await fetch(inbody_url, {
        signal: AbortSignal.timeout(30_000),
      })
    } catch (fetchErr: any) {
      console.error('[analyze-inbody] File fetch error:', fetchErr?.message)
      return NextResponse.json(
        { error: 'Could not download your InBody file. Please try again.' },
        { status: 400 },
      )
    }

    if (!fileResponse.ok) {
      console.error('[analyze-inbody] File fetch failed:', fileResponse.status)
      return NextResponse.json(
        { error: 'InBody file not accessible. Please re-upload and try again.' },
        { status: 400 },
      )
    }

    const contentType = fileResponse.headers.get('content-type') || ''
    const arrayBuffer = await fileResponse.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    const isPDF =
      contentType.includes('pdf') ||
      inbody_url.toLowerCase().includes('.pdf')

    const analysisPrompt = `You are analyzing an InBody body composition report. Extract ALL available data from this report.

Look for and extract:
1. Body Weight (kg)
2. Body Fat Mass (kg)
3. Body Fat Percentage (%)
4. Skeletal Muscle Mass (kg) or Lean Body Mass / Fat-Free Mass
5. BMR / Basal Metabolic Rate (kcal/day)
6. Visceral Fat Level or Area
7. Body Mass Index (BMI) if shown
8. Total Body Water (kg) if shown
9. InBody Score or fitness score if shown
10. Segmental muscle analysis - left arm, right arm, left leg, right leg, trunk (kg each) if visible
11. Any target/normal ranges shown alongside the values

After extracting, write exactly 2-3 sentences as a coaching summary. Be direct, specific to the numbers, and motivating - like a real trainer would say.

Return ONLY valid JSON (no markdown, no extra text) in this exact shape. Use null for anything not found:
{
  "body_weight_kg": number | null,
  "body_fat_kg": number | null,
  "body_fat_pct": number | null,
  "muscle_mass_kg": number | null,
  "bmr_kcal": number | null,
  "visceral_fat": number | null,
  "bmi": number | null,
  "body_water_kg": number | null,
  "inbody_score": number | null,
  "segmental": {
    "left_arm_kg": number | null,
    "right_arm_kg": number | null,
    "left_leg_kg": number | null,
    "right_leg_kg": number | null,
    "trunk_kg": number | null
  },
  "coaching_summary": "string"
}

If this is NOT an InBody report, or the image/PDF is too blurry or unclear to read, return exactly:
{"error": "Not a readable InBody report"}`

    // Build Anthropic message content based on file type
    let messageContent: Anthropic.MessageParam['content']

    if (isPDF) {
      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        } as any,
        { type: 'text', text: analysisPrompt },
      ]
    } else {
      const mediaType = (
        contentType.includes('png')
          ? 'image/png'
          : contentType.includes('webp')
          ? 'image/webp'
          : contentType.includes('gif')
          ? 'image/gif'
          : 'image/jpeg'
      ) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data,
          },
        },
        { type: 'text', text: analysisPrompt },
      ]
    }

    console.info('[analyze-inbody] Sending scan to vision model')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: messageContent }],
    })
    await recordAiUsage({ userId: user.id, feature: 'inbody_analysis', model: response.model, usage: response.usage })

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text : ''
    console.info('[analyze-inbody] Vision response received')

    // Extract JSON object from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[analyze-inbody] No JSON found in response')
      return NextResponse.json(
        { error: 'Could not parse analysis results. Please try a clearer image.' },
        { status: 422 },
      )
    }

    let analysisData: any
    try {
      analysisData = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error('[analyze-inbody] JSON parse failed:', parseErr)
      return NextResponse.json(
        { error: 'Analysis returned invalid data. Please try again.' },
        { status: 422 },
      )
    }

    if (analysisData.error) {
      return NextResponse.json({ error: analysisData.error }, { status: 422 })
    }

    // Attempt to persist body_fat_pct back to profile for Ion's system prompt
    // Only update columns that definitely exist in the profiles schema
    if (analysisData.body_fat_pct != null) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ body_fat_pct: analysisData.body_fat_pct })
        .eq('user_id', user.id)
      // Non-fatal: column might not exist in all environments
      if (profileErr) {
        console.warn('[analyze-inbody] Profile update skipped (non-fatal):', profileErr.message)
      }
    }

    return NextResponse.json({ success: true, data: analysisData })
  } catch (err: any) {
    console.error('[analyze-inbody] Unhandled error:', err?.message || err)

    if (err?.name === 'TimeoutError' || err?.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Download timed out. Please try again on a stable connection.' },
        { status: 408 },
      )
    }

    return NextResponse.json(
      { error: 'Analysis failed. Please ensure the image is clear and try again.' },
      { status: 500 },
    )
  }
}
