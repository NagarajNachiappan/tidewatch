# 006 — Build slice 3: seven-day outlook

- **Date:** 2026-08-29
- **Sequence:** 6
- **Intent:** Extend from today-only to a seven-day outlook across all four beaches.
- **Status:** complete — all eight acceptance criteria met

## Prompt (verbatim)

> lets do slice 3

## What happened

Wrote `intent/003-seven-day-outlook.md`, then built it.

```
src/lib/dates.ts       todayIn(), toNoaaDate(), datesFrom(), resolveSelectedDate()
src/lib/noaa.ts        fetchTideDay -> fetchTideDays(station, name, days), grouped by date
src/app/DayStrip.tsx   seven day links, selection carried in the URL
src/app/page.tsx       await searchParams, resolve the day, otherwise as slice 2
```

### The timezone trap slice 1 dodged came due

`date=today` **silently ignores** `range` — it returns one day and no error. A multi-day
request therefore needs an explicit `begin_date`, so the server has to work out "today" in
the station's zone rather than its own.

Measured on the build machine while writing this:

```
Intl, timeZone America/Los_Angeles   ->  2026-08-29   correct
new Date().toISOString().slice(0,10) ->  2026-08-30   wrong, already past UTC midnight
```

The naive form was wrong at that very moment, and would have fetched the wrong day every
evening. `todayIn()` uses `Intl.DateTimeFormat('en-CA', { timeZone })`, which emits
`YYYY-MM-DD` directly with no reassembly.

### Verified, not assumed

- **Three upstream requests per render**, counted — for 4 beaches × 7 days. Seven days is a
  wider range on the same call, not seven calls; the naive shape would have been 21.
- **Fallbacks work.** `?date=banana` and `?date=2027-01-01` both render today rather than
  erroring; `?date=2026-09-04` renders the last day.
- **Partial failure still contained** under the new code, tested on a non-today date.
- Instrumentation removed; `noaa.ts` confirmed free of probe code afterwards.

### Found while building: days do not have four tides

The seven days carry 4, 4, 3, 4, 4, 4 and 2 tides. Sept 4 has only two, with a 17-hour gap
between Sept 3's 22:19 low and Sept 4's 15:25 high. Confirmed real, not truncation — a
single-day query returns the same two rows. It is mixed-semidiurnal behaviour: a weak
high/low pair stops registering as a distinct turning point. Recorded in the intent doc,
because scoring will have to cope with days that have no morning low at all.

### One false alarm

The dev server reported `Export fetchTideDay doesn't exist in target module` against source
that no longer existed — a stale Turbopack cache from the previous run. It recompiled and
served correctly; no code change was needed.

## Produced

Seven days, four beaches, three requests, one page. Not committed.
