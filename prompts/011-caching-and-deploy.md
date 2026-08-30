# 011 — Caching, then deploy

- **Date:** 2026-08-29
- **Sequence:** 11
- **Intent:** Close OQ-4 (caching), then deploy the app.
- **Status:** caching complete; deploy blocked on an interactive login

## Prompt (verbatim)

> do the caching then deploy

## What happened

**Caching** — `intent/006-caching.md`. NOAA predictions cached for a day (deterministic;
the URL carries `begin_date` and rolls over at midnight), Open-Meteo for an hour (models
refresh hourly). Measured on a production build with the cache cleared: cold load 0.868 s
with 5 network fetches, warm loads 0.006 s with none. About 145x faster.

### Two measurement mistakes, both mine

1. **Counted the wrong thing.** The first probe logged a line *before* each `fetch`, so it
   counted function calls rather than network requests — it incremented by 5 on every load
   even when everything was cached. Replaced with a timer around the `fetch`: sub-millisecond
   means cache, hundreds of milliseconds means network.

2. **Measured a warm cache and called it cold.** Next persists its data cache to
   `.next/cache` across restarts, so the "first" load after a rebuild was already warm and no
   cold fetch was observed at all. Clearing `.next/cache` produced the real contrast.

Both would have produced a confident and wrong claim about whether caching worked.

**Deploy** — not done. No Vercel CLI and no credentials on this machine, and `vercel login`
is interactive. The repo itself is ready: `next build` passes, no environment variables are
needed (both APIs are keyless), and nothing in the code is host-specific.

## Produced

`src/lib/noaa.ts` and `src/lib/openmeteo.ts` cached, `intent/006-caching.md`. Issue #3 closed.
