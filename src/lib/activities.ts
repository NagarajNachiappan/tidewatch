import type { MarineDay, WeatherDay } from './openmeteo'
import type { TideDay } from './types'
import type { BeachProfile } from './profiles'
import { compass, scoreSurf } from './surf.ts'
import { band, ramp } from './curves.ts'

/**
 * The four activities, scored 0-100 for one beach on one day.
 *
 * As with surf, every constant here is a legible starting value, not a tuned one, and none
 * has been validated against observed conditions (OQ-5).
 */

export type ActivityKey = 'surf' | 'swim' | 'tidepool' | 'run'

export interface ActivityScore {
  key: ActivityKey
  label: string
  /** Null when the inputs needed are missing — never a zero standing in for "unknown". */
  value: number | null
  /** The figures behind the number, for display. */
  why: string
  /** A caveat worth surfacing, such as a headland blocking the swell. */
  note: string | null
}

export const ACTIVITIES: { key: ActivityKey; label: string; short: string }[] = [
  { key: 'surf', label: 'Surf', short: 'Surf' },
  { key: 'swim', label: 'Swim', short: 'Swim' },
  { key: 'tidepool', label: 'Tidepool', short: 'Pool' },
  { key: 'run', label: 'Run the strand', short: 'Run' },
]


// --- components -------------------------------------------------------------

/** Cold water is the thing that ends a swim. */
export function waterTempScore(celsius: number): number {
  return ramp(celsius, 14, 22, 0, 1)
}

/** Calm water for swimming; chop and shore break are the enemy. */
export function calmScore(waveHeightM: number): number {
  return ramp(waveHeightM, 0.4, 1.8, 1, 0)
}

/** Light wind is better for everything that is not surfing. */
export function lightWindScore(speedKmh: number): number {
  return ramp(speedKmh, 6, 35, 1, 0)
}

/** Exposed rock is the whole point: lower low water is better. */
export function lowWaterScore(lowestLowFt: number): number {
  return ramp(lowestLowFt, 2.0, -1.0, 0, 1)
}

/** A low tide at 3 a.m. is no use. Full marks inside daylight, tapering an hour either side. */
export function daylightScore(
  lowTime: string | null,
  sunrise: string | null,
  sunset: string | null,
): number {
  if (!lowTime || !sunrise || !sunset) return 0.5 // unknown, not penalised
  const minutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const at = minutes(lowTime)
  const up = minutes(sunrise.slice(11))
  const down = minutes(sunset.slice(11))
  if (at >= up && at <= down) return 1
  if (at >= up - 60 && at < up) return ramp(at, up - 60, up, 0.4, 1)
  if (at > down && at <= down + 60) return ramp(at, down, down + 60, 1, 0.4)
  return 0.1
}

// --- helpers over the tide table --------------------------------------------

interface LowWater {
  feet: number
  time: string
}

/** The day's lowest low water, which is what tidepooling and firm sand both depend on. */
export function lowestLow(day: TideDay | null): LowWater | null {
  if (!day) return null
  const lows = day.tides.filter((tide) => tide.type === 'low')
  if (lows.length === 0) return null
  return lows.reduce((best, tide) => (tide.feet < best.feet ? tide : best), lows[0])
}

// --- the three new scores ---------------------------------------------------

const SWIM = { water: 0.4, calm: 0.25, wind: 0.2, air: 0.15 } as const
const POOL = { low: 0.45, daylight: 0.35, calm: 0.2 } as const
const RUN = { air: 0.4, wind: 0.35, tide: 0.25 } as const

function scoreSwim(marine: MarineDay | undefined, weather: WeatherDay | undefined): ActivityScore {
  const sea = marine?.seaTempC ?? null
  const wave = marine?.waveHeightM ?? null
  const wind = weather?.windSpeedMaxKmh ?? null
  const air = weather?.airTempMaxC ?? null

  if (sea === null || wave === null) {
    return { key: 'swim', label: 'Swim', value: null, why: 'No sea temperature forecast.', note: null }
  }

  const value =
    waterTempScore(sea) * SWIM.water +
    calmScore(wave) * SWIM.calm +
    (wind === null ? 0.7 : lightWindScore(wind)) * SWIM.wind +
    (air === null ? 0.7 : band(air, 12, 24, 30, 40)) * SWIM.air

  return {
    key: 'swim',
    label: 'Swim',
    value: Math.round(value * 100),
    why:
      `sea ${sea.toFixed(1)}°C · waves ${wave.toFixed(1)} m` +
      (air !== null ? ` · air ${air.toFixed(0)}°C` : '') +
      (wind !== null ? ` · wind ${Math.round(wind)} km/h` : ''),
    note: sea < 16 ? 'Cold enough that most people will want a wetsuit.' : null,
  }
}

