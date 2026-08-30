import Link from 'next/link'

interface Props {
  days: readonly string[]
  selected: string
}

/**
 * Seven day links. Selection travels in the URL rather than client state, so a chosen day
 * is server-rendered, shareable, and works with JavaScript switched off.
 */
export function DayStrip({ days, selected }: Props) {
  return (
    <nav className="daystrip" aria-label="Choose a day">
      {days.map((day, index) => (
        <Link
          key={day}
          href={index === 0 ? '/' : `/?date=${day}`}
          className={day === selected ? 'day selected' : 'day'}
          aria-current={day === selected ? 'date' : undefined}
        >
          <span className="day-name">{index === 0 ? 'Today' : weekday(day)}</span>
          <span className="day-num">{dayOfMonth(day)}</span>
        </Link>
      ))}
    </nav>
  )
}

function parts(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function weekday(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(
    parts(isoDate),
  )
}

function dayOfMonth(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'UTC' }).format(
    parts(isoDate),
  )
}
