import { HDate, Locale, gematriya, months } from "@hebcal/hdate"

export { HDate }

/**
 * RFC 7529 month identifiers for RSCALE=HEBREW.
 * Tishrei = 1 … Shevat = 5, Adar I = "5L" (leap years only), Adar / Adar II = 6, … Elul = 12.
 */
export type IcalHebrewMonth =
  | "1" | "2" | "3" | "4" | "5" | "5L" | "6" | "7" | "8" | "9" | "10" | "11" | "12"

const HEBCAL_TO_ICAL: Record<number, IcalHebrewMonth> = {
  [months.TISHREI]: "1",
  [months.CHESHVAN]: "2",
  [months.KISLEV]: "3",
  [months.TEVET]: "4",
  [months.SHVAT]: "5",
  // ADAR_I / ADAR_II handled separately (depends on leap year)
  [months.NISAN]: "7",
  [months.IYYAR]: "8",
  [months.SIVAN]: "9",
  [months.TAMUZ]: "10",
  [months.AV]: "11",
  [months.ELUL]: "12",
}

/** RFC 7529 month id of a Hebrew date. */
export function icalMonthOf(hd: HDate): IcalHebrewMonth {
  const m = hd.getMonth()
  const leap = HDate.isLeapYear(hd.getFullYear())
  if (m === months.ADAR_I) return leap ? "5L" : "6"
  if (m === months.ADAR_II) return "6"
  return HEBCAL_TO_ICAL[m]
}

/** hebcal month number for an RFC 7529 month id in a given Hebrew year, or null if it doesn't exist that year. */
export function hebcalMonthFor(ical: IcalHebrewMonth, year: number): number | null {
  const leap = HDate.isLeapYear(year)
  if (ical === "5L") return leap ? months.ADAR_I : null
  if (ical === "6") return leap ? months.ADAR_II : months.ADAR_I
  const entry = Object.entries(HEBCAL_TO_ICAL).find(([, v]) => v === ical)
  return Number(entry![0])
}

/** Hebrew months of a year in calendar order (Tishrei first). */
export function monthsOfYear(year: number): number[] {
  const adars = HDate.isLeapYear(year) ? [months.ADAR_I, months.ADAR_II] : [months.ADAR_I]
  return [
    months.TISHREI, months.CHESHVAN, months.KISLEV, months.TEVET, months.SHVAT,
    ...adars,
    months.NISAN, months.IYYAR, months.SIVAN, months.TAMUZ, months.AV, months.ELUL,
  ]
}

export type DisplayLang = "en" | "he"

/** Friendlier English transliterations than hebcal's defaults ("Sh'vat" → "Shevat"). */
const NICE_NAMES: Record<string, string> = {
  "Sh'vat": "Shevat",
  "Iyyar": "Iyar",
  "Tamuz": "Tammuz",
}

export function monthName(month: number, year: number, lang: DisplayLang = "en"): string {
  const raw = HDate.getMonthName(month, year)
  if (lang === "he") return Locale.gettext(raw, "he-x-NoNikud")
  return NICE_NAMES[raw] ?? raw
}

/** Month name as used in recurring descriptions: "Adar" in a non-leap year is really "Adar (II in leap years)". */
export function icalMonthLabel(ical: IcalHebrewMonth, lang: DisplayLang = "en"): string {
  if (ical === "5L") return monthName(months.ADAR_I, 5787, lang) // Adar I
  if (ical === "6") return monthName(months.ADAR_I, 5786, lang) // plain Adar
  return monthName(hebcalMonthFor(ical, 5785)!, 5785, lang)
}

/** Day of month: "15" in English, "ט״ו" in Hebrew. */
export function hebrewDay(day: number, lang: DisplayLang = "en"): string {
  return lang === "he" ? gematriya(day) : String(day)
}

/** Year: "5786" in English, "תשפ״ו" in Hebrew. */
export function hebrewYear(year: number, lang: DisplayLang = "en"): string {
  return lang === "he" ? gematriya(year) : String(year)
}

/** "15 Shevat 5786" / "ט״ו שבט תשפ״ו" */
export function formatHebrew(hd: HDate, opts: { year?: boolean; lang?: DisplayLang } = {}): string {
  const lang = opts.lang ?? "en"
  const base = `${hebrewDay(hd.getDate(), lang)} ${monthName(hd.getMonth(), hd.getFullYear(), lang)}`
  return opts.year === false ? base : `${base} ${hebrewYear(hd.getFullYear(), lang)}`
}

/** "ט״ו שבט תשפ״ו" */
export function formatHebrewNative(hd: HDate): string {
  return hd.renderGematriya(true)
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
