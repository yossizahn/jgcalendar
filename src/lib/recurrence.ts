import { months } from "@hebcal/hdate"
import { HDate, type IcalHebrewMonth, hebcalMonthFor, icalMonthOf, monthsOfYear } from "./hebrew"

export type Freq = "YEARLY" | "MONTHLY"
export type Skip = "OMIT" | "BACKWARD" | "FORWARD"
export type RecurrenceEnd =
  | { type: "never" }
  | { type: "count"; count: number }
  | { type: "until"; until: Date }

export interface RecurrenceSpec {
  /** First occurrence (= DTSTART), as a Hebrew date. */
  start: HDate
  freq: Freq
  interval: number
  skip: Skip
  end: RecurrenceEnd
}

export interface Occurrence {
  hdate: HDate
  date: Date
  /** True when SKIP moved this occurrence off the nominal Hebrew date. */
  shifted: boolean
}

/* ------------------------------------------------------------------ */
/* RRULE                                                               */
/* ------------------------------------------------------------------ */

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0")
}

export function toIcalDate(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

/**
 * Build the RRULE string. FREQ must come first for RFC 5545 back-compat; SKIP is only
 * emitted when it differs from the default (OMIT) and can actually matter.
 */
export function buildRRule(spec: RecurrenceSpec, opts: { allDay: boolean }): string {
  const parts = [`FREQ=${spec.freq}`, "RSCALE=HEBREW"]
  if (spec.interval > 1) parts.push(`INTERVAL=${spec.interval}`)
  if (spec.skip !== "OMIT" && skipIssue(spec)) parts.push(`SKIP=${spec.skip}`)
  if (spec.end.type === "count") parts.push(`COUNT=${spec.end.count}`)
  if (spec.end.type === "until") {
    const u = spec.end.until
    if (opts.allDay) {
      parts.push(`UNTIL=${toIcalDate(u)}`)
    } else {
      // End of that local day, expressed in UTC (required for timed events).
      const eod = new Date(u.getFullYear(), u.getMonth(), u.getDate(), 23, 59, 59)
      const iso = eod.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
      parts.push(`UNTIL=${iso}`)
    }
  }
  return `RRULE:${parts.join(";")}`
}

/* ------------------------------------------------------------------ */
/* Skip analysis                                                       */
/* ------------------------------------------------------------------ */

export interface SkipIssue {
  /**
   * - "monthly-30": monthly on the 30th; about half of Hebrew months have 29 days.
   * - "leap-month": yearly in Adar I, which only exists in leap years.
   * - "day-30": yearly on 30 Cheshvan/Kislev, which sometimes have 29 days.
   */
  kind: "monthly-30" | "leap-month" | "day-30"
  day: number
  /** hebcal month of the start date. */
  month: number
  recommended: Skip
}

/** Describes why the chosen date doesn't exist in some years/months, or null if it always does. */
export function skipIssue(spec: Pick<RecurrenceSpec, "start" | "freq">): SkipIssue | null {
  const day = spec.start.getDate()
  const month = spec.start.getMonth()
  if (spec.freq === "MONTHLY") return day === 30 ? { kind: "monthly-30", day, month, recommended: "BACKWARD" } : null
  if (icalMonthOf(spec.start) === "5L") return { kind: "leap-month", day, month, recommended: "FORWARD" }
  if (day === 30 && (month === months.CHESHVAN || month === months.KISLEV)) return { kind: "day-30", day, month, recommended: "BACKWARD" }
  return null
}

/* ------------------------------------------------------------------ */
/* Occurrence expansion (local mirror of what Google should compute)   */
/* ------------------------------------------------------------------ */

function resolveDay(day: number, month: number, year: number, skip: Skip): { hd: HDate; shifted: boolean } | null {
  const dim = HDate.daysInMonth(month, year)
  if (day <= dim) return { hd: new HDate(day, month, year), shifted: false }
  if (skip === "OMIT") return null
  if (skip === "BACKWARD") return { hd: new HDate(dim, month, year), shifted: true }
  return { hd: new HDate(dim, month, year).next(), shifted: true }
}

function resolveYearly(ical: IcalHebrewMonth, day: number, year: number, skip: Skip) {
  let month = hebcalMonthFor(ical, year)
  let shifted = false
  if (month === null) {
    // Only "5L" (Adar I) can be missing.
    if (skip === "OMIT") return null
    month = skip === "BACKWARD" ? months.SHVAT : months.ADAR_I // ADAR_I == plain Adar in a regular year
    shifted = true
  }
  const r = resolveDay(day, month, year, skip)
  return r && { hd: r.hd, shifted: shifted || r.shifted }
}

/** Iterate (month, year) pairs in Hebrew calendar order starting at the given month. */
function* hebrewMonthsFrom(month: number, year: number) {
  let y = year
  let list = monthsOfYear(y)
  let i = list.indexOf(month)
  for (;;) {
    yield { month: list[i], year: y }
    i++
    if (i >= list.length) {
      y++
      list = monthsOfYear(y)
      i = 0
    }
  }
}

/**
 * Expand the rule. `from` filters out earlier occurrences (they still count toward COUNT).
 */
export function expand(spec: RecurrenceSpec, limit: number, from?: Date): Occurrence[] {
  const out: Occurrence[] = []
  const day = spec.start.getDate()
  const ical = icalMonthOf(spec.start)
  const until = spec.end.type === "until" ? spec.end.until : null
  const maxCount = spec.end.type === "count" ? spec.end.count : Infinity
  const fromTime = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime() : -Infinity
  let produced = 0

  const emit = (r: { hd: HDate; shifted: boolean } | null) => {
    if (!r) return "continue"
    const date = r.hd.greg()
    if (until && date.getTime() > until.getTime()) return "stop"
    produced++
    if (date.getTime() >= fromTime) out.push({ hdate: r.hd, date, shifted: r.shifted })
    if (produced >= maxCount || out.length >= limit) return "stop"
    return "continue"
  }

  // Hard cap to avoid infinite loops with OMIT + sparse matches.
  const MAX_ITER = 5000

  if (spec.freq === "YEARLY") {
    for (let n = 0; n < MAX_ITER; n++) {
      const y = spec.start.getFullYear() + n * spec.interval
      if (emit(resolveYearly(ical, day, y, spec.skip)) === "stop") break
    }
  } else {
    let n = 0
    for (const { month, year } of hebrewMonthsFrom(spec.start.getMonth(), spec.start.getFullYear())) {
      if (n >= MAX_ITER) break
      if (n % spec.interval === 0 && emit(resolveDay(day, month, year, spec.skip)) === "stop") break
      n++
    }
  }
  return out
}

/** Parse the bits of an RSCALE=HEBREW RRULE we generate, for display in the events list. */
const SUPPORTED_PARTS = new Set(["FREQ", "RSCALE", "INTERVAL", "SKIP", "COUNT", "UNTIL", "WKST"])

export interface ParsedRRule {
  freq?: Freq
  interval: number
  skip?: Skip
  count?: number
  until?: string
  /** Rule parts the editor can't represent (e.g. BYMONTH); saving would drop them. */
  unsupported: string[]
}

export function parseRRule(rrule: string): ParsedRRule | null {
  if (!/RSCALE=HEBREW/i.test(rrule)) return null
  const body = rrule.replace(/^RRULE:/i, "")
  const map = Object.fromEntries(body.split(";").map((p) => p.split("=") as [string, string]).map(([k, v]) => [k.toUpperCase(), v]))
  const freq = map.FREQ === "YEARLY" || map.FREQ === "MONTHLY" ? map.FREQ : undefined
  const unsupported = Object.keys(map).filter((k) => !SUPPORTED_PARTS.has(k))
  if (map.FREQ && !freq) unsupported.unshift(`FREQ=${map.FREQ}`)
  return {
    unsupported,
    freq,
    interval: map.INTERVAL ? Number(map.INTERVAL) : 1,
    skip: (["OMIT", "BACKWARD", "FORWARD"] as const).find((s) => s === map.SKIP),
    count: map.COUNT ? Number(map.COUNT) : undefined,
    until: map.UNTIL,
  }
}
