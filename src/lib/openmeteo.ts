import type { Beach } from './beaches'

const MARINE = 'https://marine-api.open-meteo.com/v1/marine'
const FORECAST = 'https://api.open-meteo.com/v1/forecast'
const TIME_ZONE = 'America/Los_Angeles'

/** Swell as reported for the beach's marine grid cell. Regional, ~9.2 km resolution. */
export interface MarineDay {
  date: string
  swellHeightM: number | null
  swellPeriodS: number | null
  /** Compass bearing the swell arrives *from*. */
  swellDirectionDeg: number | null
  /** Total significant wave height — what a swimmer actually meets. */
  waveHeightM: number | null
  seaTempC: number | null
}

/** Wind and air temperature. Per-beach, ~2.9 km resolution. */
export interface WeatherDay {
  date: string
  airTempMaxC: number | null
  airTempMinC: number | null
  windSpeedMaxKmh: number | null
  /** Compass bearing the wind blows *from*. */
  windDirectionDeg: number | null
  /** Local ISO timestamps, e.g. "2026-08-29T06:25". Null when unavailable. */
  sunrise: string | null
  sunset: string | null
}

export class OpenMeteoError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'OpenMeteoError'
  }
}

/**
 * Open-Meteo accepts several coordinates in one call and answers with an array in the same
 * order, so all four beaches cost one request per API rather than four.
 */
async function fetchAll(
  endpoint: string,
  beaches: readonly Beach[],
  daily: string[],
  days: number,
): Promise<unknown[]> {
  const url = new URL(endpoint)
  url.search = new URLSearchParams({
    latitude: beaches.map((b) => b.latitude).join(','),
    longitude: beaches.map((b) => b.longitude).join(','),
    daily: daily.join(','),
    timezone: TIME_ZONE,
    forecast_days: String(days),
  }).toString()

  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store' })
  } catch (cause) {
    throw new OpenMeteoError('Could not reach Open-Meteo. Check the network connection.', {
      cause,
    })
  }

  const raw = await response.text()
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch (cause) {
    throw new OpenMeteoError('Open-Meteo returned a response that was not valid JSON.', {
      cause,
    })
  }

  // Open-Meteo reports problems as { error: true, reason: "..." }.
  if (body && typeof body === 'object' && !Array.isArray(body) && 'reason' in body) {
    throw new OpenMeteoError(`Open-Meteo rejected the request: ${String(body.reason)}`)
  }
  if (!response.ok) {
    throw new OpenMeteoError(`Open-Meteo returned HTTP ${response.status}.`)
  }

  // A single coordinate yields an object; several yield an array. We always send several,
  // but normalise anyway rather than trusting the shape.
  const locations = Array.isArray(body) ? body : [body]
  if (locations.length !== beaches.length) {
    throw new OpenMeteoError(
      `Open-Meteo returned ${locations.length} locations for ${beaches.length} beaches.`,
    )
  }
  return locations
}

/** Read a daily array out of one location payload, tolerating nulls and absences. */
function column(location: unknown, key: string): (number | null)[] {
  if (!location || typeof location !== 'object' || !('daily' in location)) return []
  const daily = (location as { daily: Record<string, unknown> }).daily
  const values = daily?.[key]
  if (!Array.isArray(values)) return []
  return values.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null))
}

/** Same as `column`, for daily fields that come back as strings rather than numbers. */
function textColumn(location: unknown, key: string): (string | null)[] {
  if (!location || typeof location !== 'object' || !('daily' in location)) return []
  const daily = (location as { daily: Record<string, unknown> }).daily
  const values = daily?.[key]
  if (!Array.isArray(values)) return []
  return values.map((v) => (typeof v === 'string' ? v : null))
}

function dates(location: unknown): string[] {
  if (!location || typeof location !== 'object' || !('daily' in location)) return []
  const daily = (location as { daily: Record<string, unknown> }).daily
  const times = daily?.time
  return Array.isArray(times) ? times.map(String) : []
}

/** Swell for every beach, keyed by slug, one request total. */
export async function fetchMarine(
  beaches: readonly Beach[],
  days: number,
): Promise<Map<string, MarineDay[]>> {
  const locations = await fetchAll(
    MARINE,
    beaches,
    [
      'swell_wave_height_max',
      'swell_wave_period_max',
      'swell_wave_direction_dominant',
      'wave_height_max',
      'sea_surface_temperature_mean',
    ],
    days,
  )

  const result = new Map<string, MarineDay[]>()
  beaches.forEach((beach, index) => {
    const location = locations[index]
    const time = dates(location)
    const height = column(location, 'swell_wave_height_max')
    const period = column(location, 'swell_wave_period_max')
    const direction = column(location, 'swell_wave_direction_dominant')
    const wave = column(location, 'wave_height_max')
    const seaTemp = column(location, 'sea_surface_temperature_mean')
    result.set(
      beach.slug,
      time.map((date, i) => ({
        date,
        swellHeightM: height[i] ?? null,
        swellPeriodS: period[i] ?? null,
        swellDirectionDeg: direction[i] ?? null,
        waveHeightM: wave[i] ?? null,
        seaTempC: seaTemp[i] ?? null,
      })),
    )
  })
  return result
}

/** Wind and air temperature for every beach, keyed by slug, one request total. */
export async function fetchWeather(
  beaches: readonly Beach[],
  days: number,
): Promise<Map<string, WeatherDay[]>> {
  const locations = await fetchAll(
    FORECAST,
    beaches,
    [
      'temperature_2m_max',
      'temperature_2m_min',
      'wind_speed_10m_max',
      'wind_direction_10m_dominant',
      'sunrise',
      'sunset',
    ],
    days,
  )

  const result = new Map<string, WeatherDay[]>()
  beaches.forEach((beach, index) => {
    const location = locations[index]
    const time = dates(location)
    const tempMax = column(location, 'temperature_2m_max')
    const tempMin = column(location, 'temperature_2m_min')
    const speed = column(location, 'wind_speed_10m_max')
    const direction = column(location, 'wind_direction_10m_dominant')
    // sunrise/sunset are ISO strings, not numbers, so they need the text reader.
    const sunrise = textColumn(location, 'sunrise')
    const sunset = textColumn(location, 'sunset')
    result.set(
      beach.slug,
      time.map((date, i) => ({
        date,
        airTempMaxC: tempMax[i] ?? null,
        airTempMinC: tempMin[i] ?? null,
        windSpeedMaxKmh: speed[i] ?? null,
        windDirectionDeg: direction[i] ?? null,
        sunrise: sunrise[i] ?? null,
        sunset: sunset[i] ?? null,
      })),
    )
  })
  return result
}
