import { ACTIVITIES, type ActivityScore } from '@/lib/activities'

export interface MatrixRow {
  slug: string
  beachName: string
  region: string
  scores: ActivityScore[]
}

interface Props {
  rows: MatrixRow[]
  best: { beachName: string; score: ActivityScore } | null
}

/** Beaches down, activities across — the comparison the product exists to make. */
export function Matrix({ rows, best }: Props) {
  return (
    <section className="matrix-wrap" aria-label="Scores by beach and activity">
      <div className="matrix-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th scope="col" className="matrix-beach">
                Beach
              </th>
              {ACTIVITIES.map((activity) => (
                <th key={activity.key} scope="col" className="numeric" title={activity.label}>
                  {activity.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug}>
                <th scope="row" className="matrix-beach">
                  {row.beachName}
                </th>
                {ACTIVITIES.map((activity) => {
                  const score = row.scores.find((s) => s.key === activity.key)
                  const isBest =
                    best !== null &&
                    best.beachName === row.beachName &&
                    best.score.key === activity.key
                  return (
                    <td key={activity.key} className={isBest ? 'numeric cell best' : 'numeric cell'}>
                      {score?.value ?? '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {best ? (
        <p className="best">
          Best today: <strong>{best.beachName}</strong> for {best.score.label.toLowerCase()} (
          {best.score.value})
        </p>
      ) : null}
    </section>
  )
}
