import { fetchTideDay, NoaaError } from '@/lib/noaa'
import { formatLongDate } from '@/lib/format'
import { TideTable } from './TideTable'

/**
 * Slice 1 covers one station only. The beach-to-station mapping for all four
 * beaches is deliberately out of scope — see intent/001-tide-fetch.md.
 */
const STATION = { id: '9410840', name: 'Santa Monica' } as const

export default async function Page() {
  let day
  try {
    day = await fetchTideDay(STATION.id, STATION.name)
  } catch (error) {
    return (
      <main>
        <Header station={STATION.name} />
        <div className="error" role="alert">
          <h2>Today&rsquo;s tides are unavailable</h2>
          <p>{error instanceof NoaaError ? error.message : 'An unexpected error occurred.'}</p>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main>
      <Header station={day.stationName} date={day.date} />
      <TideTable day={day} />
      <Footer datum={day.datum} stationId={day.stationId} />
    </main>
  )
}

function Header({ station, date }: { station: string; date?: string }) {
  return (
    <header>
      <p className="wordmark">Tidewatch</p>
      <h1>{station}</h1>
      {date ? <p className="date">{formatLongDate(date)}</p> : null}
    </header>
  )
}

function Footer({ datum, stationId }: { datum?: string; stationId?: string }) {
  return (
    <footer>
      <p>
        Tide predictions from{' '}
        <a href="https://tidesandcurrents.noaa.gov/" rel="noreferrer">
          NOAA CO-OPS
        </a>
        {stationId ? ` · station ${stationId}` : null}
        {datum ? ` · heights above ${datum}` : null}
      </p>
    </footer>
  )
}
