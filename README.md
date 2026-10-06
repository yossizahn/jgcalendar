# Luach: Hebrew dates for Google Calendar

A single-page app that adds Google Calendar events repeating on the **Hebrew date**, such as birthdays, yahrzeits and anniversaries.

Google Calendar's API accepts RFC 7529 recurrence rules with `RSCALE=HEBREW` (e.g. `RRULE:FREQ=YEARLY;RSCALE=HEBREW`) and expands them correctly, but Google's own UI has no way to create them. This app fills that gap.

**Live:** https://luach.yossizahn.tech/ (also https://yossizahn.github.io/jgcalendar/)

## Features

- **Dual Hebrew/Gregorian date picker**: browse by Hebrew or Gregorian months; every day shows both dates. An "after sunset" switch handles events that happened in the evening.
- **Yearly or monthly** repetition on the Hebrew date, with an interval, and an end that is never, after N times, or on a date.
- **Edge cases handled explicitly**: when the date doesn't exist every year (30 Cheshvan/Kislev, Adar I, day 30 in monthly mode), you choose what happens (`SKIP=BACKWARD|FORWARD|OMIT`).
- **Edit existing events** (including `RSCALE=HEBREW` events created elsewhere, found with a scan of your calendars).
- **Live preview** of upcoming dates, computed locally to the RFC 7529 rules, plus the exact RRULE that will be sent.
- **Verification**: for each event the app created, Google's computed instances are compared with the expected Hebrew dates and flagged if they differ.
- **English and Hebrew** UI (full RTL, Hebrew month names and Hebrew-numeral years in the picker), plus an **About** pane explaining the background (RFC 5545 / RFC 7529).
- Runs entirely in the browser (Google Identity Services token flow; no backend).

## Setup

1. `npm install`
2. Create a Google OAuth client ID:
   - Enable the [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) for a project.
   - In [Google Auth Platform](https://console.cloud.google.com/auth/overview), configure branding (audience **External**) and add yourself as a **test user**.
   - Create a **Web application** client and add your origin (e.g. `http://localhost:5173`) to **Authorized JavaScript origins**.
3. Either put the ID in `.env.local` as `VITE_GOOGLE_CLIENT_ID=…` (see `.env.example`), or paste it into the app on first run (stored in localStorage).
4. `npm run dev`

Scopes requested: `calendar.calendarlist.readonly` (to pick a calendar), `calendar.events` (to create and delete events), and `email profile` (name and avatar in the header; optional).

## Development

| Command | |
|---|---|
| `npm run dev` | Dev server. Open `/?demo` to see the signed-in UI with fake calendars (dev only). |
| `npm test` | Unit tests (Vitest): recurrence engine and Hebrew date library |
| `npm run build` | Type-check and production build |
| `npm run lint` | oxlint |

Stack: React 19, TypeScript, Vite 8, Tailwind CSS 4, shadcn/ui (Base UI), react-day-picker 10, @hebcal/hdate.

## How it works

- `src/lib/recurrence.ts` builds the RRULE (`FREQ` first, as RFC 5545 requires), detects dates that need `SKIP`, and expands occurrences using RFC 7529 semantics (month numbering: Tishrei = 1 … Adar I = `5L`, Adar/Adar II = `6` … Elul = 12).
- `src/lib/hebrewDateLib.ts` gives react-day-picker a Hebrew-calendar `DateLib` backed by hebcal, so the picker's grid, navigation and dropdowns follow Hebrew months. (`@daypicker/hebrew` was evaluated but its month arithmetic is wrong for most months and it throws on some valid dates.)
- `src/lib/google.ts` handles the GIS token client and a minimal Calendar v3 REST client. Created events are tagged with a private extended property so the app can list them later.

**Note:** don't edit the *repeat* settings of these events in Google Calendar's UI. It can't represent Hebrew rules and will replace them. Editing the title, time or description is fine.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: lint, tests, build, then deploy to GitHub Pages. The build uses relative asset paths (`base: "./"`), so it works both at the custom domain's root and under `/jgcalendar/`; `public/jgcalendar/index.html` redirects the old path on the custom domain to the root.

To build the OAuth client ID in, set a repository **variable** `VITE_GOOGLE_CLIENT_ID`; otherwise the site asks for one on first run. Add every origin the site is served from (`https://luach.yossizahn.tech`, `https://yossizahn.github.io`) to the client's **Authorized JavaScript origins**.
