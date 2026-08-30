import type { ActivityScore } from '@/lib/activities'

/**
 * All four scores for one beach, each with the figures behind it.
 *
 * The provenance line is not decoration. Swell and sea temperature come from a 9.2 km
 * regional cell shared by the whole South Bay; wind and air temperature come from a 2.9 km
 * cell that really is this beach; exposure is a hand-written profile that has never been
 * calibrated (OQ-5). Presenting them as equally local would be a lie.
 */
export function ScoreList({ scores }: { scores: ActivityScore[] }) {
  return (
    <div className="scores">
      {scores.map((score) => (
        <div key={score.key} className="score">
          <div className="score-top">
            <span className="score-label">{score.label}</span>
            {score.value === null ? (
              <span className="score-none">—</span>
            ) : (
              <>
                <span className="score-value">{score.value}</span>
                <span className="score-max">/100</span>
              </>
            )}
          </div>
          <p className="score-why">{score.why}</p>
          {score.note ? <p className="score-shelter">{score.note}</p> : null}
        </div>
      ))}

      <p className="provenance">
        <span title="Shared by all three South Bay beaches">swell &amp; sea temp: regional, 9 km</span>
        {' · '}
        <span title="This beach's own grid cell">wind &amp; air: measured here, 3 km</span>
        {' · '}
        <span title="Hand-written geometry, never calibrated against observations">
          exposure: modelled
        </span>
      </p>
    </div>
  )
}
