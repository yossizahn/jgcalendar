import { months } from "@hebcal/hdate"
import { describe, expect, it } from "vitest"
import { buildEventBody, formValuesFromEvent } from "./event"
import type { GEvent } from "./google"
import { HDate } from "./hebrew"

const base: GEvent = {
  id: "e1",
  htmlLink: "#",
  summary: "Yahrzeit",
  start: { date: "2026-02-02" },
  end: { date: "2026-02-03" },
  recurrence: ["RRULE:FREQ=YEARLY;RSCALE=HEBREW;SKIP=BACKWARD;COUNT=5", "EXDATE;VALUE=DATE:20270123"],
  reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 900 }] },
}

describe("formValuesFromEvent", () => {
  it("reads an all-day event back into form values", () => {
    const v = formValuesFromEvent(base)!
    expect(v.title).toBe("Yahrzeit")
    expect(v.allDay).toBe(true)
    expect(v.spec.start.toString()).toBe(new HDate(15, months.SHVAT, 5786).toString())
    expect(v.spec.freq).toBe("YEARLY")
    expect(v.spec.skip).toBe("BACKWARD")
    expect(v.spec.end).toEqual({ type: "count", count: 5 })
    expect(v.reminder).toBe(900)
    expect(v.extraRecurrence).toEqual(["EXDATE;VALUE=DATE:20270123"])
    expect(v.unsupported).toEqual([])
  })

  it("reads timed events with their own time zone", () => {
    const v = formValuesFromEvent({
      ...base,
      start: { dateTime: "2026-02-02T18:30:00+02:00", timeZone: "Asia/Jerusalem" },
      end: { dateTime: "2026-02-02T20:00:00+02:00", timeZone: "Asia/Jerusalem" },
      reminders: { useDefault: false, overrides: [{ method: "email", minutes: 30 }] },
    })!
    expect(v.allDay).toBe(false)
    expect([v.startTime, v.endTime, v.timeZone]).toEqual(["18:30", "20:00", "Asia/Jerusalem"])
    expect(v.reminder).toBe("keep") // email reminders aren't representable
  })

  it("returns null for non-Hebrew rules", () => {
    expect(formValuesFromEvent({ ...base, recurrence: ["RRULE:FREQ=YEARLY"] })).toBeNull()
  })

  it("round-trips through buildEventBody, keeping extra recurrence lines", () => {
    const v = formValuesFromEvent(base)!
    const body = buildEventBody({ ...v, calendarId: "c", extraRecurrence: v.extraRecurrence })
    // SKIP is dropped: 15 Shevat exists every year, so it has no effect.
    expect(body.recurrence).toEqual(["RRULE:FREQ=YEARLY;RSCALE=HEBREW;COUNT=5", "EXDATE;VALUE=DATE:20270123"])
    expect(body.start).toEqual(base.start)
    expect(body.reminders).toEqual(base.reminders)
  })

  it("omits reminders when keeping them", () => {
    const v = formValuesFromEvent(base)!
    expect(buildEventBody({ ...v, calendarId: "c", reminder: "keep" }).reminders).toBeUndefined()
  })

  it("clears the other kind of time when patching all-day ↔ timed", () => {
    const v = formValuesFromEvent(base)!
    const timed = buildEventBody({ ...v, calendarId: "c", allDay: false, startTime: "09:00", endTime: "10:00", timeZone: "Asia/Jerusalem" }, { patch: true })
    expect(timed.start).toEqual({ dateTime: "2026-02-02T09:00:00", timeZone: "Asia/Jerusalem", date: null })
    expect(timed.end).toEqual({ dateTime: "2026-02-02T10:00:00", timeZone: "Asia/Jerusalem", date: null })
    const allDay = buildEventBody({ ...v, calendarId: "c", allDay: true }, { patch: true })
    expect(allDay.start).toEqual({ date: "2026-02-02", dateTime: null, timeZone: null })
    // Inserts stay free of nulls.
    expect(buildEventBody({ ...v, calendarId: "c" }).start).toEqual({ date: "2026-02-02" })
  })
})
