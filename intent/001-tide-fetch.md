# 001 — Fetch and display today's tide table

- **Status:** built and verified — 2026-08-29
- **Date:** 2026-08-29
- **Slice:** 1 of n — the smallest useful thing
- **Prompt of record:** [`prompts/001-interview-scope-and-first-tide-fetch.md`](../prompts/001-interview-scope-and-first-tide-fetch.md)

---

## 1. Context

Tidewatch scores beach conditions for four beaches using NOAA CO-OPS tide predictions and
Open-Meteo Marine forecast data:

| Beach | Coordinates | NOAA station | Distance |
|---|---|---|---|
| Manhattan Beach | 33.8847, -118.4109 | 9410840 Santa Monica | 16.0 km |
| Hermosa Beach | 33.8622, -118.4009 | 9410840 Santa Monica | 18.6 km |
| Redondo Beach | 33.8408, -118.3931 | 9410660 Los Angeles (San Pedro) | 17.5 km |
| La Jolla Shores | 32.8570, -117.2570 | 9410230 La Jolla (Scripps Pier) | **1.1 km** |

The first three sit within 5.2 km of each other in the South Bay; La Jolla Shores is 154 km
south, in San Diego. That split is deliberate — see OQ-1. This document covers
only the first slice; it deliberately builds a fraction of that.

## 2. What the interview established

| Question | Answer | Consequence |
|---|---|---|
| Who uses it | **Public web app** | Hosting, caching, rate limits and source attribution are in scope eventually — not in slice 1. |
| What is scored | **Surf, swim, tidepool, run** — all four | The score is a beach × activity matrix, not one number. |
| How scores are shown | **One score per activity per beach** | 4 beaches × 4 activities = 16 cells. Each needs a defensible input set. |
| Horizon | **7-day outlook** | Both APIs verified to serve 7 days in a single call each. Slice 1 still renders one day. |
| Stack | **Next.js / React, TypeScript** | Server components fetch upstream; no key ever reaches the browser (neither API needs one anyway). |
| Station strategy | **Nearest station per beach** | Manhattan→Santa Monica, Hermosa→Santa Monica, Redondo→San Pedro, La Jolla Shores→Scripps Pier. See OQ-2 — the choice turns out to matter far less than expected. |
| Success | **All three bars:** replaces the incumbent (trust), scores match reality (accuracy), correct and up (engineering) | Only the third is testable in slice 1. The other two need a feedback loop that does not exist yet. |

## 3. Scope of this slice

**Goal:** a local web page that shows today's tide table for one NOAA station.

### In scope
- A Next.js app that runs at `localhost:3000`.
- One server-side fetch of NOAA CO-OPS tide predictions for **station 9410840 (Santa Monica)**.
- Parse the response into typed values — real numbers, real dates, not strings.
- Render today's high/low table: time, high-or-low, height in feet.
- Show the station name, the date, the datum, and NOAA as the source.
- Fail visibly: if NOAA is unreachable or returns no predictions, the page says so rather than rendering an empty table.

### Explicitly out of scope
- Open-Meteo Marine data — no wave, wind or temperature.
- Any score, of any kind, for any activity.
- The other three beaches and their stations.
- The 7-day outlook; today only.
- Deployment, caching policy, styling beyond legibility, tests beyond the acceptance checks below.

### Why this slice
It is the shortest path that exercises the full vertical: upstream HTTP → parse → type →
server render → browser. Everything after it (second station, marine data, scoring)
is a change to a pipeline that already works end to end.

## 4. Acceptance criteria

**All met, verified 2026-08-29 against the running app.**

1. ✅ `npm run dev` serves a page at `localhost:3000` with no console errors.
2. ✅ The page lists every high and low NOAA predicts for the current date in
   `America/Los_Angeles` — typically four rows, sometimes three.
3. ✅ Each row shows local time (12-hour), the word High or Low, and height in feet to one decimal.
4. ✅ Times and heights match the NOAA endpoint exactly — spot-checked against
   [tidesandcurrents.noaa.gov](https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=9410840).
5. ✅ The page names the station, the date, and the datum (MLLW), and credits NOAA CO-OPS.
6. ✅ With NOAA unreachable the page renders an error state, not a blank table or a stack trace.
7. ✅ `tsc --noEmit` passes.

