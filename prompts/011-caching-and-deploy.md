# 011 — Caching, then deploy

- **Date:** 2026-08-29
- **Sequence:** 11
- **Intent:** Close OQ-4 (caching), then deploy the app.
- **Status:** complete — caching closed OQ-4; deployed anonymously to Vercel

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

**Deploy** — done, by a route that did not need credentials.

No Vercel CLI and no stored auth on this machine, and `vercel login` is interactive. But
`vercel deploy --temporary` creates an *anonymous* deployment that can be claimed into an
account afterwards, so the app went live without a login.

Verified in production: the matrix renders, day switching works, 0.53 s cold and 0.37 s
warm, and both the provenance line and the "uncalibrated estimates, not verified forecasts"
caveat survived the build.

Two caveats recorded rather than forgotten:

- An anonymous deployment **expires in 60 minutes unless claimed**. The claim URL was given
  to the user in the session and deliberately **not** written into this file — the repo is
  public, and anyone holding that code could claim the deployment into their own account.
- The deployment is a snapshot of the working tree, **not linked to the repo**. Pushes to
  `main` will not redeploy until the GitHub project is connected in the Vercel dashboard.

The repo needed no preparation: `next build` passes, zero environment variables (both APIs
are keyless), nothing host-specific in the code. The CLI added `.vercel` to `.gitignore`.

## Produced

`src/lib/noaa.ts` and `src/lib/openmeteo.ts` cached, `intent/006-caching.md`. Issue #3 closed.
A live deployment, pending claim.
