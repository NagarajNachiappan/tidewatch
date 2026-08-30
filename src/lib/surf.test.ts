import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { PROFILES } from './profiles.ts'
import { periodScore, scoreSurf, sizeScore, windScore, directionScore } from './surf.ts'
import type { MarineDay, WeatherDay } from './openmeteo.ts'

const marine = (directionDeg: number): MarineDay => ({
  date: '2026-08-29',
  swellHeightM: 1.2,
  swellPeriodS: 12,
  swellDirectionDeg: directionDeg,
  waveHeightM: 1.3,
  seaTempC: 21,
})

/** Identical weather for both beaches, so only the static profile can move the score. */
const calm: WeatherDay = {
  date: '2026-08-29',
  airTempMaxC: 24,
  airTempMinC: 17,
  windSpeedMaxKmh: 6,
  windDirectionDeg: 250,
  sunrise: '2026-08-29T06:25',
  sunset: '2026-08-29T19:23',
}

describe('acceptance criterion 4 — the profile actually differentiates beaches', () => {
  test('south swell: Redondo scores well below Hermosa, shadowed by Palos Verdes', () => {
    const hermosa = scoreSurf(marine(190), calm, PROFILES.hermosa)
    const redondo = scoreSurf(marine(190), calm, PROFILES.redondo)
    assert.ok(hermosa && redondo)

    assert.equal(redondo.shelteredBy?.note.includes('Palos Verdes'), true)
    assert.equal(hermosa.shelteredBy, null)
    assert.ok(
      hermosa.value - redondo.value >= 5,
      `expected a clear gap, got Hermosa ${hermosa.value} vs Redondo ${redondo.value}`,
    )
  })

  test('west swell: Redondo and Hermosa score alike, nothing in the way', () => {
    const hermosa = scoreSurf(marine(255), calm, PROFILES.hermosa)
    const redondo = scoreSurf(marine(255), calm, PROFILES.redondo)
    assert.ok(hermosa && redondo)

    assert.equal(redondo.shelteredBy, null)
    assert.ok(
      Math.abs(hermosa.value - redondo.value) <= 1,
      `expected near-identical, got Hermosa ${hermosa.value} vs Redondo ${redondo.value}`,
    )
  })
})

describe('component curves', () => {
  test('size peaks in the middle', () => {
    assert.equal(sizeScore(0.2), 0)
    assert.ok(sizeScore(1.4) > sizeScore(0.5))
    assert.equal(sizeScore(1.4), 1)
    assert.ok(sizeScore(3.5) < sizeScore(1.4))
  })

  test('period rewards groundswell over wind slop', () => {
    assert.ok(periodScore(5) < periodScore(10))
    assert.ok(periodScore(10) < periodScore(15))
  })

  test('offshore wind beats onshore wind at the same speed', () => {
    const profile = PROFILES.hermosa // faces 251, so offshore arrives from 71
    const offshore = windScore(25, 71, profile)
    const onshore = windScore(25, 251, profile)
    assert.ok(offshore > onshore, `offshore ${offshore} should beat onshore ${onshore}`)
  })

  test('light wind is near-neutral whichever way it blows', () => {
    const profile = PROFILES.hermosa
    assert.ok(Math.abs(windScore(3, 71, profile) - windScore(3, 251, profile)) < 0.02)
  })

  test('swell from behind the beach scores zero, not negative', () => {
    const { score } = directionScore(71, PROFILES.hermosa) // 180 off the facing bearing
    assert.equal(score, 0)
  })
})

describe('missing data', () => {
  test('no swell figures means no score, not a zero score', () => {
    const blank: MarineDay = {
      date: '2026-08-29',
      swellHeightM: null,
      swellPeriodS: null,
      swellDirectionDeg: null,
      waveHeightM: null,
      seaTempC: null,
    }
    assert.equal(scoreSurf(blank, calm, PROFILES.hermosa), null)
  })

  test('missing wind still yields a score', () => {
    const score = scoreSurf(marine(255), undefined, PROFILES.hermosa)
    assert.ok(score && score.value > 0)
  })
})
