import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireFoodScanAccess } from '@/lib/feature-access'
import { recordAiUsage } from '@/lib/ai-usage'

const client = new Anthropic()

// POST /api/barcode/estimate
// Body: { name: string }
// Uses Claude Haiku to estimate nutrition for a product name when barcode lookup fails
export async function POST(req: Request) {
  try {
    const gate = await requireFoodScanAccess()
    if (gate.response) return gate.response

    const { name } = await req.json()
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Product name required' }, { status: 400 })
    }

    const productName = name.trim().slice(0, 200)

    const prompt = `You are a nutrition database. Estimate the nutritional values per 100g for the food product: "${productName}".

Return ONLY a valid JSON object with no markdown, no explanation:
{
  "name": "cleaned product name",
  "brand": "brand name if identifiable, or null",
  "calories_per_100g": number,
  "protein_per_100g": number,
  "carbs_per_100g": number,
  "fat_per_100g": number,
  "serving_size_g": typical serving size in grams as a number,
  "confidence": "high" | "medium" | "low"
}

Rules:
- Use real nutritional data you know about this specific product if you know it
- If it's a branded product you know (e.g. Oreo, KitKat, Lay's chips), give exact values
- If it's a generic food category, give accurate average values
- serving_size_g should be the typical serving (e.g. 30 for chips, 100 for yogurt, 45 for a chocolate bar)
- All numbers must be realistic and non-zero for edible foods
- confidence: "high" if you know this specific product, "medium" if similar category, "low" if guessing`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    if (gate.user) {
      await recordAiUsage({ userId: gate.user.id, feature: 'food_manual_estimate', model: message.model, usage: message.usage })
    }

    const raw = (message.content[0] as any).text
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ product: null })

    const estimated = JSON.parse(match[0])

    // Validate required fields
    if (!estimated.calories_per_100g || !estimated.name) {
      return NextResponse.json({ product: null })
    }

    return NextResponse.json({
      product: {
        barcode:          'manual',
        name:             estimated.name,
        brand:            estimated.brand || undefined,
        calories_per_100g: Number(estimated.calories_per_100g) || undefined,
        protein_per_100g:  Number(estimated.protein_per_100g)  || undefined,
        carbs_per_100g:    Number(estimated.carbs_per_100g)    || undefined,
        fat_per_100g:      Number(estimated.fat_per_100g)      || undefined,
        serving_size_g:    Number(estimated.serving_size_g)    || 100,
        image_url:         undefined,
      },
      confidence:  estimated.confidence || 'medium',
      ai_estimated: true,
    })
  } catch (err: any) {
    console.error('[barcode/estimate]', err?.message)
    return NextResponse.json({ product: null })
  }
}
