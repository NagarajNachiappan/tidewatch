/** The beaches Tidewatch covers, and the NOAA station each one borrows its tides from. */

export interface Beach {
  slug: string
  name: string
  region: 'South Bay' | 'San Diego'
  latitude: number
  longitude: number
  /** Nearest NOAA CO-OPS tide station. Several beaches may share one. */
  stationId: string
  stationName: string
  /** Beach to station, in km. Shown so the borrowing is visible rather than implied. */
  stationDistanceKm: number
}

export const BEACHES: readonly Beach[] = [
  {
    slug: 'manhattan',
    name: 'Manhattan Beach',
    region: 'South Bay',
    latitude: 33.8847,
    longitude: -118.4109,
    stationId: '9410840',
    stationName: 'Santa Monica',
    stationDistanceKm: 16.0,
  },
  {
    slug: 'hermosa',
    name: 'Hermosa Beach',
    region: 'South Bay',
    latitude: 33.8622,
    longitude: -118.4009,
    stationId: '9410840',
    stationName: 'Santa Monica',
    stationDistanceKm: 18.6,
  },
  {
    slug: 'redondo',
    name: 'Redondo Beach',
    region: 'South Bay',
    latitude: 33.8408,
    longitude: -118.3931,
    stationId: '9410660',
    stationName: 'Los Angeles (San Pedro)',
    stationDistanceKm: 17.5,
  },
  {
    slug: 'la-jolla-shores',
    name: 'La Jolla Shores',
    region: 'San Diego',
    latitude: 32.857,
    longitude: -117.257,
    stationId: '9410230',
    stationName: 'La Jolla (Scripps Pier)',
    stationDistanceKm: 1.1,
  },
]

export const REGIONS = ['South Bay', 'San Diego'] as const

/**
 * The stations actually needed, each once. Four beaches resolve to three stations —
 * Manhattan and Hermosa both borrow Santa Monica — so fetching per beach would make a
 * redundant request every render.
 */
export function uniqueStations(beaches: readonly Beach[] = BEACHES) {
  const seen = new Map<string, { id: string; name: string }>()
  for (const beach of beaches) {
    if (!seen.has(beach.stationId)) {
      seen.set(beach.stationId, { id: beach.stationId, name: beach.stationName })
    }
  }
  return [...seen.values()]
}

/** True when another beach in the list draws on the same station. */
export function sharesStation(beach: Beach, beaches: readonly Beach[] = BEACHES): boolean {
  return beaches.some((other) => other.slug !== beach.slug && other.stationId === beach.stationId)
}
