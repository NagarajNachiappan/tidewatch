import type { TideDay } from '@/lib/types'
import { formatClock, formatFeet } from '@/lib/format'

export function TideTable({ day }: { day: TideDay }) {
  return (
    <table className="tides">
      <thead>
        <tr>
          <th scope="col">Time</th>
          <th scope="col">Tide</th>
          <th scope="col" className="numeric">Height</th>
        </tr>
      </thead>
      <tbody>
        {day.tides.map((tide) => (
          <tr key={tide.time} className={tide.type}>
            <td>{formatClock(tide.time)}</td>
            <td>
              <span className="badge">{tide.type === 'high' ? 'High' : 'Low'}</span>
            </td>
            <td className="numeric">{formatFeet(tide.feet)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
