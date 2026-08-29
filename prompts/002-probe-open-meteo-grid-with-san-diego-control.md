# 002 — Probe the Open-Meteo grid using a San Diego beach as control

- **Date:** 2026-08-29
- **Sequence:** 2
- **Intent:** Resolve OQ-1 by testing whether Open-Meteo Marine can distinguish beaches at all,
  using a distant San Diego beach as a control against Hermosa.
- **Status:** complete — OQ-1 answered

## Prompt (verbatim)

> for oQ1, lets pick one more beach near san diego and hermosa beach

## What happened

Chose **La Jolla Shores** (32.8570, -117.2570) as the San Diego control, 154 km from Hermosa.

**Result: the grid works, but not at neighbourhood scale.**

1. **Control passes.** La Jolla returns clearly different data from Hermosa
   (h=1.26/1.36/1.34 vs 1.14/1.22/1.24 m; period 12.65 vs 10.55 s; direction 225 vs 239 deg).
   So Open-Meteo is not returning a constant — it genuinely resolves distinct coastline.

2. **Grid resolution measured, not guessed.** A 42-point latitude sweep along the coast
   returned exactly four distinct grid centres — 33.7083, 33.7917, 33.8750, 33.9583 —
   spaced 0.08333 deg apart. The marine grid is **1/12 deg, about 9.2 km per cell**.

3. **The three South Bay beaches span 5.2 km — barely half a cell.** Two beaches must be
   more than ~9.2 km apart in latitude to land in different cells. Manhattan to Redondo will
   never qualify.

4. **The collapse is also fragile.** Cell 33.8750 spans 33.8333..33.9167. Redondo sits just
   **0.83 km above its southern edge**. Nudging Redondo's coordinate slightly south flips it
   into a different cell and manufactures a difference that is a grid artifact, not
   oceanography. So the failure mode is worse than "three identical columns" — a naive
   coordinate change produces *fake* differentiation that looks plausible.

5. **Bonus finding for OQ-2.** La Jolla Shores has a NOAA station 1.1 km away
   (9410230, Scripps Pier), versus 16-22 km in the South Bay. San Diego beaches are far
   better served by NOAA than the South Bay is.

## Produced

Updated OQ-1 in `intent/001-tide-fetch.md` from an open risk to a measured, resolved finding.
No application code written yet.
