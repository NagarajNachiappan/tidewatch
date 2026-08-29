# 001 — Interview scope, then intent for first tide fetch

- **Date:** 2026-08-29
- **Sequence:** 1
- **Intent:** Establish project scope through an analyst-style interview, then write the intent doc for the smallest first slice (fetch + display today's tide table for one NOAA station).
- **Status:** complete

## Prompt (verbatim)

> Tidewatch is a Node.js app that scores beach conditions for Hermosa, Manhattan and Redondo Beach using NOAA CO-OPS tides and Open-Meteo Marine data. Interview me the way an analyst would — scope, users, constraints, what success looks like — then write intent/001-tide-fetch.md for the smallest first slice: fetch and display today's tide table for one NOAA station. Ask before assuming anything. cREATA A FOLDER NAMED pROMPTS AND NAME THEM WITH WHAT THE PROMPT INTENT IS AND STORE THEM ALOGN WITH THE SEQUENCE. thE SEQUENCE HERE WILL BE 1.SO THAT i KNOW WHAT AND HOW IT HAPPENED

## What happened

Three rounds of questions, ten in total, then the intent doc.

**Decisions reached:** public web app; all four activities scored as a beach x activity
matrix; 7-day horizon; Next.js + React + TypeScript; nearest NOAA station per beach;
slice 1 renders a local web page for Santa Monica (9410840); success measured on three
bars at once (replaces the incumbent, scores match reality, correct and up).

**Verified live against the real APIs while interviewing** (both keyless):
- NOAA CO-OPS returns today's 4 hi/lo predictions for 9410840, and 25 rows over a 7-day range.
- Open-Meteo Marine returns 7 daily forecast days for the South Bay.
- No NOAA tide station sits at any of the three beaches; Santa Monica and San Pedro
  bracket them at 16-22 km.
- All three beaches snap to the *same* Open-Meteo marine grid cell (33.875, -118.375)
  and return identical wave data. Recorded as OQ-1, the top risk to the matrix design.

**Produced:** `intent/001-tide-fetch.md`. No application code written yet.

## Convention established

Prompts are recorded in `prompts/` as `NNN-<intent-in-kebab-case>.md`, numbered in the
sequence they were given, each capturing the verbatim prompt and what resulted from it.
