# Tidewatch

Scores beach conditions for four Southern California beaches across seven days, using NOAA
CO-OPS tide predictions and Open-Meteo marine and forecast data.

```
Beach                Surf   Swim   Pool    Run
Manhattan Beach        64     79     40     53
Hermosa Beach          64     78     40     54
Redondo Beach          63     77     41     56
La Jolla Shores        72     78     39     56

Best today: Manhattan Beach for swim (79)
```

Pick a day from the strip, compare four beaches across four activities, then read the
figures behind any score.

## Beaches and stations

No NOAA tide station sits on any of the South Bay beaches, so each borrows the nearest one.

| Beach | Region | NOAA station | Distance |
|---|---|---|---|
| Manhattan Beach | South Bay | 9410840 Santa Monica | 16.0 km |
| Hermosa Beach | South Bay | 9410840 Santa Monica | 18.6 km |
| Redondo Beach | South Bay | 9410660 Los Angeles (San Pedro) | 17.5 km |
| La Jolla Shores | San Diego | 9410230 La Jolla (Scripps Pier) | 1.1 km |

Manhattan and Hermosa share a station, so their tide tables are identical to the digit. That
is correct: measured tide difference across the whole 5.2 km South Bay is about 22 seconds.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 22 tests, no test framework needed
npm run typecheck
```

Requires Node 24 (tests rely on its native TypeScript execution). Neither API needs a key.

## What is measured and what is modelled

Not every number on the page is equally local, and the UI says so on every card.

| Input | Source | Resolution | Per beach? |
|---|---|---|---|
| Tides | NOAA CO-OPS | 3 stations | shared, differences ≈ 22 s |
| Swell, waves, sea temperature | Open-Meteo Marine | 9.2 km | **shared** across the South Bay |
| Wind, air temperature, daylight | Open-Meteo Forecast | 2.9 km | **measured per beach** |
| Exposure, orientation, shelter | static profile in this repo | — | **modelled, uncalibrated** |

The three South Bay beaches fall inside a single 9.2 km marine grid cell, so they receive
byte-identical swell data. Differences in their surf scores come from geometry — which way
each beach faces and what land is in the way — not from separate measurements. Their swim
and run scores *do* differ on real data, because the forecast grid is three times finer.

## Scores are estimates, not forecasts

The scoring constants and the beach profiles are legible starting values chosen by hand.
**Nothing has been calibrated against observed conditions**, and there is no observation log,
so there is currently no way to tell a good profile from a bad one. Treat the numbers as a
structured opinion, not a measurement. See the open issues.

## Layout

```
src/lib/       noaa.ts  openmeteo.ts  beaches.ts  profiles.ts
               surf.ts  activities.ts  curves.ts  dates.ts  format.ts
src/app/       page.tsx  Matrix.tsx  BeachCard.tsx  ScoreList.tsx
               DayStrip.tsx  TideTable.tsx  layout.tsx  globals.css
intent/        one document per slice: scope, acceptance criteria, open questions
prompts/       every prompt that shaped this repo, in order, with what resulted
```

`intent/` and `prompts/` are the useful entry points for a reader. Each intent document
states what a slice would and would not do, and carries its acceptance criteria with results;
each prompt record captures what was asked, what was measured, and what went wrong.

Several findings live only in those documents because they are not visible in the code —
NOAA's `date=today` silently ignoring `range`, the marine grid collapse, and a scoring
component that returned zero for every input without failing.
