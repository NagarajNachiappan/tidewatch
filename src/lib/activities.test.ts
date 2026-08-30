import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVITIES,
  bestOfDay,
  calmScore,
  daylightScore,
  lightWindScore,
  lowestLow,
  lowWaterScore,
  scoreActivities,
  waterTempScore,
  type ActivityScore,
} from './activities.ts'
import { PROFILES } from './profiles.ts'
import type { MarineDay, WeatherDay } from './openmeteo.ts'
import type { TideDay } from './types.ts'

const marine: MarineDay = {
  date: '2026-08-29',
  swellHeightM: 1.2,
  swellPeriodS: 12,
  swellDirectionDeg: 268,
  waveHeightM: 1.0,
  seaTempC: 21,
}

const weather: WeatherDay = {
  date: '2026-08-29',
  airTempMaxC: 24,
  airTempMinC: 17,
  windSpeedMaxKmh: 10,
  windDirectionDeg: 260,
  sunrise: '2026-08-29T06:25',
  sunset: '2026-08-29T19:23',
}

const tidesWith = (lows: { time: string; feet: number }[]): TideDay => ({
  stationId: '9410840',
  stationName: 'Santa Monica',
  date: '2026-08-29',
  datum: 'MLLW',
  tides: [
    ...lows.map((l) => ({ time: l.time, type: 'low' as const, feet: l.feet })),
    { time: '10:49', type: 'high' as const, feet: 5.1 },
  ],
})

describe('acceptance criterion 4 — daylight decides a tidepooling day', () => {
  test('the same low scores far worse at night than in daylight', () => {
    const byDay = scoreActivities(marine, weather, tidesWith([{ time: '11:00', feet: -0.4 }]), PROFILES.hermosa)
    const byNight = scoreActivities(marine, weather, tidesWith([{ time: '03:00', feet: -0.4 }]), PROFILES.hermosa)

    const day = byDay.find((s) => s.key === 'tidepool')!
    const night = byNight.find((s) => s.key === 'tidepool')!
    assert.ok(day.value !== null && night.value !== null)
    assert.ok(
      day.value - night.value >= 20,
      `expected a large gap, got day ${day.value} vs night ${night.value}`,
    )
    assert.equal(night.note, 'That low water falls in the dark.')
    assert.equal(day.note, null)
  })

  test('unknown sunrise is not treated as darkness', () => {
    assert.equal(daylightScore('11:00', null, null), 0.5)
  })
})

describe('component curves', () => {
  test('colder water scores lower', () => {
    assert.ok(waterTempScore(14) < waterTempScore(18))
    assert.ok(waterTempScore(18) < waterTempScore(23))
  })

  test('calmer water and lighter wind score higher', () => {
    assert.ok(calmScore(0.4) > calmScore(1.6))
    assert.ok(lightWindScore(6) > lightWindScore(30))
  })

  test('a lower low is better for rock and for firm sand', () => {
    assert.ok(lowWaterScore(-0.5) > lowWaterScore(1.5))
    assert.equal(lowWaterScore(2.5), 0)
  })
})

describe('lowest low', () => {
  test('picks the lowest of several lows, not the first', () => {
    const low = lowestLow(tidesWith([{ time: '04:37', feet: 0.2 }, { time: '16:39', feet: -0.3 }]))
    assert.equal(low?.feet, -0.3)
    assert.equal(low?.time, '16:39')
  })

  test('a day with no low water yields nothing', () => {
    const highOnly: TideDay = { ...tidesWith([]), tides: [{ time: '10:49', type: 'high', feet: 5.1 }] }
    assert.equal(lowestLow(highOnly), null)
  })
})

describe('missing inputs give no score, never zero', () => {
  test('no sea temperature means no swim score', () => {
    const scores = scoreActivities({ ...marine, seaTempC: null }, weather, tidesWith([]), PROFILES.hermosa)
    assert.equal(scores.find((s) => s.key === 'swim')!.value, null)
  })

  test('no weather at all means no run score', () => {
    const scores = scoreActivities(marine, undefined, tidesWith([]), PROFILES.hermosa)
    assert.equal(scores.find((s) => s.key === 'run')!.value, null)
  })

  test('all four activities are always returned, in order', () => {
    const scores = scoreActivities(undefined, undefined, null, PROFILES.hermosa)
    assert.deepEqual(scores.map((s) => s.key), ACTIVITIES.map((a) => a.key))
    assert.deepEqual(scores.map((s) => s.value), [null, null, null, null])
  })
})

describe('best of day', () => {
  test('finds the highest cell across beaches and activities', () => {
    const mk = (v: number, key: ActivityScore['key']): ActivityScore => ({ key, label: key, value: v, why: '', note: null })
    const best = bestOfDay([
      { beachName: 'Hermosa', scores: [mk(60, 'surf'), mk(70, 'swim')] },
      { beachName: 'Redondo', scores: [mk(90, 'run'), mk(50, 'surf')] },
    ])
    assert.equal(best?.beachName, 'Redondo')
    assert.equal(best?.score.value, 90)
  })

  test('ignores unscored cells', () => {
    const best = bestOfDay([
      { beachName: 'Hermosa', scores: [{ key: 'surf', label: 'Surf', value: null, why: '', note: null }] },
    ])
    assert.equal(best, null)
  })
})

describe('regression: ramp direction', () => {
  test('a descending ramp actually descends', () => {
    // lowWaterScore ramps from +2.0 ft down to -1.0 ft. The original ramp helper only
    // handled ascending ranges and returned 0 for every input, deleting the largest
    // component of both the tidepool and run scores without any visible error.
    assert.equal(lowWaterScore(-1.5), 1)
    assert.equal(lowWaterScore(2.5), 0)
    assert.ok(Math.abs(lowWaterScore(0.5) - 0.5) < 0.01)
    assert.ok(lowWaterScore(-0.5) > lowWaterScore(0.5))
    assert.ok(lowWaterScore(0.5) > lowWaterScore(1.5))
  })
})
