# 002 — All four beaches

- **Status:** built and verified — 2026-08-29
- **Date:** 2026-08-29
- **Slice:** 2 of n
- **Builds on:** [`001-tide-fetch.md`](001-tide-fetch.md)

---

## 1. Goal

Extend the working vertical from one hard-coded station to all four beaches, so the app
answers "which beach today?" rather than "what are the tides at Santa Monica?".

No new external dependencies, no scoring, no new API. This is deliberately the slice with
no unresolved decisions in it.

## 2. The mapping

Nearest station per beach, as decided in the interview:

| Beach | Region | Coordinates | Station | Distance |
|---|---|---|---|---|
| Manhattan Beach | South Bay | 33.8847, -118.4109 | 9410840 Santa Monica | 16.0 km |
| Hermosa Beach | South Bay | 33.8622, -118.4009 | 9410840 Santa Monica | 18.6 km |
| Redondo Beach | South Bay | 33.8408, -118.3931 | 9410660 Los Angeles (San Pedro) | 17.5 km |
| La Jolla Shores | San Diego | 32.8570, -117.2570 | 9410230 La Jolla (Scripps Pier) | 1.1 km |

**Four beaches, three stations.** Manhattan and Hermosa share Santa Monica, so their tide
tables will be *identical, digit for digit*. That is not a bug — per OQ-2 the real tide
difference between them is about 22 seconds, far below the resolution of a hi/lo table.

This is the same honesty problem as OQ-1 in a smaller form, and it gets the same treatment:
**the UI must say which station each beach uses**, so two identical tables read as "same
source" rather than "app is broken".

## 3. Scope

### In scope
- A beach registry: slug, name, region, coordinates, station id, station name.
- The index page lists **all four beaches with their tide tables**, not a picker.
  Comparison is the product's whole purpose; a picker hides three quarters of the answer
  behind a click.
- **Deduplicated fetching:** three unique stations means three upstream requests, not four.
- **Partial failure:** stations are fetched independently. If San Pedro fails, Redondo shows
  an error and the other three still render.
- Each beach names its station, so shared sources are visible.
- Beaches grouped by region, since La Jolla is 154 km from the rest.

### Out of scope
- Scoring, and Open-Meteo entirely. Still blocked on OQ-1.
- The 7-day range — that is slice 3.
- Per-beach detail pages or routing. One page.
- Caching (OQ-4), deployment, a beach the user can add.

## 4. Acceptance criteria

**All met, verified 2026-08-29 against the running app.**

1. ✅ `/` renders all four beaches, grouped South Bay then San Diego.
2. ✅ Each beach shows today's highs and lows, its station name and id.
3. ✅ Manhattan and Hermosa show identical times and heights, each labelled Santa Monica.
4. ✅ Exactly **three** upstream NOAA requests per page render — verified by counting, not assumed.
5. ✅ Every table matches its station's live NOAA data.
6. ✅ If one station fails, only its beaches show an error; the rest render normally.
7. ✅ `tsc --noEmit` passes.

## 5. Approach

```
src/lib/beaches.ts    BEACHES registry + Beach type
src/lib/noaa.ts       unchanged — fetchTideDay already takes a station
src/app/page.tsx      dedupe stations, fetch in parallel, group by region
src/app/BeachCard.tsx beach + station attribution + table or error
```

Fetch with `Promise.allSettled` over the *unique* station ids, then hand each beach the
result for its station. A rejected station becomes an error card rather than a crashed page.

The existing `fetchTideDay` needs no change, which is the point — slice 1 put the seam in
the right place.
