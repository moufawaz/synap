import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { createCheckout, VARIANT_IDS } from '@/lib/lemon-squeezy'

const VALID_VARIANTS = Object.values(VARIANT_IDS)

export async function POST(req: Request) {
  try {
    const { variantId } = await req.json()

    if (!variantId || !VALID_VARIANTS.includes(variantId)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load user name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', user.id)
      .single()

    const checkoutUrl = await createCheckout({
      variantId,
      userId: user.id,
      userEmail: user.email!,
      userName: profile?.name || '',
      // Trial is configured on the variant in Lemon Squeezy dashboard, not via API
    })

    return NextResponse.json({ url: checkoutUrl })
  } catch (err: any) {
    const msg = err?.message || String(err)
    console.error('[Checkout] Error:', msg)

    // Return the real error so the client can show it (helps diagnose LS API issues)
    let userFacing = msg
    if (msg.includes('LEMON_SQUEEZY_API_KEY')) userFacing = 'Payment system not configured. Add LEMON_SQUEEZY_API_KEY to Vercel env vars.'
    else if (msg.includes('No Lemon Squeezy stores')) userFacing = 'No store found. Check your Lemon Squeezy account has a store.'
    else if (msg.includes('Unauthorized') || msg.includes('401')) userFacing = 'Invalid API key. Check LEMON_SQUEEZY_API_KEY in Vercel env vars.'
    else if (msg.includes('404') || msg.includes('not found')) userFacing = 'Variant not found. Check the variant IDs in Vercel env vars.'

    return NextResponse.json({ error: userFacing }, { status: 500 })
  }
}
