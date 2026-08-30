/**
 * Shared numeric shapes for scoring.
 *
 * `ramp` handles descending ranges as well as ascending ones. It did not originally, and
 * `lowWaterScore` — which ramps from +2.0 ft down to -1.0 ft because lower water is better —
 * silently returned 0 for every input, quietly deleting the largest component of both the
 * tidepool and run scores. A unit test caught it. Keeping the direction handling here means
 * no caller has to remember which way round its own axis runs.
 */

export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))

/** Linear interpolation from (x0,y0) to (x1,y1), flat outside. x0 may exceed x1. */
export function ramp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x0 === x1) return x >= x1 ? y1 : y0
  if (x0 < x1) {
    if (x <= x0) return y0
    if (x >= x1) return y1
  } else {
    if (x >= x0) return y0
    if (x <= x1) return y1
  }
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
}

/** Peaks across [peakLo, peakHi] and falls to zero at lo and hi. */
export function band(x: number, lo: number, peakLo: number, peakHi: number, hi: number): number {
  if (x <= lo || x >= hi) return 0
  if (x < peakLo) return ramp(x, lo, peakLo, 0, 1)
  if (x <= peakHi) return 1
  return ramp(x, peakHi, hi, 1, 0)
}
