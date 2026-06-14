import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET /api/me/plan-readiness
// Returns "how fresh is the data Ion will use to rebuild your plan?" — used by
// the renewal freshness gate. Each item: { value, daysAgo, fresh }.
// Thresholds: weight + measurements 7d, InBody 6 weeks (42d).
export async function GET(req: Request) {
  const { user, error } = await getAuthenticatedUser(req)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [latestRes, latestCircumferenceRes, profileRes] = await Promise.all([
    admin.from('measurements').select('weight_kg, date').eq('user_id', user.id).not('weight_kg', 'is', null).order('date', { ascending: false }).limit(1).maybeSingle(),
    admin.from('measurements').select('waist_cm, chest_cm, hips_cm, date').eq('user_id', user.id).order('date', { ascending: false }).limit(10),
    admin.from('profiles').select('body_fat_pct, muscle_mass_kg, bmr_kcal, updated_at').eq('user_id', user.id).maybeSingle(),
  ])

  const now = Date.now()
  const daysBetween = (d?: string | null) => (d ? Math.floor((now - new Date(d).getTime()) / 86400000) : null)

  // Weight: from latest measurement row with a non-null weight
  const weightDays = daysBetween(latestRes.data?.date)
  // Circumferences: first row with any of waist/chest/hips
  const firstCirc = latestCircumferenceRes.data?.find(r => r.waist_cm != null || r.chest_cm != null || r.hips_cm != null)
  const circDays = daysBetween(firstCirc?.date)
  // InBody: profile has body_fat_pct or muscle_mass_kg; date = inbody_updated_at if present else profile.updated_at
  const inbodyPresent = profileRes.data?.body_fat_pct != null || profileRes.data?.muscle_mass_kg != null
  const inbodyDays = inbodyPresent ? daysBetween(profileRes.data?.updated_at) : null

  return NextResponse.json({
    weight: {
      value: latestRes.data?.weight_kg ?? null,
      daysAgo: weightDays,
      fresh: weightDays != null && weightDays <= 7,
    },
    measurements: {
      waist_cm: firstCirc?.waist_cm ?? null,
      chest_cm: firstCirc?.chest_cm ?? null,
      hips_cm: firstCirc?.hips_cm ?? null,
      daysAgo: circDays,
      fresh: circDays != null && circDays <= 7,
    },
    inbody: {
      present: inbodyPresent,
      body_fat_pct: profileRes.data?.body_fat_pct ?? null,
      muscle_mass_kg: profileRes.data?.muscle_mass_kg ?? null,
      bmr_kcal: profileRes.data?.bmr_kcal ?? null,
      daysAgo: inbodyDays,
      // InBody scans are accessed less often (gym visits), so 6 weeks is fresh.
      fresh: inbodyDays != null && inbodyDays <= 42,
    },
  })
}
