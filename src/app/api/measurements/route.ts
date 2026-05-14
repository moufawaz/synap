import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ measurements: data })
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Whitelist allowed fields — never let the client override user_id
  const insert: Record<string, any> = { user_id: user.id }
  const ALLOWED = [
    'date', 'weight_kg', 'body_fat_percentage', 'muscle_mass_kg',
    'chest_cm', 'waist_cm', 'hips_cm', 'left_arm_cm', 'right_arm_cm',
    'left_thigh_cm', 'right_thigh_cm', 'left_calf_cm', 'right_calf_cm',
    'neck_cm', 'shoulders_cm', 'notes', 'photo_url',
  ]
  for (const key of ALLOWED) {
    if (key in body && body[key] !== undefined) insert[key] = body[key]
  }

  const { data, error } = await supabase.from('measurements').insert(insert).select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ measurement: data })
}
