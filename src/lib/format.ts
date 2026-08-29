/** Display helpers. Pure string and number work — no timezone conversion anywhere. */

/** "04:37" -> "4:37 AM" */
export function formatClock(time: string): string {
  const [rawHours, minutes] = time.split(':')
  const hours = Number.parseInt(rawHours, 10)
  const suffix = hours < 12 ? 'AM' : 'PM'
  const twelve = hours % 12 === 0 ? 12 : hours % 12
  return `${twelve}:${minutes} ${suffix}`
}

/** "2026-08-29" -> "Saturday, August 29, 2026" */
export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  // Built as UTC and formatted as UTC, so the label cannot drift by a day
  // depending on where the server happens to be.
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** 5.084 -> "5.1 ft" */
export function formatFeet(feet: number): string {
  return `${feet.toFixed(1)} ft`
}
