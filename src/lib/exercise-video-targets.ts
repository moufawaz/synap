const COMPOSITE_HINT = /\b(finisher|circuit|complex|superset|tri-?set|giant set|rounds?|amrap|emom|tabata|burnout|metabolic)\b/i
const SEPARATOR_HINT = /\s(?:\+|\/|,|&|\band\b|\bthen\b)\s/i

const KNOWN_MOVEMENTS = [
  'push-up',
  'push up',
  'jump squat',
  'bodyweight squat',
  'goblet squat',
  'squat',
  'burpee',
  'mountain climber',
  'plank',
  'jumping jack',
  'lunge',
  'high knee',
  'cable row',
  'dumbbell thruster',
  'thruster',
  'battle rope',
  'rope pushdown',
  'tricep rope pushdown',
  'triceps rope pushdown',
  'kettlebell swing',
  'medicine ball slam',
  'bike sprint',
  'rower sprint',
  'treadmill sprint',
]

export function isCompositeExerciseName(name: string) {
  const value = String(name || '').trim()
  return COMPOSITE_HINT.test(value) || (SEPARATOR_HINT.test(value) && /\d/.test(value))
}

export function videoSearchTargets(name: string): string[] {
  const value = String(name || '').trim()
  if (!value) return []

  const known = findKnownMovements(value)
  if (known.length > 0) return known

  if (!isCompositeExerciseName(value)) return [value]

  const cleaned = value
    .replace(/\b(?:metabolic\s+)?(?:finisher|circuit|complex|superset|tri-?set|giant set|burnout)\b\s*:?\s*/gi, '')
    .replace(/\b(?:\d+\s*)?(?:rounds?|sets?)\b/gi, '')
    .replace(/\b(?:amrap|emom|tabata)\b/gi, '')

  return cleaned
    .split(/\s*(?:\+|\/|,|&|\band\b|\bthen\b|;)\s*/i)
    .map(part => part
      .replace(/\([^)]*\)/g, '')
      .replace(/\b\d+\s*(?:x|×)\s*\d+\b/gi, '')
      .replace(/\b\d+\s*(?:reps?|sec(?:onds?)?|seconds?|mins?|minutes?)\b/gi, '')
      .replace(/\bmax reps?\b/gi, '')
      .replace(/[-–—:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(part => part.length > 2 && !/^\d+$/.test(part))
    .slice(0, 5)
}

export function primaryVideoSearchTarget(name: string): string | null {
  const targets = videoSearchTargets(name)
  if (targets.length === 1) return targets[0]
  return null
}

function findKnownMovements(value: string) {
  const normalized = normalize(value)
  const found = KNOWN_MOVEMENTS.filter(movement => {
    const token = normalize(movement)
    return new RegExp(`\\b${escapeRegExp(token)}s?\\b`).test(normalized)
  })

  return [...new Set(found.map(formatMovementName))]
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatMovementName(value: string) {
  return value
    .replace(/\b\w/g, char => char.toUpperCase())
    .replace('Push Up', 'Push-up')
    .replace('Tricep ', 'Triceps ')
}
