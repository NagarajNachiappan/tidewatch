# 004 — Conditions data and the first score

- **Status:** built and verified — 2026-08-29
- **Date:** 2026-08-29
- **Slice:** 4 of n
- **Builds on:** [`003-seven-day-outlook.md`](003-seven-day-outlook.md)
- **Resolves:** OQ-1 from [`001-tide-fetch.md`](001-tide-fetch.md)

---

## 1. OQ-1 is resolved — and it is smaller than it looked

Agreed approach: **one shared regional swell input plus per-beach static modifiers.**

While specifying it, a measurement changed the shape of the problem. OQ-1 assumed *all*
Open-Meteo data collapses across the South Bay. Only the **marine** data does:

| Source | Grid | Manhattan / Hermosa / Redondo | Differentiates? |
|---|---|---|---|
| Marine (waves, swell, SST) | 1/12° ≈ **9.2 km** | one shared cell | ❌ identical |
| Forecast (wind, air temp) | ≈ **2.9 km** | **three distinct cells** | ✅ genuinely different |

Measured 2026-08-29: the three beaches land on forecast grid points 33.8930 / 33.8668 /
33.8406, returning max temps of 28.7 / 28.5 / 27.7 °C and max winds of 18.0 / 18.4 /
19.5 km/h. That is real per-beach data at ~3 km resolution, three times finer than marine.

**So only wave-driven scores need modelling.** Wind- and temperature-driven scores can be
measured per beach. The matrix will not be three identical columns — it will be
differentiated wherever the data supports it, and modelled only where it does not.

## 2. What is measured and what is modelled

Every number the app shows falls into exactly one of these, and the UI must say which.

| Input | Source | Resolution | Per beach? |
|---|---|---|---|
| Tide highs/lows | NOAA CO-OPS | 3 stations | shared (differences ≈ 22 s, see OQ-2) |
| Swell height / period / direction | Open-Meteo Marine | 9.2 km | **shared** across the South Bay |
| Sea surface temperature | Open-Meteo Marine | 9.2 km | shared |
| Air temperature | Open-Meteo Forecast | 2.9 km | **measured per beach** |
| Wind speed / direction | Open-Meteo Forecast | 2.9 km | **measured per beach** |
| Exposure, shelter, orientation | static profile in the repo | — | **modelled per beach** |

## 3. The static beach profiles

Derived from the coordinates rather than asserted. The strand from Manhattan to Redondo
runs on a bearing of **161.4°**, so its seaward normal — the direction the beach faces — is
**251° (WSW)**. Consistent across segments: Manhattan→Hermosa 159.7°, Hermosa→Redondo 163.2°.

| Beach | Faces | Sheltered from | Why |
|---|---|---|---|
| Manhattan | 251° | — | Open to the Santa Monica Bay swell window. |
| Hermosa | 251° | — | As Manhattan; 2.6 km south. |
| Redondo | 253° | ~170–200° (S/SSW) | Palos Verdes headland bears **188.7°** from Redondo and shadows south swell. King Harbor breakwater adds local shelter. |
| La Jolla Shores | ~280° | ~210–265° (SW) | Point La Jolla bears **249.6°**, so that sector is land; open water lies west and north-west. |

**Corrected during build.** This table first gave La Jolla Shores a facing of ~250° *and* a
sheltered sector of 250–320°, which is self-contradictory — a beach cannot face into its own
blocked sector. The headland bears 249.6°, so that bearing is land: the sheltered sector is
the south-west, and the beach faces away from it, roughly west-north-west. Unlike the South
Bay strand, this was not derived from a straight run of coastline, so it is marked
`confidence: 'estimated'` in the code while the others are `'derived'`.

**These are first estimates, not calibrated values.** They come from geometry and general
knowledge of the coast, not from observation. They are the largest source of error in any
surf score, and they cannot be validated until OQ-3 (no accuracy feedback loop) is
addressed. They live in one file so they are cheap to correct.

## 4. Scope

