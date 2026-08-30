# 009 — Build slice 5: the activity matrix

- **Date:** 2026-08-29
- **Sequence:** 9
- **Intent:** Add swim, tidepool and run scores, and the 4x4 matrix view.
- **Status:** complete — all eight acceptance criteria met

## Prompt (verbatim)

> do slice 5 then

## What happened

```
src/lib/curves.ts        shared ramp/band/clamp (see the bug below)
src/lib/activities.ts    swim, tidepool, run + scoreActivities() + bestOfDay()
src/lib/activities.test.ts  13 tests
src/app/Matrix.tsx       beaches x activities, best cell marked
src/app/ScoreList.tsx    all four scores per beach, replacing SurfScore.tsx
src/lib/noaa.ts          UNCHANGED — byte-identical to the slice 3 commit
```

Two new inputs (sea temperature, sunrise/sunset, wave height, min temp) rode along on the
existing Open-Meteo calls, so the budget stayed at **5 upstream requests** — counted.

Live matrix:

```
Beach                Surf   Swim   Pool    Run
Manhattan Beach        64     79     40     53
Hermosa Beach          64     78     40     54
Redondo Beach          63     77     41     56
La Jolla Shores        72     78     39     56

Best today: Manhattan Beach for swim (79)
```

Swim and run differ across the South Bay on **measured** per-beach wind and air temperature,
not on the modelled profile — which was the point of the OQ-1 finding in slice 4.

## The bug worth remembering

`lowWaterScore` ramps from +2.0 ft **down** to -1.0 ft, because lower water is better. The
`ramp` helper only handled ascending ranges: its first guard, `if (x <= x0) return y0`, fired
for every plausible tide height and returned **0 every time**.

The largest component of the tidepool score (weight 0.45) and a quarter of the run score were
contributing nothing. Nothing threw. No type was violated. The scores still looked like
perfectly plausible two-digit numbers.

A test asserting nothing more than `lowWaterScore(-0.5) > lowWaterScore(1.5)` caught it.

Fixed in the helper rather than the caller, and both duplicated copies consolidated into
`src/lib/curves.ts`. A regression test pins it.

**Scoring code fails quietly** — a wrong number is indistinguishable from a right one. Every
component curve now has a test asserting its direction. It is also a concrete argument for
OQ-5: without calibration, a score being *wrong* looks exactly like a score being *right*.

## Also verified

- Criterion 4 needed a constructed case again: today's only low falls at 04:37, before the
  06:25 sunrise, so live data offers no daylight low to compare against. The test builds both.
- The daylight note fires correctly on live data: "That low water falls in the dark."
- Missing inputs yield `null`, never a zero standing in for "unknown" — tested for each activity.

## Produced

Four activities, four beaches, one matrix, 22 tests. Not committed.
