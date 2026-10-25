/**
 * The user's local calendar date as YYYY-MM-DD.
 *
 * Never use `new Date().toISOString().slice(0, 10)` for "today": that is the
 * UTC date, which for Gulf users rolls over at 3–4am local (and ~7pm for US
 * users), splitting meals, water, workouts and streaks across the wrong days.
 */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