### In scope
- Fetch Open-Meteo **Marine** (swell height, period, direction; SST) and **Forecast**
  (air temp, wind speed, wind direction) for seven days.
- **One request each.** Open-Meteo accepts multiple coordinates per call, so four beaches
  cost one marine request and one forecast request — not eight. Total budget for the page
  becomes **5 upstream requests**: 3 NOAA + 1 marine + 1 forecast.
- A `BeachProfile` type holding facing bearing and sheltered sectors, alongside the
  existing beach registry.
- **A surf score only, 0–100, per beach per day**, with the inputs that produced it.
- Provenance labelling: each contributing figure marked measured-here, regional, or modelled.

### Out of scope, deliberately
- The other three activities and the full matrix. See §7.
- Calibration, observation logging, any claim the numbers are accurate.
- Caching (OQ-4) and deployment.

### Why surf first, alone
Surf is the activity where the modifier mechanism has to prove itself — it is the only one
that depends entirely on the collapsed marine data plus a modelled profile. Swim, tidepool
and run lean on tide and per-beach wind and temperature, which are already differentiated
and comparatively easy. If the modifier approach cannot make surf defensible, that is worth
discovering against one activity rather than four.

## 5. The surf score

Four components, each 0–1, combined by weight. Every constant here is a starting value
chosen to be legible and adjustable, not a tuned one.

| Component | Weight | Shape |
|---|---|---|
| Swell size | 0.35 | Peaks around 1.0–1.8 m; falls off below 0.5 m (too small) and above 2.5 m (blown out for most). |
| Swell period | 0.30 | Rises with period: <8 s wind slop, 8–12 s fair, >12 s groundswell. |
| Direction fit | 0.20 | 1.0 when swell arrives near the beach's facing bearing; 0 when it arrives from a sheltered sector; cosine falloff between. |
| Wind | 0.15 | Offshore (blowing seaward, near the facing bearing ± 90°) is good; onshore and strong is bad; light wind of any direction is neutral-good. |

Direction fit is where the per-beach modifier does its work: the same regional swell scores
differently at Redondo than at Hermosa when it arrives from the south, because Palos Verdes
is in the way. Wind is genuinely per-beach measured data.

Each score carries the figures behind it, so the UI can say *why* — "1.2 m at 10.5 s from
268°, light offshore" — rather than presenting a bare number.

## 6. Acceptance criteria

**All met, verified 2026-08-29 against the running app.**

1. ✅ Marine and forecast data are fetched for seven days for all four beaches.
2. ✅ **Exactly 5 upstream requests per render** — 3 NOAA, 1 marine, 1 forecast. Verified by counting.
3. ✅ Each beach shows a surf score 0–100 for the selected day.
4. ✅ Redondo and Hermosa produce **different** surf scores when swell arrives from the
   sheltered southern sector, and near-identical ones when it arrives from the west.
   Verified with a constructed case, since live swell may not exercise it.
5. ✅ Each score displays the swell height, period, direction and wind that produced it.
6. ✅ Regional figures are visibly marked as regional; modelled ones as modelled.
7. ✅ A failure in any one source degrades only what depends on it — a dead marine call must
   not blank the tide tables.
8. ✅ `tsc --noEmit` passes.

## 7. What slice 5 is

The remaining three activities and the matrix view. They are mostly straightforward once
this framework and these data sources exist, and three of the four lean on data that is
already per-beach.

## 8. Open questions this slice raises

**OQ-5 — The profiles are uncalibrated. (High)**
Facing bearings and sheltered sectors are geometric estimates. A surf score built on them is
plausible, not verified. This is OQ-3 (no feedback loop) becoming concrete: without logged
observations there is no way to tell a good profile from a bad one. Recommend an observation
log before any claim of accuracy is made in the UI.

**OQ-6 — Two grids, one page. (Low)**
Wave data at 9.2 km and wind at 2.9 km now sit side by side in the same score. That is
defensible, but the UI must not imply the swell figure is as local as the wind figure.
