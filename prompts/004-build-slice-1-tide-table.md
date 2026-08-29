# 004 — Build slice 1: today's tide table

- **Date:** 2026-08-29
- **Sequence:** 4
- **Intent:** Implement `intent/001-tide-fetch.md` — a Next.js page showing today's tide
  table for NOAA station 9410840.
- **Status:** complete — all seven acceptance criteria met

## Prompt (verbatim)

> build slice 1

## What happened

Scaffolded by hand rather than with `create-next-app`, to keep the structure the intent
doc specified. Next 16.3.3, React 19.2.8, TypeScript 7.0.2, Node 24.16.0.

```
src/lib/types.ts     Tide, TideDay
src/lib/noaa.ts      fetchTideDay() + NoaaError
src/lib/format.ts    clock / date / height display helpers
src/app/page.tsx     server component, hard-coded to 9410840
src/app/TideTable.tsx
src/app/layout.tsx, globals.css
```

**Verified against the running server**, not just typechecked. Rendered output matched the
NOAA endpoint row for row: 0.168→0.2 ft, 5.084→5.1 ft, 1.24→1.2 ft, 5.391→5.4 ft.

### One assumption in the intent doc turned out to be wrong

The doc claimed NOAA reports failures as **HTTP 200** with a JSON error body. Probing the
live API showed it returns **HTTP 400** — and for a bad `product` the body is **plain text,
not JSON**. The first implementation followed the doc, so on a 400 it threw a bare
"NOAA returned HTTP 400 Bad Request" and discarded the actual explanation.

Fixed: read the body as text once, attempt a JSON parse, fall back to trimmed plain text,
and surface the message on both 4xx and 200-with-error-body. A bad station now renders
"NOAA rejected the request: The station is not a valid station or there is system error."
`intent/001-tide-fetch.md` corrected to match.

### Testing note

The first error-path run raced Next's hot reload and reported results one edit behind —
the labels were wrong, not the code. Re-ran polling until each recompile landed. Sources
were restored and the page verified byte-identical to baseline afterwards.

### Unprompted files

`next dev` generated `AGENTS.md` and `CLAUDE.md` on first run and rewrote `tsconfig.json`
(`jsx` to `react-jsx`, added `.next/dev/types`). Left in place; disable with
`agentRules: false` in `next.config.ts` if unwanted.

## Produced

A working vertical slice: upstream HTTP → parse → type → server render → browser.
Nothing committed yet.