## 5. Technical approach

### Endpoint (verified live 2026-08-29, no API key required)

```
https://api.tidesandcurrents.noaa.gov/api/prod/datagetter
  ?date=today
  &station=9410840
  &product=predictions
  &datum=MLLW
  &interval=hilo
  &units=english
  &time_zone=lst_ldt
  &format=json
```

Actual response for 2026-08-29:

```json
{ "predictions": [
  {"t":"2026-08-29 04:37", "v":"0.168", "type":"L"},
  {"t":"2026-08-29 10:49", "v":"5.084", "type":"H"},
  {"t":"2026-08-29 16:39", "v":"1.24",  "type":"L"},
  {"t":"2026-08-29 22:39", "v":"5.391", "type":"H"}
]}
```

### Parsing notes — where the bugs will be

- `v` is a **string**, not a number. Parse it; do not let it reach arithmetic as a string.
- `t` is `"YYYY-MM-DD HH:mm"` **local to the station**, with no timezone marker.
  `new Date("2026-08-29 04:37")` parses in the *server's* zone, which is only correct by
  accident on a machine set to Pacific. Treat it as a wall-clock string, or attach
  `America/Los_Angeles` explicitly.
- `type` is `"H"` or `"L"` — widen to a union type, do not leave it as `string`.
- **Corrected during build (2026-08-29).** This document originally claimed errors arrive
  as HTTP 200 with an `{"error":{"message":...}}` body. Measured against the live API, that
  is wrong — and the truth is more awkward:

  | Bad input | Status | Body |
  |---|---|---|
  | station `0000000` | **400** | `{"error":{"message":"The station is not a valid station..."}}` |
  | range too large | **400** | `{"error":{"message":"Wrong Date: ... Range Limit Exceeded ..."}}` |
  | product `nonsense` | **400** | **plain text**, not JSON at all |

  So the useful explanation lives in the body *even on a 4xx*, and the body is not reliably
  JSON. Reading `response.json()` after an `ok` check discards the message; calling
  `.json()` at all throws on the plain-text case. Read the body as text once, attempt a
  JSON parse, and fall back to the trimmed text.
- `units=english` gives feet; `metric` gives metres. Open-Meteo returns metres by default,
  so a later slice mixes both — decide the internal unit now and convert at the edges.

### Shape

```
src/
  lib/noaa.ts        fetchTidePredictions(stationId, date) -> Tide[]
  lib/types.ts       Tide = { time: string; type: 'high' | 'low'; feet: number }
  app/page.tsx       server component: fetch, then render
  app/TideTable.tsx  presentational
```

Keeping the fetch in `lib/` rather than inline in the page is the one piece of structure
worth paying for now — slice 2 calls the same function with a second station.

## 6. Assumptions I made (say so if any are wrong)

- **Feet, not metres** — US beach app, so `units=english`. Internal storage in feet.
- **MLLW datum** — the standard for US tide tables and what NOAA's own site shows.
- **High/low only**, not the 6-minute interval curve. Tidepooling may want the full curve
  later; a table does not.
- **Node 24.16.0 / npm 11.13.0**, the versions on this machine.
- **No test framework yet.** Acceptance is manual for this slice. If you want
  `node --test` from the start, that is a small addition — worth saying now, before there
  is code to retrofit.

## 7. Open questions and risks

**OQ-1 — Open-Meteo cannot tell the three beaches apart. (High — measured, see prompt 002)**

Verified 2026-08-29: Manhattan (33.8847, -118.4109), Hermosa (33.8622, -118.4009) and
Redondo (33.8408, -118.3931) all snap to the **same** marine grid cell, `33.875, -118.375`,
and return byte-identical wave data.

Probed with a 42-point latitude sweep and a 154 km control (La Jolla Shores, San Diego):

- The control **does** differ from Hermosa — h 1.26 vs 1.14 m, period 12.65 vs 10.55 s,
  direction 225 vs 239 deg — so Open-Meteo genuinely resolves distinct coastline.
- The sweep returned exactly four grid centres (33.7083 / 33.7917 / 33.8750 / 33.9583),
  spaced 0.08333 deg. **The marine grid is 1/12 deg, ~9.2 km per cell.**
