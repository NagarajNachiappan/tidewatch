import type { SurfScore as Score } from '@/lib/surf'
import { compass } from '@/lib/surf'

/**
 * A score plus the figures behind it. The provenance line is not decoration: swell comes
 * from a 9.2 km regional cell shared by all three South Bay beaches, wind from a 2.9 km
 * cell that is genuinely this beach, and exposure from a hand-written profile that has
 * never been calibrated (OQ-5). Presenting them as equally local would be a lie.
 */
export function SurfScore({ score, error }: { score: Score | null; error: string | null }) {
  if (error) {
    return (
      <div className="score score-missing">
        <span className="score-label">Surf</span>
        <span className="score-note">{error}</span>
      </div>
    )
  }

  if (!score) {
    return (
      <div className="score score-missing">
        <span className="score-label">Surf</span>
        <span className="score-note">No swell forecast for this day.</span>
      </div>
    )
  }

  const { inputs, shelteredBy } = score

  return (
    <div className="score">
      <div className="score-top">
        <span className="score-label">Surf</span>
        <span className="score-value">{score.value}</span>
        <span className="score-max">/100</span>
      </div>

      <p className="score-why">
        {inputs.swellHeightM.toFixed(1)} m at {inputs.swellPeriodS.toFixed(1)} s from{' '}
        {compass(inputs.swellDirectionDeg)} ({Math.round(inputs.swellDirectionDeg)}°)
        {inputs.windSpeedKmh !== null && inputs.windDirectionDeg !== null ? (
          <>
            {' · wind '}
            {Math.round(inputs.windSpeedKmh)} km/h from {compass(inputs.windDirectionDeg)}
          </>
        ) : null}
      </p>

      {shelteredBy ? <p className="score-shelter">{shelteredBy.note}</p> : null}

      <p className="provenance">
        <span title="Shared by all three South Bay beaches">swell: regional, 9 km grid</span>
        {' · '}
        <span title="This beach's own grid cell">wind: measured here</span>
        {' · '}
        <span title="Hand-written geometry, not calibrated against observations">
          exposure: modelled
        </span>
      </p>
    </div>
  )
}
