import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase-server'

const EVENT_LABELS: Record<string, string> = {
  subscription_created:         'Subscription started',
  subscription_updated:         'Plan updated',
  subscription_payment_success: 'Payment successful',
  subscription_cancelled:       'Subscription cancelled',
  subscription_expired:         'Subscription expired',
  subscription_payment_failed:  'Payment failed',
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('billing_events')
    .select('event_type, payload, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ events: [] })

  const events = (data || []).map((row: any) => {
    const attrs = row.payload?.data?.attributes || {}
    const amount = attrs.total ? (attrs.total / 100).toFixed(2) : null
    const currency = attrs.currency || 'SAR'
    return {
      type:   row.event_type,
      label:  EVENT_LABELS[row.event_type] || row.event_type,
      date:   row.created_at,
      amount: amount ? `${currency} ${amount}` : null,
      status: attrs.status || null,
    }
  })

  return NextResponse.json({ events })
}
