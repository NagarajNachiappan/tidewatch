import type { Tide, TideDay } from './types'

const ENDPOINT = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'

/** Mean Lower Low Water — the standard reference for US tide tables. */
export const DATUM = 'MLLW'

/**
 * Shape of what NOAA actually sends. Note `v` is a *string*.
 *
 * Errors are messier than the docs suggest. Measured 2026-08-29:
 *   - bad station -> HTTP 400, body `{"error":{"message":"..."}}`
 *   - bad range   -> HTTP 400, body `{"error":{"message":"..."}}`
 *   - bad product -> HTTP 400, body is *plain text*, not JSON at all
 * So the explanation lives in the body even on a 4xx, and the body is not
 * reliably JSON. Both paths have to be handled to produce a useful message.
 */
interface NoaaPrediction {
  t: string
  v: string
  type: string
}

interface NoaaResponse {
  predictions?: NoaaPrediction[]
  error?: { message?: string }
}

/** Anything that stopped us getting a usable tide table. */
export class NoaaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'NoaaError'
  }
}

const TIMESTAMP = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/

/** Fetch today's high and low waters for one station, in the station's local time. */
export async function fetchTideDay(
  stationId: string,
  stationName: string,
): Promise<TideDay> {
  const url = new URL(ENDPOINT)
  url.search = new URLSearchParams({
    date: 'today',
    station: stationId,
    product: 'predictions',
    datum: DATUM,
    interval: 'hilo',
    units: 'english',
    // Local standard / local daylight: NOAA resolves "today" and the clock
    // times against the station, so the server's own timezone never matters.
    time_zone: 'lst_ldt',
    format: 'json',
  }).toString()

  let response: Response
  try {
    // No caching yet — see OQ-4 in intent/001-tide-fetch.md. A public app must
    // not hit NOAA once per visitor, but that policy is a deliberate later choice.
    response = await fetch(url, { cache: 'no-store' })
  } catch (cause) {
    throw new NoaaError('Could not reach NOAA. Check the network connection.', { cause })
  }

  // Read as text first: an error body may not be JSON, and response.json()
  // would throw away the explanation NOAA is trying to give us.
  const raw = await response.text()

  let body: NoaaResponse | undefined
  try {
    body = JSON.parse(raw) as NoaaResponse
  } catch {
    body = undefined
  }

  const reported = body?.error?.message?.trim()

  if (!response.ok) {
    const detail = reported ?? summarise(raw)
    throw new NoaaError(
      detail
        ? `NOAA rejected the request: ${detail}`
        : `NOAA returned HTTP ${response.status} ${response.statusText}.`,
    )
  }

  // Belt and braces: a 200 carrying an error body is still an error.
  if (reported) {
    throw new NoaaError(`NOAA rejected the request: ${reported}`)
  }

  if (!body) {
    throw new NoaaError('NOAA returned a response that was not valid JSON.')
  }

  const rows = body.predictions
  if (!rows || rows.length === 0) {
    throw new NoaaError(`NOAA returned no predictions for station ${stationId} today.`)
  }

  return {
    stationId,
    stationName,
    date: dateOf(rows[0]),
    datum: DATUM,
    tides: rows.map(toTide),
  }
}

/** Collapse a plain-text error body into something short enough to display. */
function summarise(raw: string): string {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > 200 ? `${text.slice(0, 199)}\u2026` : text
}

function toTide(row: NoaaPrediction): Tide {
  const match = TIMESTAMP.exec(row.t)
  if (!match) {
    throw new NoaaError(`Unrecognised timestamp from NOAA: ${JSON.stringify(row.t)}`)
  }

  const feet = Number.parseFloat(row.v)
  if (!Number.isFinite(feet)) {
    throw new NoaaError(`Unparseable tide height from NOAA: ${JSON.stringify(row.v)}`)
  }

  return { time: match[2], type: kindOf(row.type), feet }
}

function kindOf(raw: string): Tide['type'] {
  if (raw === 'H') return 'high'
  if (raw === 'L') return 'low'
  throw new NoaaError(`Unrecognised tide type from NOAA: ${JSON.stringify(raw)}`)
}

/** The day the table is for, taken from the data rather than from a server clock. */
function dateOf(row: NoaaPrediction): string {
  const match = TIMESTAMP.exec(row.t)
  if (!match) {
    throw new NoaaError(`Unrecognised timestamp from NOAA: ${JSON.stringify(row.t)}`)
  }
  return match[1]
}
