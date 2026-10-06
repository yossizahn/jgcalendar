import { APP_MARKER, type GEvent } from "./google"
import { HDate, icalMonthOf } from "./hebrew"
import { buildRRule, parseRRule, type RecurrenceSpec } from "./recurrence"

/** "default" = calendar's default reminders; "none"; minutes before start; or "keep" (editing: leave as is). */
export type Reminder = "default" | "none" | "keep" | number

export interface EventDraft {
  title: string
  description: string
  calendarId: string
  allDay: boolean
  /** "HH:mm" */
  startTime: string
  endTime: string
  timeZone: string
  spec: RecurrenceSpec
  reminder: Reminder
  /** Non-RRULE recurrence lines (EXDATE, RDATE…) to keep when editing. */
  extraRecurrence?: string[]
}

const pad = (n: number) => String(n).padStart(2, "0")
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export function buildEventBody(draft: EventDraft): Partial<GEvent> {
  const startDay = draft.spec.start.greg()
  const rrule = buildRRule(draft.spec, { allDay: draft.allDay })

  let start: GEvent["start"]
  let end: GEvent["end"]
  if (draft.allDay) {
    start = { date: ymd(startDay) }
    end = { date: ymd(addDays(startDay, 1)) }
  } else {
    const endsNextDay = draft.endTime <= draft.startTime
    start = { dateTime: `${ymd(startDay)}T${draft.startTime}:00`, timeZone: draft.timeZone }
    end = { dateTime: `${ymd(endsNextDay ? addDays(startDay, 1) : startDay)}T${draft.endTime}:00`, timeZone: draft.timeZone }
  }

  const reminders: GEvent["reminders"] | undefined =
    draft.reminder === "keep"
      ? undefined
      : draft.reminder === "default"
        ? { useDefault: true }
        : draft.reminder === "none"
          ? { useDefault: false, overrides: [] }
          : { useDefault: false, overrides: [{ method: "popup", minutes: draft.reminder }] }

  return {
    summary: draft.title.trim(),
    // "" (not undefined) so that clearing the description in an edit actually clears it.
    description: draft.description.trim(),
    start,
    end,
    recurrence: [rrule, ...(draft.extraRecurrence ?? [])],
    reminders,
    extendedProperties: {
      private: {
        [APP_MARKER.key]: APP_MARKER.value,
        hebrewDay: String(draft.spec.start.getDate()),
        hebrewMonth: icalMonthOf(draft.spec.start),
      },
    },
  }
}

export type ReminderLabel = "default" | "none" | "dayBefore9" | "weekBefore9" | "min10" | "hour1" | "day1"

/** Reminder choices; `label` is a key into the translations' `reminders` section. */
export const REMINDER_OPTIONS: { allDay: boolean; value: Reminder; label: ReminderLabel }[] = [
  { allDay: true, value: "default", label: "default" },
  { allDay: true, value: "none", label: "none" },
  { allDay: true, value: 15 * 60, label: "dayBefore9" },
  { allDay: true, value: 6 * 24 * 60 + 15 * 60, label: "weekBefore9" },
  { allDay: false, value: "default", label: "default" },
  { allDay: false, value: "none", label: "none" },
  { allDay: false, value: 10, label: "min10" },
  { allDay: false, value: 60, label: "hour1" },
  { allDay: false, value: 24 * 60, label: "day1" },
]

/* ------------------------------------------------------------------ */
/* Reading events back                                                 */
/* ------------------------------------------------------------------ */

/** The calendar day of an event time, in the event's own time zone. */
export function eventYmd(t: GEvent["start"]): string {
  return t.date ?? t.dateTime!.slice(0, 10)
}

export function ymdToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Reconstruct a RecurrenceSpec from an event we created (or any RSCALE=HEBREW event). */
export function specFromEvent(e: GEvent): RecurrenceSpec | null {
  const rule = e.recurrence?.find((r) => r.startsWith("RRULE:"))
  const parsed = rule ? parseRRule(rule) : null
  if (!parsed?.freq) return null
  let end: RecurrenceSpec["end"] = { type: "never" }
  if (parsed.count) end = { type: "count", count: parsed.count }
  else if (parsed.until) {
    const u = parsed.until
    end = { type: "until", until: new Date(Number(u.slice(0, 4)), Number(u.slice(4, 6)) - 1, Number(u.slice(6, 8))) }
  }
  return {
    start: new HDate(ymdToDate(eventYmd(e.start))),
    freq: parsed.freq,
    interval: parsed.interval,
    skip: parsed.skip ?? "OMIT",
    end,
  }
}

/** Form values for editing an existing event. */
export interface EventFormValues {
  title: string
  description: string
  allDay: boolean
  startTime: string
  endTime: string
  timeZone: string
  spec: RecurrenceSpec
  reminder: Reminder
  extraRecurrence: string[]
  /** RRULE parts that will be lost on save. */
  unsupported: string[]
}

export function formValuesFromEvent(e: GEvent): EventFormValues | null {
  const spec = specFromEvent(e)
  const rule = e.recurrence?.find((r) => r.startsWith("RRULE:"))
  if (!spec || !rule) return null
  const allDay = Boolean(e.start.date)
  const time = (t: GEvent["start"]) => t.dateTime?.slice(11, 16) ?? ""

  let reminder: Reminder = "keep"
  const r = e.reminders
  if (!r || r.useDefault) reminder = "default"
  else if (!r.overrides?.length) reminder = "none"
  else if (r.overrides.length === 1 && r.overrides[0].method === "popup") {
    const minutes = r.overrides[0].minutes
    if (REMINDER_OPTIONS.some((o) => o.allDay === allDay && o.value === minutes)) reminder = minutes
  }

  return {
    title: e.summary ?? "",
    description: e.description ?? "",
    allDay,
    startTime: allDay ? "09:00" : time(e.start),
    endTime: allDay ? "10:00" : time(e.end),
    timeZone: e.start.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    spec,
    reminder,
    extraRecurrence: (e.recurrence ?? []).filter((l) => l !== rule),
    unsupported: parseRRule(rule)?.unsupported ?? [],
  }
}
