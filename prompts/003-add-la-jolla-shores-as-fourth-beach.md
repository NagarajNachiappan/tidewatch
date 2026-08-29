# 003 — Add La Jolla Shores as a fourth beach

- **Date:** 2026-08-29
- **Sequence:** 3
- **Intent:** Promote the San Diego control beach from a diagnostic into real product scope.
- **Status:** complete — scope updated, OQ-2 resolved as a side effect

## Prompt (verbatim)

> add it as fourth beach

(Context: answering my question of whether La Jolla Shores was only a control for OQ-1,
or a genuine fourth beach.)

## What happened

**La Jolla Shores (32.8570, -117.2570) is now a first-class beach.** Tidewatch covers four
beaches across two regions — the South Bay trio plus one San Diego beach 154 km south.

Verified while making the change:

1. **Its NOAA station works and is unusually close.** Station 9410230 (Scripps Pier) is
   1.1 km from the beach and serves today's four hi/lo predictions. That is the best
   station-to-beach fit in the whole project — the South Bay's best is 16 km.

2. **It occupies its own marine grid cell** (32.875, -117.29166), 17 cells from the South
   Bay's. So the matrix will now have one column that genuinely differs and three that are
   byte-identical. This makes OQ-1's artifact *more* conspicuous, not less.

3. **Tide barely varies along this coast — which resolves OQ-2.** Santa Monica vs La Jolla,
   154 km apart, differ by a mean of **11 minutes** and at most **0.06 ft**. San Pedro,
   inside the harbor breakwater, differs from Santa Monica by only **2-4 minutes** and
   **<=0.07 ft**. Scaled down, the implied tide difference across the 5.2 km South Bay is
   about **22 seconds**.

   So the agonising over which station serves Hermosa was worth ~22 seconds of timing.
   Any nearby station is fine for tides. **Tide is not where beach differentiation comes
   from — waves are.** OQ-2 downgraded from Medium to Low.

## Produced

Updated `intent/001-tide-fetch.md`: four beaches in context, station mapping, revised OQ-1
consequence, OQ-2 resolved. Slice 1 itself is unchanged — still one station, one day, one table.
No application code written yet.
