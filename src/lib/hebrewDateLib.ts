/**
 * Hebrew-calendar overrides for react-day-picker's DateLib, backed by @hebcal/core.
 *
 * DayPicker works on JS Dates; these overrides redefine what a "month" and "year" are
 * (Hebrew months, Tishrei-first years, Adar I/II in leap years) so the grid, navigation and
 * dropdowns follow the Hebrew calendar. Days and weeks are unchanged.
 *
 * (We don't use @daypicker/hebrew: its month arithmetic drifts from the real calendar and throws
 * on valid dates, e.g. Elul in a non-leap year.)
 */
import { months } from "@hebcal/hdate"
import { format as dfFormat } from "date-fns"
import type { DateLib } from "react-day-picker"
import { type DisplayLang, HDate, hebrewDay, hebrewYear, monthName, monthsOfYear } from "./hebrew"

type Interval = { start: Date | number | string; end: Date | number | string }

const toDate = (d: Date | number | string) => (d instanceof Date ? d : new Date(d))
const h = (d: Date | number | string) => new HDate(toDate(d))

/** Months elapsed from the epoch to Tishrei of `year` (standard molad arithmetic). */
function monthsBeforeYear(year: number): number {
  const y = year - 1
  return 235 * Math.floor(y / 19) + 12 * (y % 19) + Math.floor((7 * (y % 19) + 1) / 19)
}

/** 0-based index of a hebcal month within its (Tishrei-first) year. */
function monthIndex(hd: HDate): number {
  return monthsOfYear(hd.getFullYear()).indexOf(hd.getMonth())
}

/** Absolute month number since the epoch. */
function absMonth(hd: HDate): number {
  return monthsBeforeYear(hd.getFullYear()) + monthIndex(hd)
}

/** Inverse of absMonth: [year, hebcal month]. */
function fromAbsMonth(abs: number): [number, number] {
  let year = Math.floor((abs * 19) / 235) + 1
  while (monthsBeforeYear(year) > abs) year--
  while (monthsBeforeYear(year + 1) <= abs) year++
  return [year, monthsOfYear(year)[abs - monthsBeforeYear(year)]]
}

/** Build a date, clamping the day to the month's length (like date-fns does for setMonth). */
function make(day: number, month: number, year: number): Date {
  return new HDate(Math.min(day, HDate.daysInMonth(month, year)), month, year).greg()
}

function startOfMonth(date: Date | number | string): Date {
  const hd = h(date)
  return new HDate(1, hd.getMonth(), hd.getFullYear()).greg()
}

function endOfMonth(date: Date | number | string): Date {
  const hd = h(date)
  return make(30, hd.getMonth(), hd.getFullYear())
}

function startOfYear(date: Date | number | string): Date {
  return new HDate(1, months.TISHREI, h(date).getFullYear()).greg()
}

function endOfYear(date: Date | number | string): Date {
  return new HDate(29, months.ELUL, h(date).getFullYear()).greg()
}

function addMonths(date: Date | number | string, amount: number): Date {
  const hd = h(date)
  const [year, month] = fromAbsMonth(absMonth(hd) + amount)
  return make(hd.getDate(), month, year)
}

function setYear(date: Date | number | string, year: number): Date {
  const hd = h(date)
  let month = hd.getMonth()
  // Adar II / Adar I don't exist in a regular year: use plain Adar.
  if (!HDate.isLeapYear(year) && month === months.ADAR_II) month = months.ADAR_I
  return make(hd.getDate(), month, year)
}

function setMonth(date: Date | number | string, index: number): Date {
  const hd = h(date)
  const list = monthsOfYear(hd.getFullYear())
  return make(hd.getDate(), list[Math.max(0, Math.min(index, list.length - 1))], hd.getFullYear())
}

function eachMonthOfInterval(interval: Interval): Date[] {
  const a = absMonth(h(interval.start))
  const b = absMonth(h(interval.end))
  const out: Date[] = []
  for (let m = a; m <= b; m++) {
    const [year, month] = fromAbsMonth(m)
    out.push(new HDate(1, month, year).greg())
  }
  return out
}

function eachYearOfInterval(interval: Interval): Date[] {
  const a = h(interval.start).getFullYear()
  const b = h(interval.end).getFullYear()
  const out: Date[] = []
  for (let y = a; y <= b; y++) out.push(new HDate(1, months.TISHREI, y).greg())
  return out
}

function makeFormat(lang: DisplayLang) {
  return function format(date: Date | number | string, formatStr: string, options?: Parameters<typeof dfFormat>[2]): string {
    const d = toDate(date)
    const hd = new HDate(d)
    const name = () => monthName(hd.getMonth(), hd.getFullYear(), lang)
    const year = () => hebrewYear(hd.getFullYear(), lang)
    switch (formatStr) {
      case "LLLL":
        return name()
      case "LLLL y":
      case "LLLL yyyy":
        return `${name()} ${year()}`
      case "y":
      case "yyyy":
        return year()
      // Used for stable month ids/keys: must be unique per *Hebrew* month.
      case "yyyy-MM":
        return `${hd.getFullYear()}-${String(monthIndex(hd) + 1).padStart(2, "0")}`
      case "M":
        return String(monthIndex(hd) + 1)
      case "MM":
        return String(monthIndex(hd) + 1).padStart(2, "0")
      case "d":
        return hebrewDay(hd.getDate(), lang)
      case "PPPP":
        // Accessible day label: both calendars.
        return `${hebrewDay(hd.getDate(), lang)} ${name()} ${year()}, ${dfFormat(d, "PPPP", options)}`
      default:
        return dfFormat(d, formatStr, options)
    }
  }
}

/** DateLib overrides for the Hebrew calendar; `lang` controls month names and year/day numerals. */
export function createHebrewDateLib(lang: DisplayLang = "en"): Partial<DateLib> {
  return {
    addMonths,
    addYears: (date, amount) => setYear(date, h(date).getFullYear() + amount),
    differenceInCalendarMonths: (left, right) => absMonth(h(left)) - absMonth(h(right)),
    eachMonthOfInterval,
    eachYearOfInterval,
    endOfMonth,
    endOfYear,
    format: makeFormat(lang) as DateLib["format"],
    getMonth: (date) => monthIndex(h(date)),
    getYear: (date) => h(date).getFullYear(),
    isSameMonth: (a, b) => absMonth(h(a)) === absMonth(h(b)),
    isSameYear: (a, b) => h(a).getFullYear() === h(b).getFullYear(),
    newDate: (year, index, day) => make(day, monthsOfYear(year)[index], year),
    setMonth,
    setYear,
    startOfMonth,
    startOfYear,
  } as Partial<DateLib>
}

export const hebrewDateLib = createHebrewDateLib("en")
