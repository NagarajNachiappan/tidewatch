# 003 — Seven-day outlook

- **Status:** built and verified — 2026-08-29
- **Date:** 2026-08-29
- **Slice:** 3 of n
- **Builds on:** [`002-four-beaches.md`](002-four-beaches.md)

---

## 1. Goal

Answer "when is the best window this week?" as well as "which beach today?".
Seven days of tides for all four beaches, still with no scoring and no Open-Meteo.

This is the last slice before scoring, and therefore the last one with no unresolved
decisions in it. OQ-1 blocks everything after this.

## 2. The API constraint that shapes this slice

`date=today` **silently ignores** `range` — it returns today only, no error:

| Query | Rows | Days |
|---|---|---|
| `date=today&range=168` | 4 | 1 |
| `date=today&range=24` | 4 | 1 |
| `begin_date=20260829&range=168` | **25** | **7** |

So a multi-day request needs an explicit `begin_date`, which means the server must work out
what "today" is **in the station's timezone**. Slice 1 dodged this by letting NOAA resolve
`today`; slice 3 cannot.

**This is a live bug, not a hypothetical.** Measured on this machine at build time:

```
Intl, timeZone America/Los_Angeles  ->  2026-08-29   (correct)
new Date().toISOString().slice(0,10) ->  2026-08-30   (wrong — already past UTC midnight)
```

The naive form is wrong *right now*, and would have shipped a table for the wrong day
every evening. Use `Intl.DateTimeFormat('en-CA', { timeZone })`, which yields `YYYY-MM-DD`
directly, and never `toISOString`.

All four beaches are in `America/Los_Angeles`, so one zone constant suffices today. A beach
outside Pacific time would need the zone attached per station — noted, not built.

## 3. Scope

### In scope
- `fetchTideDays(station, days)` returning one `TideDay` per calendar day, replacing the
  single-day function. Predictions grouped by their own date string.
- **Still three upstream requests.** Seven days is a wider range on the same call, not
  seven calls — 4 beaches × 7 days must not become 21 requests.
- A **day strip**: seven links across the top, today first, selected day highlighted.
- Selection via URL (`/?date=2026-08-31`) rather than client state, so a day is
  server-rendered, shareable and works without JavaScript.
- An unknown, malformed or out-of-range `date` falls back to today rather than erroring.
- The existing four-beach comparison view, showing the selected day.

### Out of scope
- Scoring and Open-Meteo — still blocked on OQ-1.
- Per-beach detail pages, hourly curves, caching (OQ-4), deployment.

## 4. Acceptance criteria

**All met, verified 2026-08-29 against the running app.**

1. ✅ The day strip offers seven consecutive days beginning today.
2. ✅ Selecting a day re-renders all four beaches for that day.
3. ✅ `/` with no parameter shows today.
4. ✅ `/?date=` with a malformed, unknown or out-of-range value shows today, no error page.
5. ✅ **Exactly three upstream NOAA requests per render** — verified by counting.
6. ✅ Spot-checked days match live NOAA data for that station.
7. ✅ A failing station still degrades only its own beaches.
8. ✅ `tsc --noEmit` passes.

## 5. Approach

```
src/lib/dates.ts    todayIn(timeZone), toNoaaDate() — the timezone-safe helpers
src/lib/noaa.ts     fetchTideDays(): one request per station, grouped into days
src/app/DayStrip.tsx  seven links, selected day marked
src/app/page.tsx    resolve selected day from searchParams, then as slice 2
```

`searchParams` is a Promise in Next 16 and must be awaited.


## 6. Found while building: days do not have four tides

The seven days at Santa Monica carry **4, 4, 3, 4, 4, 4 and 2** tides respectively.
Sept 4 has only two, with a **17-hour gap** between Sept 3's 22:19 low and Sept 4's 15:25 high.

This is not truncation and not a range artifact — a single-day query for Sept 4 returns the
same two rows. It is real mixed-semidiurnal behaviour: when the diurnal inequality grows
strong enough, the weaker high/low pair stops registering as a distinct turning point.

Consequences: never assume four rows per day, never render a fixed four-row table, and
expect scoring windows later to cope with days that have no morning low at all.
