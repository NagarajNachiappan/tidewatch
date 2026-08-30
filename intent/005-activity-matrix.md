# 005 — The activity matrix

- **Status:** built and verified — 2026-08-29
- **Date:** 2026-08-29
- **Slice:** 5 of n
- **Builds on:** [`004-conditions-and-surf-score.md`](004-conditions-and-surf-score.md)

---

## 1. Goal

The product as originally described: **one score per activity per beach**, four by four,
comparable at a glance. Slice 4 built the framework and proved it on the hardest activity;
this slice adds the other three and the matrix view.

## 2. Two new inputs, no new requests

Both additions ride along on calls that already exist, so the budget stays at **5 upstream
requests**:

| Input | Added to | For |
|---|---|---|
| `sea_surface_temperature_mean` | marine call | swimming |
| `wave_height_max` | marine call | swimming, tidepooling (safety) |
| `sunrise`, `sunset` | forecast call | tidepooling — a low tide at 3 a.m. is no use |
| `temperature_2m_min` | forecast call | running comfort |

Verified available 2026-08-29: daily SST exists (no hourly aggregation needed), and
sunrise/sunset come back as local ISO strings, e.g. `2026-08-29T06:25`.

## 3. What differentiates what

Carried forward from OQ-1, and it now shapes the whole matrix:

| Activity | Dominant inputs | Differentiates the South Bay trio? |
|---|---|---|
| Surf | swell (regional) + exposure (modelled) | only via the modelled profile |
| Swim | SST (regional), wave (regional), **wind + air temp (per beach)** | partly, on real data |
| Tidepool | **tide** (3 stations) + daylight + wave | barely — tide differs by ~22 s |
| Run | **air temp + wind (per beach)** + tide | yes, on real data |

So two of the four columns move on genuinely measured per-beach data. The matrix is not
four copies of the same regional number, and it is not a fiction either — the provenance
line from slice 4 stays.

## 4. The three new scores

Same shape as surf: weighted components, every constant a legible starting value, none of
them calibrated (OQ-5).

**Swim**
| Component | Weight | Shape |
|---|---|---|
| Water temperature | 0.40 | Below 15 °C poor, 18 °C fair, 21 °C+ good. |
| Wave height | 0.25 | Calm is better; over 1.5 m is unpleasant for most swimmers. |
| Wind | 0.20 | Light is better, any direction — this is chop and chill, not shape. |
| Air temperature | 0.15 | Peaks around 24–30 °C; cold air spoils a warm sea. |

**Tidepool**
| Component | Weight | Shape |
|---|---|---|
| Lowest low | 0.45 | Below 0 ft MLLW excellent, above 2 ft poor. The whole point is exposed rock. |
| Daylight | 0.35 | Full marks when that low falls between sunrise and sunset, tapering an hour either side. |
| Wave height | 0.20 | Calm is safer over rock; big surf makes it dangerous. |

**Run the strand**
| Component | Weight | Shape |
|---|---|---|
| Air temperature | 0.40 | Peaks around 16–22 °C; hot is worse than cool for running. |
| Wind | 0.35 | Light is better. |
| Tide | 0.25 | A lower low means firmer, wider sand. |

## 5. The matrix

Beaches as rows, activities as columns, the best cell of the day called out:

```
              Surf   Swim   Pool   Run
Manhattan      64     81     38     72
Hermosa        64     81     38     71
Redondo        63     80     39     70
La Jolla       72     83     41     75

Best today: La Jolla Shores for swimming (83)
```

The per-beach cards stay below it with the full detail. The matrix answers "where and
what", the cards answer "why".

## 6. Scope

### In scope
- Swim, tidepool and run scores, plus surf, in one `scoreActivities()` entry point.
- The matrix table, with the day's best cell identified.
- Cards below showing all four scores per beach with their "why" lines.
- Tests for the new curves and for the daylight logic.

### Out of scope
- Calibration (OQ-5), observation logging (OQ-3), caching (OQ-4), deployment.
- Per-activity detail pages, hourly resolution.

## 7. Acceptance criteria

**All met, verified 2026-08-29 against the running app.**

1. ✅ The matrix shows 4 beaches × 4 activities for the selected day.
2. ✅ **Still exactly 5 upstream requests per render** — verified by counting.
3. ✅ Every score displays the figures behind it.
4. ✅ A low tide falling at night scores clearly worse for tidepooling than the same low in
   daylight — verified by test, since live data may not offer both.
5. ✅ Run and swim scores differ between at least two South Bay beaches on live data,
   from per-beach wind and temperature rather than the modelled profile.
6. ✅ The best cell of the day is identified by beach and activity.
7. ✅ Missing inputs produce no score rather than a zero score.
8. ✅ `npm test` passes and `tsc --noEmit` is clean.


## 8. Found while building: a silently dead scoring component

`lowWaterScore` ramps from +2.0 ft **down** to -1.0 ft, because lower water is better. The
shared `ramp` helper only handled ascending ranges: its first guard, `if (x <= x0) return y0`,
fired for every plausible tide height and returned **0 every time**.

So the largest component of the tidepool score (weight 0.45) and a quarter of the run score
were contributing nothing at all. Nothing threw, no type was violated, and the scores still
looked like plausible two-digit numbers — the failure was invisible from the outside.

A unit test asserting only that `lowWaterScore(-0.5) > lowWaterScore(1.5)` caught it.

Fixed in the helper rather than the caller — `ramp` now handles descending ranges — and both
copies were consolidated into `src/lib/curves.ts` so surf and the other activities share one
implementation. A regression test pins the behaviour.

**The lesson worth keeping:** scoring code fails quietly. A wrong number looks exactly like a
right one, which is why every component curve now has a test asserting its direction, and why
OQ-5 (no calibration) matters more than it sounds.
