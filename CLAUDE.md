# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Luach: a client-only SPA that creates Google Calendar events recurring on Hebrew dates via `RRULE:FREQ=…;RSCALE=HEBREW` (RFC 7529). Google's API supports these rules; its UI can't create them.

## Commands

- `npm run dev`: dev server (port 5173). `/?demo` renders the signed-in UI with fake calendars (dev only, no OAuth needed).
- `npm test`: Vitest unit tests (`src/lib/*.test.ts`)
- `npm run build`: `tsc -b` + Vite build
- `npm run lint`: oxlint

## Architecture

- **Stack**: React 19 + TypeScript + Vite 8, Tailwind CSS 4, shadcn/ui on **Base UI** (not Radix: use `render` props instead of `asChild`; ToggleGroup values are arrays), react-day-picker 10, `@hebcal/hdate`, sonner.
- `src/lib/hebrew.ts`: hebcal helpers, RFC 7529 month ids (`icalMonthOf`, `hebcalMonthFor`), display names.
- `src/lib/recurrence.ts`: `RecurrenceSpec` → RRULE (`buildRRule`), SKIP edge-case detection (`skipIssue`), local occurrence expansion mirroring RFC 7529 (`expand`).
- `src/lib/hebrewDateLib.ts`: `DateLib` overrides that make react-day-picker render Hebrew months. Don't swap in `@daypicker/hebrew`; it's buggy (see README).
- `src/lib/google.ts`: GIS token client (token in sessionStorage), Calendar v3 REST calls. `src/lib/event.ts`: builds the event body and reads specs back from events.
- `src/hooks/useGoogle.ts`: auth state + calendars/events loading. `src/hooks/useTheme.ts`: light/dark theme.
- `src/i18n/`: `en.tsx` / `he.tsx` dictionaries (`he` is typed as `Messages = typeof en`, so missing keys fail type-checking); `useI18n()` gives `t`, `lang`, `dir`, `locale`. All UI text goes through it; use logical Tailwind classes (`ps-`, `ms-`, `text-start`) so RTL works. The `describe`/`skip` texts live in the dictionaries; `lib/recurrence.ts` returns data only.
- `src/components/`: `About` (background/RFC explainer, both languages), `EventForm` (form + live preview), `DualCalendar` (Hebrew/Gregorian grid toggle), `EventsList` (created events + verification against Google's instances), `Landing`, `SetupClientId`.

## Conventions

- RRULE: `FREQ` must be the first part; emit `SKIP` only when `skipIssue` says the date can be missing.
- hebcal month numbers: NISAN=1 … ELUL=6, TISHREI=7 … ADAR_I=12, ADAR_II=13 (in non-leap years plain Adar is 12).
- Path alias `@/` → `src/`. Utility `cn` comes from the `cn` package (shadcn's clsx + tailwind-merge replacement).
