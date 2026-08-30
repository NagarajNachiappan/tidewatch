# 005 — Build slice 2: all four beaches

- **Date:** 2026-08-29
- **Sequence:** 5
- **Intent:** Extend from one hard-coded station to all four beaches and three stations.
- **Status:** complete — all seven acceptance criteria met

## Prompt (verbatim)

> lets do slice 2 now

## What happened

Wrote `intent/002-four-beaches.md`, then built it.

```
src/lib/beaches.ts     BEACHES registry, uniqueStations(), sharesStation()
src/app/BeachCard.tsx  beach + station attribution, delegates the table to TideTable
src/app/page.tsx       dedupe stations, Promise.allSettled, group by region
src/lib/noaa.ts        UNCHANGED — byte-identical to the slice 1 commit
```

That `noaa.ts` is untouched is the headline: slice 1 put the seam in the right place, so
going from one station to three needed no change to the fetching layer at all.

### Verified, not assumed

- **Three upstream requests for four beaches**, counted with temporary logging rather than
  inferred from the code. Manhattan and Hermosa share Santa Monica, so fetching per beach
  would have made a redundant request every render.
- **Partial failure works.** Pointed Redondo at an invalid station: Redondo alone showed
  "NOAA rejected the request: The station is not a valid station...", the other three
  rendered normally.
- **Data cross-checked per station.** Redondo's rendered rows (4:33 / 10:47 / 4:36 / 10:37)
  match a direct call to station 9410660 exactly.
- Instrumentation removed afterwards and `noaa.ts` confirmed byte-identical to HEAD.

### Two defects I introduced and fixed before they shipped

1. **`result?.error ?? 'No station data.'`** — a successful fetch has `error === null`, and
   `null ?? fallback` returns the fallback, so *every* card would have rendered an error.
   Types did not catch it: `string | null` is a legal input either way. Replaced with an
   explicit ternary on whether the result exists.
2. **Duplicated table markup.** The first `BeachCard` re-implemented the table that
   `TideTable` already had, orphaning the slice 1 component. Folded so `BeachCard` renders
   `<TideTable>`.

### Design note

The intent doc called for a beach picker; I built a comparison view showing all four at
once instead. "Which beach today?" is a comparison question, and a picker hides three
quarters of the answer behind a click. Recorded in the doc as an in-scope decision.

## Produced

Four beaches, three stations, one page. Not committed.
