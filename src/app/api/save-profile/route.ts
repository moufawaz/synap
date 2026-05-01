import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { data: profileData } = body

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Upsert profile
    const profile = {
      user_id: user.id,
      name: profileData.name || '',
      age: parseInt(profileData.age) || 25,
      gender: profileData.gender || 'male',
      weight_kg: parseFloat(profileData.weight_kg) || 70,
      height_cm: parseFloat(profileData.height_cm) || 170,
      goal: profileData.goal || 'be_healthier',
      goal_target: profileData.goal_target || null,
      goal_date: profileData.goal_date || null,
      activity_level: profileData.currently_training === 'already' ? 'active' : 'sedentary',
      training_time: profileData.training_time || 'morning',
      training_days: parseInt(profileData.training_days) || 3,
      session_duration: parseInt(profileData.session_duration) || 60,
      gym_access: profileData.gym_access === 'gym',
      equipment: profileData.equipment ? profileData.equipment.split(',') : [],
      work_schedule: profileData.work_schedule || 'work',
      work_hours: profileData.work_hours || null,
      wake_time: profileData.wake_time || '7:30',
      sleep_time: profileData.sleep_time || '23:00',
      lunch_break_time: profileData.lunch_break || null,
      stress_level: profileData.stress_level || 'moderate',
      sleep_quality: profileData.sleep_quality || 'average',
      injuries: profileData.injuries || null,
      medical_conditions: profileData.medical_conditions || null,
      supplements: profileData.supplements ? profileData.supplements.split(',') : [],
      dietary_preference: profileData.dietary_preference ? profileData.dietary_preference.split(',') : [],
      allergies: profileData.allergies || null,
      foods_loved: profileData.foods_loved || '',
      foods_hated: profileData.foods_hated || '',
      meals_per_day: parseInt(profileData.meals_per_day) || 3,
      cooking_ability: profileData.cooking_ability || 'cook',
      food_budget: profileData.food_budget || 'moderate',
      training_experience: profileData.currently_training === 'already' ? 'intermediate' : 'beginner',
      ion_gender: profileData.ion_gender || 'male',
      goal_speed: profileData.goal_speed || null,
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'user_id' })

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Save ion_gender + language to users table
    await supabase.from('users').update({
      ion_gender: profileData.ion_gender || 'male',
      language: profileData.language || 'en',
    }).eq('id', user.id)

    // Save initial measurements if provided
    if (profileData.measurements && typeof profileData.measurements === 'object') {
      const m = profileData.measurements
      const measurement = {
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        weight_kg: parseFloat(m.weight_kg) || null,
        neck_cm: parseFloat(m.neck_cm) || null,
        shoulders_cm: parseFloat(m.shoulders_cm) || null,
        chest_cm: parseFloat(m.chest_cm) || null,
        bicep_left_cm: parseFloat(m.bicep_left_cm) || null,
        bicep_right_cm: parseFloat(m.bicep_right_cm) || null,
        forearm_left_cm: parseFloat(m.forearm_left_cm) || null,
        forearm_right_cm: parseFloat(m.forearm_right_cm) || null,
        waist_cm: parseFloat(m.waist_cm) || null,
        hips_cm: parseFloat(m.hips_cm) || null,
        thigh_left_cm: parseFloat(m.thigh_left_cm) || null,
        thigh_right_cm: parseFloat(m.thigh_right_cm) || null,
        calf_left_cm: parseFloat(m.calf_left_cm) || null,
        calf_right_cm: parseFloat(m.calf_right_cm) || null,
        wrist_cm: parseFloat(m.wrist_cm) || null,
        ankle_cm: parseFloat(m.ankle_cm) || null,
        body_fat_pct: parseFloat(m.body_fat_pct) || null,
      }

      await supabase.from('measurements').insert(measurement)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Save profile error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
