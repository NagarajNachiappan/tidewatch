import { BEACHES, REGIONS, sharesStation, uniqueStations } from '@/lib/beaches'
import { DATUM, fetchTideDays, NoaaError } from '@/lib/noaa'
import { fetchMarine, fetchWeather } from '@/lib/openmeteo'
import { PROFILES } from '@/lib/profiles'
import { bestOfDay, scoreActivities, type ActivityScore } from '@/lib/activities'
import { datesFrom, resolveSelectedDate, todayIn } from '@/lib/dates'
import { formatLongDate } from '@/lib/format'
import type { TideDay } from '@/lib/types'
import { BeachCard } from './BeachCard'
import { DayStrip } from './DayStrip'
import { Matrix, type MatrixRow } from './Matrix'

const FORECAST_DAYS = 7

interface StationResult {
  days: Map<string, TideDay>
  error: string | null
}

/** Capture a rejection as a message instead of letting it take the whole page down. */
async function settle<T>(promise: Promise<T>): Promise<{ value: T | null; error: string | null }> {
  try {
    return { value: await promise, error: null }
  } catch (reason) {
    return {
      value: null,
      error: reason instanceof Error ? reason.message : 'An unexpected error occurred.',
    }
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: requested } = await searchParams
  const stations = uniqueStations()

  // Five upstream requests, all in flight together: three NOAA stations, plus one
  // multi-coordinate call to each Open-Meteo API covering all four beaches at once.
  // Each source fails independently — a dead marine call must not blank the tide tables.
  const [stationSettled, marine, weather] = await Promise.all([
    Promise.allSettled(
      stations.map((station) => fetchTideDays(station.id, station.name, FORECAST_DAYS)),
    ),
    settle(fetchMarine(BEACHES, FORECAST_DAYS)),
    settle(fetchWeather(BEACHES, FORECAST_DAYS)),
  ])

  const byStation = new Map<string, StationResult>()
  stations.forEach((station, index) => {
    const outcome = stationSettled[index]
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

  // Score every beach once, then use the same results for the matrix and the cards.
  const rows: MatrixRow[] = BEACHES.map((beach) => {
    const result = byStation.get(beach.stationId)
    const day = result ? (result.days.get(selected) ?? null) : null
    return {
      slug: beach.slug,
      beachName: beach.name,
      region: beach.region,
      scores: scoreActivities(
        marine.value?.get(beach.slug)?.find((entry) => entry.date === selected),
        weather.value?.get(beach.slug)?.find((entry) => entry.date === selected),
        day,
        PROFILES[beach.slug],
      ),
    }
  })
  const scoresBySlug = new Map<string, ActivityScore[]>(rows.map((row) => [row.slug, row.scores]))
  const best = bestOfDay(rows)

  return (
    <main>
      <header className="page-head">
        <p className="wordmark">Tidewatch</p>
        <h1>{formatLongDate(selected)}</h1>
        <p className="date">Surf conditions and tides for four Southern California beaches</p>
      </header>

      <DayStrip days={available} selected={selected} />

      <Matrix rows={rows} best={best} />

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
                    scores={scoresBySlug.get(beach.slug) ?? []}
                  />
                )
              })}
            </div>
          </section>
        )
      })}

      <footer>
        <p>
          Tides from{' '}
          <a href="https://tidesandcurrents.noaa.gov/" rel="noreferrer">
            NOAA CO-OPS
          </a>{' '}
          (heights above {DATUM}) · swell and wind from{' '}
          <a href="https://open-meteo.com/" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          · surf scores are uncalibrated estimates, not verified forecasts
        </p>
      </footer>
    </main>
  )
}