function scoreTidepool(
  marine: MarineDay | undefined,
  weather: WeatherDay | undefined,
  tides: TideDay | null,
): ActivityScore {
  const low = lowestLow(tides)
  const wave = marine?.waveHeightM ?? null

  if (!low) {
    return {
      key: 'tidepool',
      label: 'Tidepool',
      value: null,
      why: 'No low water predicted for this day.',
      note: null,
    }
  }

  const daylight = daylightScore(low.time, weather?.sunrise ?? null, weather?.sunset ?? null)
  const value =
    lowWaterScore(low.feet) * POOL.low +
    daylight * POOL.daylight +
    (wave === null ? 0.7 : calmScore(wave)) * POOL.calm

  return {
    key: 'tidepool',
    label: 'Tidepool',
    value: Math.round(value * 100),
    why:
      `low ${low.feet.toFixed(1)} ft at ${low.time}` +
      (wave !== null ? ` · waves ${wave.toFixed(1)} m` : ''),
    note: daylight <= 0.2 ? 'That low water falls in the dark.' : null,
  }
}

function scoreRun(weather: WeatherDay | undefined, tides: TideDay | null): ActivityScore {
  const air = weather?.airTempMaxC ?? null
  const wind = weather?.windSpeedMaxKmh ?? null
  const low = lowestLow(tides)

  if (air === null) {
    return { key: 'run', label: 'Run the strand', value: null, why: 'No temperature forecast.', note: null }
  }

  const value =
    band(air, 4, 16, 22, 34) * RUN.air +
    (wind === null ? 0.7 : lightWindScore(wind)) * RUN.wind +
    (low === null ? 0.6 : lowWaterScore(low.feet)) * RUN.tide

  return {
    key: 'run',
    label: 'Run the strand',
    value: Math.round(value * 100),
    why:
      `air ${air.toFixed(0)}°C` +
      (wind !== null ? ` · wind ${Math.round(wind)} km/h` : '') +
      (low !== null ? ` · low ${low.feet.toFixed(1)} ft` : ''),
    note: air > 30 ? 'Hot — worth going early or late.' : null,
  }
}

/** All four activities for one beach on one day, in display order. */
export function scoreActivities(
  marine: MarineDay | undefined,
  weather: WeatherDay | undefined,
  tides: TideDay | null,
  profile: BeachProfile,
): ActivityScore[] {
  const surf = scoreSurf(marine, weather, profile)

  const surfScore: ActivityScore = surf
    ? {
        key: 'surf',
        label: 'Surf',
        value: surf.value,
        why:
          `${surf.inputs.swellHeightM.toFixed(1)} m at ${surf.inputs.swellPeriodS.toFixed(1)} s ` +
          `from ${compass(surf.inputs.swellDirectionDeg)} (${Math.round(surf.inputs.swellDirectionDeg)}°)` +
          (surf.inputs.windSpeedKmh !== null && surf.inputs.windDirectionDeg !== null
            ? ` · wind ${Math.round(surf.inputs.windSpeedKmh)} km/h from ${compass(surf.inputs.windDirectionDeg)}`
            : ''),
        note: surf.shelteredBy?.note ?? null,
      }
    : { key: 'surf', label: 'Surf', value: null, why: 'No swell forecast for this day.', note: null }

  return [surfScore, scoreSwim(marine, weather), scoreTidepool(marine, weather, tides), scoreRun(weather, tides)]
}

/** The single best cell in the matrix, for the "best today" callout. */
export function bestOfDay(
  rows: { beachName: string; scores: ActivityScore[] }[],
): { beachName: string; score: ActivityScore } | null {
  let best: { beachName: string; score: ActivityScore } | null = null
  for (const row of rows) {
    for (const score of row.scores) {
      if (score.value === null) continue
      if (!best || best.score.value === null || score.value > best.score.value) {
        best = { beachName: row.beachName, score }
      }
    }
  }
  return best
}
