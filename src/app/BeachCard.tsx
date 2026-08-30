import type { Beach } from '@/lib/beaches'
import type { TideDay } from '@/lib/types'
import type { ActivityScore } from '@/lib/activities'
import { TideTable } from './TideTable'
import { ScoreList } from './ScoreList'

interface Props {
  beach: Beach
  day: TideDay | null
  error: string | null
  /** Another beach draws on the same station, so identical tide numbers are expected. */
  shared: boolean
  scores: ActivityScore[]
}

export function BeachCard({ beach, day, error, shared, scores }: Props) {
  return (
    <article className="beach">
      <header className="beach-head">
        <h2>{beach.name}</h2>
        <p className="source">
          {beach.stationName} · station {beach.stationId} · {beach.stationDistanceKm} km away
          {shared ? <span className="shared-tag">shared station</span> : null}
        </p>
      </header>

      <ScoreList scores={scores} />

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
