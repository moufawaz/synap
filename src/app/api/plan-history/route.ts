import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type PlanType = 'diet' | 'workout'

export async function GET(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser(req)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [dietRes, workoutRes] = await Promise.all([
    admin.from('diet_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    admin.from('workout_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
  ])

  if (dietRes.error) return NextResponse.json({ error: dietRes.error.message }, { status: 500 })
  if (workoutRes.error) return NextResponse.json({ error: workoutRes.error.message }, { status: 500 })

  const diet = (dietRes.data || []).map(row => summarizePlan(row, 'diet'))
  const activeDietRow = (dietRes.data || []).find(row => row.active)
  const workoutRows = workoutRes.data || []
  const workout = workoutRows.map(row => summarizePlan(row, 'workout'))
  const activeWorkoutRow = workoutRows.find(row => row.active)

  return NextResponse.json({
    diet,
    workout,
    activeDietPlan: activeDietRow ? {
      id: activeDietRow.id,
      created_at: activeDietRow.created_at,
      plan_json: activeDietRow.plan_json,
    } : null,
    activeWorkoutPlan: activeWorkoutRow ? {
      id: activeWorkoutRow.id,
      created_at: activeWorkoutRow.created_at,
      plan_json: activeWorkoutRow.plan_json,
    } : null,
    timing: {
      diet: cycleTiming(diet.find(row => row.active), 'diet'),
      workout: cycleTiming(workout.find(row => row.active), 'workout'),
    },
    todayWorkout: summarizeTodayWorkout(activeWorkoutRow?.plan_json),
  })
}

function summarizePlan(row: any, planType: PlanType) {
  const plan = row.plan_json || {}
  const summary = planType === 'diet'
    ? {
        name: plan.name || plan.plan_name || 'Nutrition cycle',
        calories: plan.daily_calories ?? plan.calories_per_day ?? null,
        protein_g: plan.macros?.protein_g ?? plan.protein_g ?? null,
        carbs_g: plan.macros?.carbs_g ?? plan.carbs_g ?? null,
        fat_g: plan.macros?.fat_g ?? plan.fat_g ?? plan.fats_g ?? null,
        meals: Array.isArray(plan.meals) ? plan.meals.length : null,
      }
    : {
        name: plan.program_name || plan.name || 'Workout cycle',
        split: plan.split_type || plan.training_split || plan.program_type || null,
        daysPerWeek: plan.training_days_per_week || workoutDays(plan).filter((day: any) => (day.exercises || []).length > 0).length || null,
        exercises: workoutDays(plan).reduce((sum: number, day: any) => sum + (day.exercises || []).length, 0),
      }

  return {
    id: row.id,
    planType,
    active: Boolean(row.active),
    created_at: row.created_at,
    start_date: row.start_date ?? row.created_at?.slice(0, 10) ?? null,
    end_date: row.end_date ?? fallbackEndDate(row.created_at, planType),
    summary,
    renewal: plan._renewal ?? null,
    restored: plan._restored ?? null,
  }
}

function workoutDays(plan: any) {
  if (Array.isArray(plan?.days)) return plan.days
  if (Array.isArray(plan?.weeks)) return plan.weeks.flatMap((week: any) => week.days || [])
  return []
}

function summarizeTodayWorkout(plan: any) {
  const days = workoutDays(plan)
  if (!days.length) return null

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = weekDays[new Date().getDay()]
  const selected = days.find((day: any) => {
    const name = String(day?.day_name ?? day?.day ?? '').toLowerCase()
    return name.includes(today.toLowerCase())
  }) ?? days.find((day: any) => Array.isArray(day?.exercises) && day.exercises.length > 0) ?? days[0]

  const exercises = Array.isArray(selected?.exercises) ? selected.exercises : []
  return {
    day_name: selected?.day_name ?? selected?.day ?? today,
    muscle_focus: selected?.muscle_focus ?? selected?.focus ?? null,
    duration_min: selected?.duration_min ?? selected?.duration_minutes ?? null,
    is_rest_day: exercises.length === 0 || exercises.every((exercise: any) => {
      const name = String(exercise?.name ?? exercise?.title ?? '').toLowerCase()
      return name.includes('rest day')
    }),
    exercises: exercises.map((exercise: any, index: number) => ({
      index,
      name: exercise?.name ?? exercise?.title ?? 'Exercise',
      sets: exercise?.sets ?? null,
      reps: exercise?.reps ?? null,
      rest_sec: exercise?.rest_sec ?? exercise?.rest_seconds ?? null,
      muscle_group: exercise?.muscle_group ?? exercise?.muscle ?? null,
      weight_guidance: exercise?.weight_guidance ?? exercise?.weight_suggestion ?? null,
      form_tip: exercise?.form_tip ?? exercise?.notes ?? null,
      progression_note: exercise?.progression_note ?? null,
      video_id: exercise?.video_id ?? null,
    })),
  }
}

function fallbackEndDate(createdAt: string | null, planType: PlanType) {
  if (!createdAt) return null
  const days = planType === 'diet' ? 28 : 42
  return new Date(new Date(createdAt).getTime() + days * 86400000).toISOString().slice(0, 10)
}

function cycleTiming(activePlan: any, planType: PlanType) {
  if (!activePlan) return null
  const endDate = activePlan.end_date || fallbackEndDate(activePlan.created_at, planType)
  if (!endDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000)
  return {
    end_date: endDate,
    daysLeft,
    expired: daysLeft <= 0,
    label: daysLeft > 0 ? `${daysLeft} days left` : 'Your plan is ready for renewal',
  }
}
