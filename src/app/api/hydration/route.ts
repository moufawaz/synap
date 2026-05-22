import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

function today() {
  return new Date().toISOString().split('T')[0]
}

function normalizeDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today()
}

export async function GET(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = normalizeDate(new URL(req.url).searchParams.get('date'))
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('hydration_log')
    .select('date,glasses,liters,target_liters,updated_at')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hydration: data || { date, glasses: 0 } })
}

export async function POST(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const date = normalizeDate(body.date)
  const glasses = Math.max(0, Math.min(30, Number(body.glasses) || 0))
  const targetLiters = body.target_liters == null ? null : Math.max(0, Number(body.target_liters) || 0)
  const liters = body.liters == null ? null : Math.max(0, Number(body.liters) || 0)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('hydration_log')
    .upsert({
      user_id: user.id,
      date,
      glasses,
      liters,
      target_liters: targetLiters,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
    .select('date,glasses,liters,target_liters,updated_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hydration: data })
}
