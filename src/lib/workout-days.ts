import { isCompositeExerciseName, videoSearchTargets } from '@/lib/exercise-video-targets'

export const CANONICAL_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export type CanonicalDay = (typeof CANONICAL_DAYS)[number]

const DAY_ALIASES: Record<string, CanonicalDay> = {
  sunday: 'Sunday',
  sun: 'Sunday',
  'الأحد': 'Sunday',
  'الاحد': 'Sunday',
  احد: 'Sunday',

  monday: 'Monday',
  mon: 'Monday',
  'الإثنين': 'Monday',
  'الاثنين': 'Monday',
  اثنين: 'Monday',

  tuesday: 'Tuesday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  'الثلاثاء': 'Tuesday',
  ثلاثاء: 'Tuesday',

  wednesday: 'Wednesday',
  wed: 'Wednesday',
  'الأربعاء': 'Wednesday',
  'الاربعاء': 'Wednesday',
  اربعاء: 'Wednesday',

  thursday: 'Thursday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  'الخميس': 'Thursday',
  خميس: 'Thursday',

  friday: 'Friday',
  fri: 'Friday',
  'الجمعة': 'Friday',
  'الجمعه': 'Friday',
  جمعة: 'Friday',
  جمعه: 'Friday',

  saturday: 'Saturday',
  sat: 'Saturday',
  'السبت': 'Saturday',
  سبت: 'Saturday',
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/^يوم\s+/, '')
    .toLowerCase()
}

export function canonicalDayName(value: unknown): CanonicalDay | string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const exact = CANONICAL_DAYS.find(day => day.toLowerCase() === raw.toLowerCase())
  if (exact) return exact

  const key = normalizeText(raw)
  return DAY_ALIASES[key] ?? raw
}

export function dayNameOf(day: any): CanonicalDay | string {
  return canonicalDayName(day?.day_name ?? day?.day ?? day?.name ?? '')
}

export function getWorkoutDays(plan: any): any[] {
  if (Array.isArray(plan?.days)) return plan.days
  if (Array.isArray(plan?.weeks)) {
    const firstWeekWithDays = plan.weeks.find((week: any) => Array.isArray(week?.days) && week.days.length > 0)
    return firstWeekWithDays?.days ?? []
  }
  return []
}

export function getWorkoutDay(plan: any, day: unknown): any | null {
  const target = canonicalDayName(day)
  if (!target) return null
  return getWorkoutDays(plan).find((item: any) => dayNameOf(item) === target) ?? null
}

export function firstWorkoutDayName(plan: any): CanonicalDay | string {
  const firstDay = getWorkoutDays(plan).find((day: any) => Array.isArray(day?.exercises) && day.exercises.length > 0)
  return firstDay ? dayNameOf(firstDay) : ''
}

export function normalizeWorkoutPlanDays<T = any>(plan: T): T {
  if (!plan || typeof plan !== 'object') return plan
  const target = plan as any

  const normalizeDay = (day: any) => {
    if (!day || typeof day !== 'object') return day
    const canonical = dayNameOf(day)
    if (canonical) {
      day.day_name = canonical
      if ('day' in day) day.day = canonical
    }
    if (Array.isArray(day.exercises)) {
      day.exercises = day.exercises.flatMap(splitCompositeExercise)
    }
    return day
  }

  if (Array.isArray(target.days)) {
    target.days = target.days.map(normalizeDay)
  }

  if (Array.isArray(target.weeks)) {
    target.weeks = target.weeks.map((week: any) => ({
      ...week,
      days: Array.isArray(week?.days) ? week.days.map(normalizeDay) : week?.days,
    }))
  }

  if (!Array.isArray(target.days) || target.days.length === 0) {
    const fromFirstWeek = getWorkoutDays(target)
    if (fromFirstWeek.length > 0) target.days = fromFirstWeek.map(normalizeDay)
  }

  return target
}

function splitCompositeExercise(exercise: any) {
  if (!exercise || typeof exercise !== 'object') return [exercise]
  const name = String(exercise.name || '').trim()
  if (!isCompositeExerciseName(name)) return [exercise]

  const targets = videoSearchTargets(name)
  if (targets.length <= 1) return [{ ...exercise, video_id: null }]

  return targets.map((target, index) => ({
    ...exercise,
    name: target,
    video_id: null,
    category: exercise.category || 'finisher',
    muscle_group: exercise.muscle_group || 'Conditioning',
    form_tip: exercise.form_tip || `Move with clean form. This came from the original finisher: ${name}`,
    progression_note: exercise.progression_note || exercise.notes || `Part ${index + 1} of the metabolic finisher.`,
  }))
}
