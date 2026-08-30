import { angularDistance, shelterFor, type BeachProfile, type ShelteredSector } from './profiles.ts'
import type { MarineDay, WeatherDay } from './openmeteo'
import { clamp, ramp } from './curves.ts'

/**
 * Surf score, 0-100.
 *
 * Every constant below is a starting value chosen to be legible and adjustable, not a tuned
 * one. Nothing here has been validated against observed conditions (OQ-5).
 */

export interface SurfScore {
  value: number
  components: {
    size: number
    period: number
    direction: number
    wind: number
  }
  /** The sector blocking this swell, when one does. */
  shelteredBy: ShelteredSector | null
  inputs: {
    swellHeightM: number
    swellPeriodS: number
    swellDirectionDeg: number
    windSpeedKmh: number | null
    windDirectionDeg: number | null
  }
}

const WEIGHTS = { size: 0.35, period: 0.3, direction: 0.2, wind: 0.15 } as const

/** How much energy still reaches a beach through a blocking headland, by refraction. */
const SHELTERED_THROUGHPUT = 0.15


/** Too small is useless, too big is unrideable for most; the middle is the point. */
export function sizeScore(heightM: number): number {
  if (heightM < 0.3) return 0
  if (heightM < 1.0) return ramp(heightM, 0.3, 1.0, 0.1, 1)
  if (heightM <= 1.8) return 1
  if (heightM <= 2.5) return ramp(heightM, 1.8, 2.5, 1, 0.6)
  return ramp(heightM, 2.5, 4.0, 0.6, 0.2)
}

/** Long period is organised groundswell; short period is local wind slop. */
export function periodScore(seconds: number): number {
  if (seconds < 6) return 0.1
  if (seconds < 8) return ramp(seconds, 6, 8, 0.1, 0.4)
  if (seconds < 12) return ramp(seconds, 8, 12, 0.4, 0.85)
  return ramp(seconds, 12, 16, 0.85, 1)
}

/**
 * How well the swell lines up with the beach, and whether land is in the way.
 *
 * This is where the per-beach modifier earns its place: the same regional swell scores
 * differently at Redondo than at Hermosa when it arrives from the south, because Palos
 * Verdes is between Redondo and the swell.
 */
export function directionScore(
  swellDirectionDeg: number,
  profile: BeachProfile,
): { score: number; shelteredBy: ShelteredSector | null } {
  const offAxis = angularDistance(swellDirectionDeg, profile.facingDeg)
  // Head-on is 1, 90 degrees off is 0. Beyond 90 the swell is coming from behind the beach.
  const alignment = clamp(Math.cos((offAxis * Math.PI) / 180))

  const shelteredBy = shelterFor(profile, swellDirectionDeg)
  return {
    score: shelteredBy ? alignment * SHELTERED_THROUGHPUT : alignment,
    shelteredBy,
  }
}

/**
 * Offshore wind grooms the face, onshore wind wrecks it, and light wind of any direction
 * barely matters. Wind is measured per beach at ~2.9 km, unlike the swell.
 */
export function windScore(
  speedKmh: number | null,
  directionDeg: number | null,
  profile: BeachProfile,
): number {
  if (speedKmh === null || directionDeg === null) return 0.75

  // Offshore wind blows from the land toward the sea, so it arrives from the bearing
  // opposite the one the beach faces.
  const offshoreBearing = (profile.facingDeg + 180) % 360
  const alignment = clamp((Math.cos((angularDistance(directionDeg, offshoreBearing) * Math.PI) / 180) + 1) / 2)

  // Below 5 km/h direction is irrelevant; by 30 km/h it dominates.
  const influence = clamp((speedKmh - 5) / 25)
  return 0.75 * (1 - influence) + alignment * influence
}

/** Null when the swell inputs needed for a score are missing. */
export function scoreSurf(
  marine: MarineDay | undefined,
  weather: WeatherDay | undefined,
  profile: BeachProfile,
): SurfScore | null {
  if (
    !marine ||
    marine.swellHeightM === null ||
    marine.swellPeriodS === null ||
    marine.swellDirectionDeg === null
  ) {
    return null
  }

  const size = sizeScore(marine.swellHeightM)
  const period = periodScore(marine.swellPeriodS)
  const { score: direction, shelteredBy } = directionScore(marine.swellDirectionDeg, profile)
  const wind = windScore(
    weather?.windSpeedMaxKmh ?? null,
    weather?.windDirectionDeg ?? null,
    profile,
  )

  const value =
    size * WEIGHTS.size +
    period * WEIGHTS.period +
    direction * WEIGHTS.direction +
    wind * WEIGHTS.wind

  return {
    value: Math.round(value * 100),
    components: { size, period, direction, wind },
    shelteredBy,
    inputs: {
      swellHeightM: marine.swellHeightM,
      swellPeriodS: marine.swellPeriodS,
      swellDirectionDeg: marine.swellDirectionDeg,
      windSpeedKmh: weather?.windSpeedMaxKmh ?? null,
      windDirectionDeg: weather?.windDirectionDeg ?? null,
    },
  }
}

/** Compass bearing to an eight-point label, for display. */
export function compass(deg: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return points[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
}
