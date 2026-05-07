import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// POST /api/barcode/photo
// Body: { image: string }  — base64-encoded image (no data-URI prefix)
// Uses Claude Vision to identify a food product from its packaging photo
// and estimate its nutritional values.
export async function POST(req: Request) {
  try {
    const { image, mimeType = 'image/jpeg' } = await req.json()
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Image required' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType as any, data: image },
            },
            {
              type: 'text',
              text: `You are a nutrition database. Look at this food product packaging photo.

Identify the product and return ONLY a valid JSON object with no markdown:
{
  "name": "exact product name as shown on packaging",
  "brand": "brand name or null",
  "calories_per_100g": number,
  "protein_per_100g": number,
  "carbs_per_100g": number,
  "fat_per_100g": number,
  "serving_size_g": number (typical serving size),
  "confidence": "high" | "medium" | "low"
}

Rules:
- If nutrition facts are visible on the packaging, use them exactly
- If you recognise the product, use your knowledge of its nutrition
- If the image is unclear or not food, return { "error": "Cannot identify product" }
- serving_size_g: use what's shown on packaging, or a typical serving
- All nutrient values must be per 100g (convert from per-serving if needed)
- confidence: "high" if nutrition panel visible or product well-known, "medium" if recognised, "low" if estimated`,
            },
          ],
        },
      ],
    })

    const raw = (message.content[0] as any).text
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ product: null })

    const result = JSON.parse(match[0])

    if (result.error || !result.name || !result.calories_per_100g) {
      return NextResponse.json({ product: null, reason: result.error || 'Could not identify product' })
    }

    return NextResponse.json({
      product: {
        barcode:           'photo',
        name:              result.name,
        brand:             result.brand || undefined,
        calories_per_100g: Number(result.calories_per_100g) || undefined,
        protein_per_100g:  Number(result.protein_per_100g)  || undefined,
        carbs_per_100g:    Number(result.carbs_per_100g)    || undefined,
        fat_per_100g:      Number(result.fat_per_100g)      || undefined,
        serving_size_g:    Number(result.serving_size_g)    || 100,
        image_url:         undefined,
      },
      confidence:   result.confidence || 'medium',
      ai_estimated: true,
    })
  } catch (err: any) {
    console.error('[barcode/photo]', err?.message)
    return NextResponse.json({ product: null })
  }
}
