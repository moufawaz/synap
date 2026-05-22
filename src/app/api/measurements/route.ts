import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const admin = createAdminClient()
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin
    .from('measurements')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ measurements: data })
}

export async function POST(req: Request) {
  const admin = createAdminClient()
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const insert: Record<string, any> = { user_id: user.id }
  const allowed = [
    'date', 'weight_kg', 'body_fat_pct', 'muscle_mass_kg',
    'chest_cm', 'waist_cm', 'hips_cm',
    'bicep_left_cm', 'bicep_right_cm',
    'forearm_left_cm', 'forearm_right_cm',
    'thigh_left_cm', 'thigh_right_cm',
    'calf_left_cm', 'calf_right_cm',
    'neck_cm', 'shoulders_cm', 'wrist_cm', 'ankle_cm',
    'notes', 'photo_url',
  ]
  for (const key of allowed) {
    if (key in body && body[key] !== undefined) insert[key] = body[key]
  }

  const { data, error } = await admin.from('measurements').insert(insert).select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ measurement: data })
}
