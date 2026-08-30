# 010 — README and issues

- **Date:** 2026-08-29
- **Sequence:** 10
- **Intent:** Make the project reviewable — replace the one-line README and file the open
  questions as trackable issues.
- **Status:** complete

## Prompt (verbatim)

> do the readme and issues

## What happened

**README** replaced (was literally `# Tidewatch`). Covers what the app does, the four
beaches and their borrowed stations, how to run it, the measured-vs-modelled table, the
uncalibrated-scores caveat, and the repo layout. It points readers at `intent/` and
`prompts/` as the real entry points, and notes that several findings exist only there —
NOAA's `date=today` ignoring `range`, the marine grid collapse, and the scoring component
that silently returned zero.

Caught while writing it: I listed a `TideStrip.tsx` in the layout section that has never
existed. The file is `DayStrip.tsx`. Corrected against `ls` rather than memory.

**Four issues filed**, one per open question, each linking to the intent document it came from:

| # | Title | Severity |
|---|---|---|
| 1 | OQ-5: Beach profiles are uncalibrated, so surf scores cannot be trusted | high |
| 2 | OQ-3: No observation log, so accuracy can never be verified | root blocker |
| 3 | OQ-4: No caching — every page view triggers 5 upstream requests | blocking at launch |
| 4 | OQ-6: Two grid resolutions blended into one score | low |

Issues work on a private repo, so these are useful for tracking even before anyone else has
access.

Relative links (`intent/004-...md`) do not resolve from GitHub issue bodies — they are not
rewritten to `/blob/main/` the way README links are. All four issues were edited to use
full blob URLs, and the links were checked for HTTP 200 rather than assumed.

## Still not addressed

The repo remains **private** with one collaborator, and the app runs only on localhost. The
README and issues are ready for an audience that cannot yet reach them. Making it public or
deploying it were not part of this prompt.

## Produced

`README.md`, and issues #1–#4.
