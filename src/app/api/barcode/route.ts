import { NextResponse } from 'next/server'

// Open Food Facts API — free, no key required
const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim()

  if (!code) {
    return NextResponse.json({ error: 'Missing barcode code' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${OFF_BASE}/${encodeURIComponent(code)}?fields=product_name,brands,nutriments,serving_size,image_front_thumb_url,image_url`,
      { headers: { 'User-Agent': 'SYNAP-App/1.0 (https://synapfit.app)' }, signal: AbortSignal.timeout(6000) }
    )

    if (!res.ok) {
      return NextResponse.json({ product: null })
    }

    const json = await res.json()

    if (json.status !== 1 || !json.product) {
      return NextResponse.json({ product: null })
    }

    const p = json.product
    const n = p.nutriments || {}

    // Extract per-100g values (Open Food Facts stores them in nutriments with _100g suffix)
    const calories_per_100g  = Number(n['energy-kcal_100g'] ?? n['energy-kcal']) || undefined
    const protein_per_100g   = Number(n['proteins_100g']    ?? n['proteins'])    || undefined
    const carbs_per_100g     = Number(n['carbohydrates_100g'] ?? n['carbohydrates']) || undefined
    const fat_per_100g       = Number(n['fat_100g']          ?? n['fat'])           || undefined

    // Serving size — parse "100g" / "1 bar (45g)" → grams
    let serving_size_g: number | undefined
    const servingRaw: string = p.serving_size || ''
    const servingMatch = servingRaw.match(/(\d+(?:\.\d+)?)\s*g/i)
    if (servingMatch) serving_size_g = parseFloat(servingMatch[1])

    const product = {
      barcode:          code,
      name:             p.product_name || 'Unknown product',
      brand:            p.brands || undefined,
      calories_per_100g,
      protein_per_100g,
      carbs_per_100g,
      fat_per_100g,
      serving_size_g,
      image_url:        p.image_front_thumb_url || p.image_url || undefined,
    }

    return NextResponse.json({ product })
  } catch (err: any) {
    console.error('[barcode] lookup error:', err?.message)
    return NextResponse.json({ product: null })
  }
}
