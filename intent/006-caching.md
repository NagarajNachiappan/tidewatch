# 006 — Caching

- **Status:** built and verified — 2026-08-29
- **Slice:** 6 of n
- **Closes:** OQ-4, issue #3

---

## 1. Goal

Stop hitting NOAA and Open-Meteo once per visitor. Required before any deploy.

## 2. Two freshness profiles, because the data differs

| Source | TTL | Why |
|---|---|---|
| NOAA predictions | **86 400 s** (1 day) | Computed from harmonic constants, not observed. The answer for a given station and `begin_date` never changes. The request URL carries `begin_date`, so it rolls over on its own at midnight. |
| Open-Meteo marine and forecast | **3 600 s** (1 hour) | Open-Meteo re-runs its models roughly hourly; anything shorter spends requests on unchanged data. |

Implemented as `next: { revalidate }` on each `fetch`, replacing `cache: 'no-store'`.

## 3. Acceptance criteria

1. ✅ A cold cache makes 5 network fetches; subsequent loads make none.
2. ✅ Page time drops accordingly.
3. ✅ `npm test` passes and `tsc --noEmit` is clean.
4. ✅ `next build` succeeds.

## 4. Measured

Against a production build with `.next/cache` cleared:

| Load | Page time | Network fetches |
|---|---|---|
| 1 (cold) | 0.868 s | **5** — NOAA 328/333/351 ms, marine 798 ms, forecast 816 ms |
| 2 (warm) | 0.008 s | 0 |
| 3 (warm) | 0.006 s | 0 |

About **145× faster**, and five fewer upstream requests per visitor.

## 5. A measurement mistake worth recording

The first attempt logged a line immediately *before* each `fetch` and counted the lines.
That counts **function calls, not network requests** — the counter incremented by 5 on
every load even when every fetch was served from cache, which would have read as "caching
is not working" while the page times said otherwise.

Replaced with a timer around the `fetch` itself: a cache hit returns in well under a
millisecond, a real round trip takes hundreds. That distinguishes the two unambiguously.

A second trap followed: Next persists its data cache to `.next/cache` **across restarts**,
so the first measurement after a rebuild was already warm and no cold fetch was ever
observed. `.next/cache` has to be cleared to see the real cold path.

## 6. Not covered

Cache invalidation on demand, per-station TTLs, and any CDN-level caching a host adds on
top. Nothing here depends on the host — it is all Next's data cache.
