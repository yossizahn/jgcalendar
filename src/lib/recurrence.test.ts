import { months } from "@hebcal/hdate"
import { describe as suite, expect, it } from "vitest"
import { HDate, icalMonthOf } from "./hebrew"
import { en } from "@/i18n/en"
import { he } from "@/i18n/he"
import { buildRRule, expand, parseRRule, skipIssue, type RecurrenceSpec } from "./recurrence"

const spec = (start: HDate, over: Partial<RecurrenceSpec> = {}): RecurrenceSpec => ({
  start,
  freq: "YEARLY",
  interval: 1,
  skip: "OMIT",
  end: { type: "never" },
  ...over,
})

const fmt = (hd: HDate) => `${hd.getDate()}/${hd.getMonth()}/${hd.getFullYear()}`

suite("icalMonthOf (RFC 7529 numbering)", () => {
  it("maps regular and leap months", () => {
    expect(icalMonthOf(new HDate(1, months.TISHREI, 5786))).toBe("1")
    expect(icalMonthOf(new HDate(1, months.SHVAT, 5786))).toBe("5")
    expect(icalMonthOf(new HDate(1, months.ADAR_I, 5786))).toBe("6") // regular year: Adar
    expect(icalMonthOf(new HDate(1, months.ADAR_I, 5787))).toBe("5L") // leap year: Adar I
    expect(icalMonthOf(new HDate(1, months.ADAR_II, 5787))).toBe("6")
    expect(icalMonthOf(new HDate(1, months.NISAN, 5786))).toBe("7")
    expect(icalMonthOf(new HDate(1, months.ELUL, 5786))).toBe("12")
  })
})

suite("expand YEARLY", () => {
  it("repeats on the same Hebrew date", () => {
    const occ = expand(spec(new HDate(15, months.SHVAT, 5786)), 3)
    expect(occ.map((o) => fmt(o.hdate))).toEqual(["15/11/5786", "15/11/5787", "15/11/5788"])
    expect(occ[0].date).toEqual(new Date(2026, 1, 2))
  })

  it("Adar in a regular year lands on Adar II in leap years", () => {
    const occ = expand(spec(new HDate(14, months.ADAR_I, 5786)), 3)
    expect(occ.map((o) => fmt(o.hdate))).toEqual(["14/12/5786", "14/13/5787", "14/12/5788"])
  })

  it("Adar I with OMIT only occurs in leap years", () => {
    const occ = expand(spec(new HDate(10, months.ADAR_I, 5787)), 3)
    expect(occ.map((o) => o.hdate.getFullYear())).toEqual([5787, 5790, 5793])
  })

  it("Adar I with FORWARD moves to Adar in regular years", () => {
    const occ = expand(spec(new HDate(10, months.ADAR_I, 5787), { skip: "FORWARD" }), 2)
    expect(occ.map((o) => fmt(o.hdate))).toEqual(["10/12/5787", "10/12/5788"])
    expect(occ[1].shifted).toBe(true)
  })

  it("Adar I with BACKWARD moves to Shevat in regular years", () => {
    const occ = expand(spec(new HDate(10, months.ADAR_I, 5787), { skip: "BACKWARD" }), 2)
    expect(fmt(occ[1].hdate)).toBe("10/11/5788")
  })

  it("30 Adar I + FORWARD reapplies day skip → 1 Nisan", () => {
    const occ = expand(spec(new HDate(30, months.ADAR_I, 5787), { skip: "FORWARD" }), 2)
    expect(fmt(occ[1].hdate)).toBe("1/1/5788")
  })

  it("30 Cheshvan respects SKIP in short years", () => {
    // Find a start year with a long Cheshvan, then check behaviour in following short years.
    let y = 5786
    while (HDate.daysInMonth(months.CHESHVAN, y) !== 30) y++
    const start = new HDate(30, months.CHESHVAN, y)

    const back = expand(spec(start, { skip: "BACKWARD" }), 10)
    const omit = expand(spec(start), 10)
    const fwd = expand(spec(start, { skip: "FORWARD" }), 10)
    expect(back).toHaveLength(10)
    expect(fwd).toHaveLength(10)
    for (const o of back) expect(o.hdate.getMonth()).toBe(months.CHESHVAN)
    for (const o of fwd) expect([30, 1]).toContain(o.hdate.getDate())
    for (const o of omit) expect(o.hdate.getDate()).toBe(30)
    // OMIT skips some years, so 10 results span more years.
    expect(omit[9].hdate.getFullYear()).toBeGreaterThan(back[9].hdate.getFullYear())
  })

  it("honours INTERVAL, COUNT and UNTIL", () => {
    const start = new HDate(1, months.NISAN, 5786)
    expect(expand(spec(start, { interval: 2 }), 3).map((o) => o.hdate.getFullYear())).toEqual([5786, 5788, 5790])
    expect(expand(spec(start, { end: { type: "count", count: 2 } }), 10)).toHaveLength(2)
    const until = new HDate(1, months.NISAN, 5788).greg()
    expect(expand(spec(start, { end: { type: "until", until } }), 10)).toHaveLength(3)
  })

  it("COUNT includes occurrences before `from`", () => {
    const start = new HDate(1, months.NISAN, 5780)
    const occ = expand(spec(start, { end: { type: "count", count: 8 } }), 10, new HDate(1, months.TISHREI, 5786).greg())
    expect(occ.map((o) => o.hdate.getFullYear())).toEqual([5786, 5787])
  })
})

