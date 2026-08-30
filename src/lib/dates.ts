/**
 * Timezone-safe date helpers.
 *
 * Never use `new Date().toISOString().slice(0, 10)` for "today" here. Measured on the
 * build machine at 2026-08-29 evening Pacific, it returned "2026-08-30" — already past
 * UTC midnight — which would request tides for the wrong day every evening.
 */

/** Every beach Tidewatch covers is on Pacific time. */
export const STATION_TIME_ZONE = 'America/Los_Angeles'

/** Today's calendar date in the given zone, as "YYYY-MM-DD". */
export function todayIn(timeZone: string = STATION_TIME_ZONE, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, so no reassembly from parts is needed.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** "2026-08-29" -> "20260829", the form NOAA's begin_date wants. */
export function toNoaaDate(isoDate: string): string {
  return isoDate.replaceAll('-', '')
}

/** The n consecutive dates starting at `start`, as "YYYY-MM-DD". */
export function datesFrom(start: string, count: number): string[] {
  const [year, month, day] = start.split('-').map(Number)
  return Array.from({ length: count }, (_, offset) => {
    // Built and read in UTC so the arithmetic cannot slip a day near a DST boundary.
    const date = new Date(Date.UTC(year, month - 1, day + offset))
    return date.toISOString().slice(0, 10)
  })
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Accept a user-supplied date only if it is well formed and one of the offered days. */
export function resolveSelectedDate(
  requested: string | undefined,
  available: readonly string[],
): string {
  if (requested && ISO_DATE.test(requested) && available.includes(requested)) {
    return requested
  }
  return available[0]
}
