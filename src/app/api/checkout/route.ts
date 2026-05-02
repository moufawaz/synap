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
      trialDays: 7,
    })

    return NextResponse.json({ url: checkoutUrl })
  } catch (err: any) {
    console.error('[Checkout] Error:', err?.message || err)
    return NextResponse.json(
      { error: 'Failed to create checkout. Please try again.' },
      { status: 500 }
    )
  }
}
