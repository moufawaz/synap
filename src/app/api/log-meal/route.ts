import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('meals_log')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('logged_at', { ascending: true })

  return NextResponse.json({ logs: data || [] })
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase.from('meals_log').insert({
    user_id: user.id,
    date: new Date().toISOString().split('T')[0],
    logged_at: new Date().toISOString(),
    ...body,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
