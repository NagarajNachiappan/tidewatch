# 007 — Resolve OQ-1 and spec the first score

- **Date:** 2026-08-29
- **Sequence:** 7
- **Intent:** Adopt the recommended OQ-1 resolution and specify slice 4.
- **Status:** spec complete — not yet built

## Prompt (verbatim)

> Agree with your recommendation

(Agreeing to: one shared regional swell input plus per-beach static modifiers, rather than
a finer wave source or narrowing the product.)

## What happened

Wrote `intent/004-conditions-and-surf-score.md` and marked OQ-1 resolved in `intent/001`.

### Specifying it shrank the problem

OQ-1 assumed all Open-Meteo data collapses across the South Bay. Measured while writing the
spec: **only the marine data does.**

| Source | Grid | The three South Bay beaches |
|---|---|---|
| Marine (waves, swell, SST) | 1/12 deg = 9.2 km | one shared cell — identical |
| Forecast (wind, air temp) | ~2.9 km | three distinct cells — genuinely different |

Grid points 33.8930 / 33.8668 / 33.8406, returning 28.7 / 28.5 / 27.7 C and winds of
18.0 / 18.4 / 19.5 km/h. Verified with a 24-point sweep: spacing 0.0262 deg, three times
finer than marine.

So wind- and temperature-driven scores are **measured** per beach; only wave-driven scores
are **modelled**. Swim and run were never really blocked by OQ-1.

### The modifier mechanism has a real hinge

`swell_wave_direction_dominant` is available from the marine API. Crossed with each beach's
orientation and sheltered sectors, it makes the same regional swell score differently at
different beaches — which is what makes the modifiers substantive rather than decorative.

### Beach geometry derived, not asserted

The Manhattan-to-Redondo strand runs on a bearing of 161.4 deg, so the beaches face
**251 deg (WSW)**. Consistent across segments (159.7, 163.2). Palos Verdes bears 188.7 deg
from Redondo, shadowing south swell; Point La Jolla bears 249.6 deg from La Jolla Shores,
blocking its NW window.

I initially wrote the seaward normal as 71 deg — that is the landward direction. The ocean
is west, so the normal is bearing +90, not -90. Corrected to 251 deg before writing the doc.

### Scope call

Slice 4 covers the two new data sources plus **surf only**, not all four activities. Surf is
the only activity that depends entirely on collapsed marine data plus a modelled profile, so
it is where the modifier approach has to prove itself. Better to discover a problem against
one activity than four. Slice 5 takes the remaining three and the matrix.

### New open questions

- **OQ-5 (High):** the profiles are geometric estimates, not calibrated. A surf score built
  on them is plausible, not verified. This makes OQ-3 concrete.
- **OQ-6 (Low):** wave data at 9.2 km and wind at 2.9 km now sit in one score; the UI must
  not imply the swell figure is as local as the wind figure.

## Produced

`intent/004-conditions-and-surf-score.md`. OQ-1 closed in `intent/001`. No code yet.
