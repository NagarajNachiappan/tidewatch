import { BEACHES, REGIONS, sharesStation, uniqueStations } from '@/lib/beaches'
import { DATUM, fetchTideDay, NoaaError } from '@/lib/noaa'
import { formatLongDate } from '@/lib/format'
import type { TideDay } from '@/lib/types'
import { BeachCard } from './BeachCard'

interface StationResult {
  day: TideDay | null
  error: string | null
}

export default async function Page() {
  // Three stations for four beaches — Manhattan and Hermosa share Santa Monica.
  // Fetch each station once, and let one failing station cost only its own beaches.
  const stations = uniqueStations()
  const settled = await Promise.allSettled(
    stations.map((station) => fetchTideDay(station.id, station.name)),
  )

  const byStation = new Map<string, StationResult>()
  stations.forEach((station, index) => {
    const outcome = settled[index]
    byStation.set(
      station.id,
      outcome.status === 'fulfilled'
        ? { day: outcome.value, error: null }
        : {
            day: null,
            error:
              outcome.reason instanceof NoaaError
                ? outcome.reason.message
                : 'An unexpected error occurred.',
          },
    )
  })

  // Any station that answered can date the page; they are all the same local day.
  const date = [...byStation.values()].find((r) => r.day)?.day?.date ?? null

  return (
    <main>
      <header className="page-head">
        <p className="wordmark">Tidewatch</p>
        <h1>Today&rsquo;s tides</h1>
        {date ? <p className="date">{formatLongDate(date)}</p> : null}
      </header>

      {REGIONS.map((region) => {
        const beaches = BEACHES.filter((beach) => beach.region === region)
        if (beaches.length === 0) return null
        return (
          <section key={region} className="region">
            <h2 className="region-name">{region}</h2>
            <div className="beaches">
              {beaches.map((beach) => {
                // `?? fallback` would be wrong here: a successful result has
                // error === null, and null ?? '...' would resurrect the fallback.
                const result = byStation.get(beach.stationId)
                return (
                  <BeachCard
                    key={beach.slug}
                    beach={beach}
                    day={result ? result.day : null}
                    error={result ? result.error : 'No data for this station.'}
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
