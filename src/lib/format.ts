/** "tomorrow", "in 3 weeks", "in 5 months", "2 years ago" in the given locale. */
export function relativeFromToday(date: Date, locale?: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000)
  const abs = Math.abs(days)
  if (abs < 14) return rtf.format(days, "day")
  if (abs < 60) return rtf.format(Math.round(days / 7), "week")
  if (abs < 335) return rtf.format(Math.round(days / 30.44), "month")
  return rtf.format(Math.round(days / 365.25), "year")
}