suite("expand MONTHLY", () => {
  it("walks every Hebrew month including Adar I/II", () => {
    const occ = expand(spec(new HDate(5, months.SHVAT, 5787), { freq: "MONTHLY" }), 4)
    expect(occ.map((o) => o.hdate.getMonth())).toEqual([months.SHVAT, months.ADAR_I, months.ADAR_II, months.NISAN])
  })

  it("day 30 with OMIT skips 29-day months; BACKWARD uses the 29th", () => {
    const start = new HDate(30, months.TISHREI, 5786)
    const omit = expand(spec(start, { freq: "MONTHLY" }), 6)
    for (const o of omit) expect(o.hdate.getDate()).toBe(30)
    const back = expand(spec(start, { freq: "MONTHLY", skip: "BACKWARD" }), 12)
    expect(new Set(back.map((o) => o.hdate.getMonth())).size).toBe(12)
  })
})

suite("skipIssue", () => {
  it("only flags dates that can be missing", () => {
    expect(skipIssue(spec(new HDate(15, months.SHVAT, 5786)))).toBeNull()
    expect(skipIssue(spec(new HDate(30, months.SHVAT, 5786)))).toBeNull() // Shevat always has 30
    expect(skipIssue(spec(new HDate(10, months.ADAR_I, 5787)))?.kind).toBe("leap-month")
    expect(skipIssue(spec(new HDate(1, months.KISLEV, 5786)))).toBeNull()
    expect(skipIssue({ start: new HDate(30, months.TISHREI, 5786), freq: "MONTHLY" })?.kind).toBe("monthly-30")
  })
})

suite("buildRRule", () => {
  it("puts FREQ first and RSCALE second", () => {
    expect(buildRRule(spec(new HDate(15, months.SHVAT, 5786)), { allDay: true })).toBe("RRULE:FREQ=YEARLY;RSCALE=HEBREW")
  })

  it("adds INTERVAL, COUNT, and SKIP only when relevant", () => {
    const s = spec(new HDate(15, months.SHVAT, 5786), { freq: "MONTHLY", interval: 2, skip: "BACKWARD", end: { type: "count", count: 5 } })
    expect(buildRRule(s, { allDay: true })).toBe("RRULE:FREQ=MONTHLY;RSCALE=HEBREW;INTERVAL=2;COUNT=5")
    const s30 = { ...s, start: new HDate(30, months.TISHREI, 5786) }
    expect(buildRRule(s30, { allDay: true })).toBe("RRULE:FREQ=MONTHLY;RSCALE=HEBREW;INTERVAL=2;SKIP=BACKWARD;COUNT=5")
  })

  it("formats UNTIL as DATE for all-day and UTC for timed events", () => {
    const s = spec(new HDate(15, months.SHVAT, 5786), { end: { type: "until", until: new Date(2030, 0, 31) } })
    expect(buildRRule(s, { allDay: true })).toMatch(/;UNTIL=20300131$/)
    expect(buildRRule(s, { allDay: false })).toMatch(/;UNTIL=203\d{5}T\d{6}Z$/)
  })

  it("round-trips through parseRRule", () => {
    expect(parseRRule("RRULE:FREQ=YEARLY;RSCALE=HEBREW;SKIP=FORWARD;COUNT=3")).toEqual({
      freq: "YEARLY", interval: 1, skip: "FORWARD", count: 3, until: undefined, unsupported: [],
    })
    expect(parseRRule("RRULE:FREQ=YEARLY;RSCALE=HEBREW;BYMONTH=5L;BYMONTHDAY=10")?.unsupported).toEqual(["BYMONTH", "BYMONTHDAY"])
    expect(parseRRule("RRULE:FREQ=YEARLY")).toBeNull()
  })
})

suite("describe", () => {
  it("reads naturally in English", () => {
    expect(en.describe(spec(new HDate(15, months.SHVAT, 5786)))).toBe("Every year on 15 Shevat")
    expect(en.describe(spec(new HDate(14, months.ADAR_I, 5786)))).toBe("Every year on 14 Adar (Adar II in leap years)")
    expect(en.describe(spec(new HDate(1, months.NISAN, 5786), { freq: "MONTHLY", interval: 2 }))).toBe("Every 2 Hebrew months on the 1st")
  })

  it("reads naturally in Hebrew", () => {
    expect(he.describe(spec(new HDate(15, months.SHVAT, 5786)))).toBe("בכל שנה בט״ו בשבט")
    expect(he.describe(spec(new HDate(14, months.ADAR_I, 5786)))).toBe("בכל שנה בי״ד באדר (באדר ב׳ בשנים מעוברות)")
    expect(he.describe(spec(new HDate(1, months.NISAN, 5786), { freq: "MONTHLY", interval: 2 }))).toBe("כל 2 חודשים עבריים, בא׳ לחודש")
  })
})
