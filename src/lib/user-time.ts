// The user's local weekday/hour on the server, from the timezone cookie set by
// <TimezoneCookie />. Falls back to the server clock (UTC on Vercel).

export const TIMEZONE_COOKIE = 'synap_tz'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function userLocalNow(timeZone?: string | null): { weekday: number; hour: number } {
  const now = new Date()
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', hour: 'numeric', hourCycle: 'h23' }).formatToParts(now)
      const weekday = WEEKDAYS.indexOf(parts.find(p => p.type === 'weekday')?.value ?? '')
      const hour = Number(parts.find(p => p.type === 'hour')?.value)
      if (weekday >= 0 && Number.isFinite(hour)) return { weekday, hour }
    } catch { /* invalid timezone — fall back */ }
  }
  return { weekday: now.getDay(), hour: now.getHours() }
}
