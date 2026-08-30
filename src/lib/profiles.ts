/**
 * Per-beach static characteristics — the "modifier" half of the OQ-1 resolution.
 *
 * Wave data is regional: all three South Bay beaches share one 9.2 km Open-Meteo cell and
 * receive identical swell figures. What differs between them is geometry — which way the
 * beach faces, and what land is in the way. That is what these profiles encode.
 *
 * EVERY NUMBER HERE IS A GEOMETRIC ESTIMATE, NOT A CALIBRATED VALUE (OQ-5). They are
 * derived from coordinates and coastline shape, never from observation, and they are the
 * largest source of error in any surf score. They live in one file so they are cheap to
 * correct once an observation log exists (OQ-3).
 */

/** A bearing range that blocks incoming swell, inclusive, in compass degrees. */
export interface ShelteredSector {
  from: number
  to: number
  /** Why this sector is blocked — kept so the estimate can be argued with. */
  note: string
}

export interface BeachProfile {
  /**
   * Seaward normal: the compass bearing the beach faces, i.e. the direction swell arrives
   * from when it arrives head-on. Derived as coastline bearing + 90 (the ocean is west).
   */
  facingDeg: number
  shelteredSectors: ShelteredSector[]
  /** How much to trust this profile. Drives nothing yet; documents what needs calibration. */
  confidence: 'derived' | 'estimated'
}

/**
 * The Manhattan-to-Redondo strand runs on a bearing of 161.4 deg (measured from the beach
 * coordinates; consistent across segments at 159.7 and 163.2), so its seaward normal is
 * 251 deg — WSW.
 */
export const PROFILES: Record<string, BeachProfile> = {
  manhattan: {
    facingDeg: 251,
    shelteredSectors: [],
    confidence: 'derived',
  },
  hermosa: {
    facingDeg: 251,
    shelteredSectors: [],
    confidence: 'derived',
  },
  redondo: {
    facingDeg: 253,
    shelteredSectors: [
      {
        from: 165,
        to: 205,
        note: 'Palos Verdes headland bears 188.7 deg from Redondo and shadows south swell.',
      },
    ],
    confidence: 'derived',
  },
  'la-jolla-shores': {
    // Least confident profile in the file. Point La Jolla bears 249.6 deg from the Shores,
    // so that sector is land and the open water lies to the west and north-west. Facing is
    // set away from the point accordingly, but unlike the South Bay strand this was not
    // derived from a straight run of coastline — the Shores sit inside a curved bay.
    facingDeg: 280,
    shelteredSectors: [
      {
        from: 210,
        to: 265,
        note: 'Point La Jolla bears 249.6 deg and blocks the south-west window.',
      },
    ],
    confidence: 'estimated',
  },
}

/** Smallest angle between two compass bearings, 0..180. */
export function angularDistance(a: number, b: number): number {
  const diff = Math.abs(((a - b) % 360) + 360) % 360
  return diff > 180 ? 360 - diff : diff
}

/** True when a bearing falls inside a sector, handling sectors that wrap past 360. */
export function inSector(bearing: number, sector: ShelteredSector): boolean {
  const b = ((bearing % 360) + 360) % 360
  const from = ((sector.from % 360) + 360) % 360
  const to = ((sector.to % 360) + 360) % 360
  return from <= to ? b >= from && b <= to : b >= from || b <= to
}

/** The sector blocking this bearing, if any. */
export function shelterFor(profile: BeachProfile, bearing: number): ShelteredSector | null {
  return profile.shelteredSectors.find((sector) => inSector(bearing, sector)) ?? null
}
