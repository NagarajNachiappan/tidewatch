# 008 — Build slice 4: conditions data and the surf score

- **Date:** 2026-08-29
- **Sequence:** 8
- **Intent:** Build `intent/004` — Open-Meteo marine and forecast data, beach profiles, and
  the first score.
- **Status:** complete — all eight acceptance criteria met

## Prompt (verbatim)

> yes build slice 4

## What happened

```
src/lib/profiles.ts    BeachProfile: facing bearing + sheltered sectors (the OQ-1 modifiers)
src/lib/openmeteo.ts   fetchMarine() + fetchWeather(), one multi-coordinate request each
src/lib/surf.ts        scoreSurf() and its four component curves
src/lib/surf.test.ts   9 tests, including the criterion 4 case
src/app/SurfScore.tsx  score, the figures behind it, and provenance
src/lib/noaa.ts        UNCHANGED again — byte-identical to the slice 3 commit
```

### Tests, with no new dependencies

Node 24 runs TypeScript directly and `node --test` handles `.ts` files, so slice 4 got a
real test suite for the cost of one script line. Criterion 4 needed a **constructed** south
swell — live swell today is from 268° (west) and would never exercise Palos Verdes — which
is exactly the case a unit test exists for.

The tests confirm the modifier mechanism works: on a 190° swell, Hermosa scores clearly
above Redondo and the shelter is attributed to Palos Verdes; on a 255° swell the two are
within a point of each other.

One resolution wrinkle: Node's ESM loader needs explicit file extensions, while Next's
bundler does not. Only `surf.ts`'s import of `./profiles` sits on the test's runtime path
(everything else is `import type`, which is erased), so it alone carries a `.ts` extension,
with `allowImportingTsExtensions` enabled in tsconfig.

### Verified, not assumed

- **Exactly 5 upstream requests per render** — 3 NOAA + 1 marine + 1 forecast, counted.
  Open-Meteo takes all four beaches in one call, so the naive shape would have been 11.
- **Sources fail independently.** Killed the marine API: every card showed "Could not reach
  Open-Meteo" for surf while all four tide tables rendered normally.
- **Per-beach wind is real.** Redondo scored 63 against Hermosa's 64 on live data, purely
  from wind (20 vs 18 km/h) on the 2.9 km forecast grid.
- Instrumentation removed; both clients confirmed clean afterwards.

### A contradiction in my own spec, caught while implementing

`intent/004` gave La Jolla Shores a facing of ~250° *and* a sheltered sector of 250–320°.
A beach cannot face into its own blocked sector. Point La Jolla bears 249.6°, so that
bearing is **land**: the sheltered sector is the south-west and the beach faces away from
it, roughly west-north-west. Set to facing 280°, sheltered 210–265°, and marked
`confidence: 'estimated'` — the only profile not derived from a straight run of coastline.
The spec has been corrected to match.

### What this does not do

The score is uncalibrated (OQ-5). The footer says so in the UI: "surf scores are
uncalibrated estimates, not verified forecasts". Manhattan and Hermosa still score
identically most days, which is honest — 2.6 km apart, same swell cell, near-identical wind.

## Produced

Five data sources, one score, nine tests. Not committed.
