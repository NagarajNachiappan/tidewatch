import { BEACHES, REGIONS, sharesStation, uniqueStations } from '@/lib/beaches'
import { DATUM, fetchTideDays, NoaaError } from '@/lib/noaa'
import { datesFrom, resolveSelectedDate, todayIn } from '@/lib/dates'
import { formatLongDate } from '@/lib/format'
import type { TideDay } from '@/lib/types'
import { BeachCard } from './BeachCard'
import { DayStrip } from './DayStrip'

const FORECAST_DAYS = 7

interface StationResult {
  /** One entry per calendar day, keyed by date. */
  days: Map<string, TideDay>
  error: string | null
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: requested } = await searchParams

  // Three stations for four beaches, one request each covering the whole range —
  // seven days must not become 21 requests.
  const stations = uniqueStations()
  const settled = await Promise.allSettled(
    stations.map((station) => fetchTideDays(station.id, station.name, FORECAST_DAYS)),
  )

  const byStation = new Map<string, StationResult>()
  stations.forEach((station, index) => {
    const outcome = settled[index]
    byStation.set(
      station.id,
      outcome.status === 'fulfilled'
        ? { days: new Map(outcome.value.map((day) => [day.date, day])), error: null }
        : {
            days: new Map(),
            error:
              outcome.reason instanceof NoaaError
                ? outcome.reason.message
                : 'An unexpected error occurred.',
          },
    )
  })

  const available = datesFrom(todayIn(), FORECAST_DAYS)
  const selected = resolveSelectedDate(requested, available)

  return (
    <main>
      <header className="page-head">
        <p className="wordmark">Tidewatch</p>
        <h1>{formatLongDate(selected)}</h1>
        <p className="date">Tides for four Southern California beaches</p>
      </header>

      <DayStrip days={available} selected={selected} />

      {REGIONS.map((region) => {
        const beaches = BEACHES.filter((beach) => beach.region === region)
        if (beaches.length === 0) return null
        return (
          <section key={region} className="region">
            <h2 className="region-name">{region}</h2>
            <div className="beaches">
              {beaches.map((beach) => {
                const result = byStation.get(beach.stationId)
                const day = result ? (result.days.get(selected) ?? null) : null
                // A station that answered but has no rows for this day is a gap in the
                // forecast, not a failure — say so rather than showing an empty table.
                const error = result
                  ? (result.error ?? (day ? null : 'No predictions for this day.'))
                  : 'No data for this station.'
                return (
                  <BeachCard
                    key={beach.slug}
                    beach={beach}
                    day={day}
                    error={error}
                    shared={sharesStation(beach)}
                  />
                )
              })}
            </div>
          </section>
        )
      })}

      <footer>
        <p>
          Tide predictions from{' '}
          <a href="https://tidesandcurrents.noaa.gov/" rel="noreferrer">
            NOAA CO-OPS
          </a>{' '}
          · heights above {DATUM} · beaches without their own station borrow the nearest one
        </p>
      </footer>
    </main>
  )
}