- The three beaches span **5.2 km — barely half a cell**. Two beaches need >9.2 km of
  latitude to separate. Manhattan to Redondo will never qualify.
- **The collapse is fragile, which is worse than it being total.** Cell 33.8750 spans
  33.8333..33.9167 and Redondo sits just **0.83 km above its southern edge**. Nudging
  Redondo's coordinate slightly south flips it to another cell and manufactures a
  difference that is a grid artifact rather than oceanography — plausible-looking, and wrong.

**Consequence for the design.** The beach x activity matrix cannot differentiate the three
beaches on Open-Meteo wave data, and must not appear to. Differentiation has to come from
one of:

1. **Per-beach static characteristics** — break orientation, bottom, shelter from the Palos
   Verdes peninsula and the Redondo breakwater — applied as modifiers to one shared
   regional swell input. Cheapest, honest, and probably correct.
2. **A finer wave source** — CDIP nearshore buoys or a local model. More faithful, more work,
   another dependency.
3. **Narrow the product** — one South Bay swell forecast, with the matrix differentiating by
   activity only, not by beach.

**Adding La Jolla Shores sharpens this rather than solving it.** La Jolla occupies its own
grid cell (32.875, -117.29166), 17 cells south, so its wave data genuinely differs. The matrix
will therefore show **three byte-identical columns and one that moves** — which reads as a bug
to anyone looking closely, and is in fact an accurate depiction of the data available.

**RESOLVED 2026-08-29 — see [`004-conditions-and-surf-score.md`](004-conditions-and-surf-score.md).**
Option 1 chosen: one shared regional swell input plus per-beach static modifiers.

Specifying it also narrowed the problem. OQ-1 assumed all Open-Meteo data collapses across
the South Bay; only the **marine** data does. The standard forecast API runs on a ~2.9 km
grid — three times finer — and puts the three beaches on **three distinct grid points**
(33.8930 / 33.8668 / 33.8406), returning different air temperatures and wind speeds for each.

So wind- and temperature-driven scores are measured per beach; only wave-driven scores are
modelled. The matrix will be differentiated wherever the data supports it, and modelled only
where it does not. The UI must still mark which is which.

**OQ-2 — Which station serves which beach? (Low — measured and largely moot)**

Originally framed as a hard call for Hermosa, which is a near tie: 18.6 km to Santa Monica
vs 19.8 km to San Pedro. Measurement on 2026-08-29 shows the question barely matters.

| Comparison | Separation | Time offset | Height difference |
|---|---|---|---|
| Santa Monica vs La Jolla | 154 km | 11 min mean | ≤ 0.06 ft |
| Santa Monica vs San Pedro | 32 km | 2–4 min | ≤ 0.07 ft |
| Implied across the South Bay | 5.2 km | **~22 seconds** | negligible |

The whole California Bight is very nearly in phase, and even San Pedro's position inside the
harbor breakwater costs only 2–4 minutes. **Choosing Hermosa's station is worth about 22
seconds of timing accuracy.**

Two consequences worth carrying forward:
- Assign the nearest station per beach because it is easy to defend, not because it is
  materially more accurate.
- **Tide is not where beach differentiation comes from — waves are.** Any hope that
  per-beach tide stations would rescue the matrix from OQ-1 is now closed off.

**OQ-3 — Accuracy has no feedback loop. (Medium)**
Success bar #2 is "scores match reality", but nothing in the design records what conditions
were actually like. Without an observation log there is no way to ever confirm or refute a
score. Worth deciding early whether outings get logged.

**OQ-4 — Caching and politeness. (Low, becomes High at launch)**
Tide predictions are deterministic and can be cached for the whole day; marine forecasts
refresh roughly hourly. A public app hitting NOAA once per visitor is impolite and slow.
Next's `revalidate` covers this, but the numbers should be a deliberate choice.

## 8. What slice 2 probably is

Second station and the beach→station mapping (closes OQ-2), or the 7-day range — both are
small once slice 1 exists. Open-Meteo integration should wait until OQ-1 has an answer,
since it determines whether Open-Meteo is even a sufficient wave source.
