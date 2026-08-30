import type { Beach } from '@/lib/beaches'
import type { TideDay } from '@/lib/types'
import type { SurfScore as Score } from '@/lib/surf'
import { TideTable } from './TideTable'
import { SurfScore } from './SurfScore'

interface Props {
  beach: Beach
  day: TideDay | null
  error: string | null
  /** Another beach draws on the same station, so identical tide numbers are expected. */
  shared: boolean
  score: Score | null
  scoreError: string | null
}

export function BeachCard({ beach, day, error, shared, score, scoreError }: Props) {
  return (
    <article className="beach">
      <header className="beach-head">
        <h2>{beach.name}</h2>
        <p className="source">
          {beach.stationName} · station {beach.stationId} · {beach.stationDistanceKm} km away
          {shared ? <span className="shared-tag">shared station</span> : null}
        </p>
      </header>

      <SurfScore score={score} error={scoreError} />

      {error ? (
        <p className="beach-error" role="alert">
          {error}
        </p>
      ) : day ? (
        <TideTable day={day} />
      ) : null}
    </article>
  )
}
