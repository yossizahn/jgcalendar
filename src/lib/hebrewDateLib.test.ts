import { months } from "@hebcal/hdate"
import { DateLib } from "react-day-picker"
import { describe, expect, it } from "vitest"
import { HDate } from "./hebrew"
import { hebrewDateLib } from "./hebrewDateLib"

const lib = new DateLib({}, hebrewDateLib)
const hd = (d: Date) => new HDate(d)

describe("hebrewDateLib", () => {
  it("month boundaries match hebcal for every day 1900–2100", () => {
    for (let t = new Date(1900, 0, 1); t < new Date(2100, 0, 1); t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)) {
      const h = hd(t)
      const s = hd(lib.startOfMonth(t))
      const e = hd(lib.endOfMonth(t))
      if (s.getDate() !== 1 || s.getMonth() !== h.getMonth() || e.getMonth() !== h.getMonth() || e.getDate() !== HDate.daysInMonth(h.getMonth(), h.getFullYear())) {
        throw new Error(`Bad month bounds for ${h}: ${s} – ${e}`)
      }
    }
  })

  it("lists 12 or 13 months per year, Tishrei first, each starting on the 1st", () => {
    for (let y = 5660; y <= 5860; y++) {
      const ms = lib.eachMonthOfInterval({ start: new HDate(1, months.TISHREI, y).greg(), end: new HDate(29, months.ELUL, y).greg() })
      expect(ms).toHaveLength(HDate.monthsInYear(y))
      ms.forEach((m, i) => {
        expect(hd(m).getDate()).toBe(1)
        expect(lib.getMonth(m)).toBe(i)
      })
      expect(hd(ms[0]).getMonth()).toBe(months.TISHREI)
      expect(hd(ms.at(-1)!).getMonth()).toBe(months.ELUL)
    }
  })

  it("addMonths / differenceInCalendarMonths are consistent", () => {
    const start = new HDate(15, months.SHVAT, 5700).greg()
    for (let n = -300; n <= 300; n += 7) {
      const moved = lib.addMonths(start, n)
      expect(lib.differenceInCalendarMonths(moved, start)).toBe(n)
      expect(hd(moved).getDate()).toBe(15)
    }
  })

  it("steps through Adar I and Adar II in leap years", () => {
    const shevat = new HDate(1, months.SHVAT, 5787).greg() // 5787 is a leap year
    expect(hd(lib.addMonths(shevat, 1)).getMonth()).toBe(months.ADAR_I)
    expect(hd(lib.addMonths(shevat, 2)).getMonth()).toBe(months.ADAR_II)
    expect(hd(lib.addMonths(shevat, 3)).getMonth()).toBe(months.NISAN)
  })

  it("clamps day 30 when moving to a 29-day month", () => {
    const d = new HDate(30, months.TISHREI, 5786).greg()
    const next = hd(lib.addMonths(d, 1))
    expect(next.getMonth()).toBe(months.CHESHVAN)
    expect(next.getDate()).toBeLessThanOrEqual(30)
  })

  it("setMonth / setYear / newDate behave like the dropdowns expect", () => {
    const d = new HDate(10, months.TISHREI, 5787).greg()
    expect(hd(lib.setMonth(d, 12)).getMonth()).toBe(months.ELUL) // leap year: index 12 = Elul
    expect(hd(lib.setMonth(new HDate(10, months.TISHREI, 5786).greg(), 11)).getMonth()).toBe(months.ELUL) // regular year
    const adar2 = new HDate(14, months.ADAR_II, 5787).greg()
    expect(hd(lib.setYear(adar2, 5788)).getMonth()).toBe(months.ADAR_I) // plain Adar
    expect(hd(lib.newDate(5786, 0, 1)).toString()).toBe(new HDate(1, months.TISHREI, 5786).toString())
  })

  it("formats month names, years and unique month ids", () => {
    const d = new HDate(1, months.SHVAT, 5786).greg()
    expect(lib.format(d, "LLLL")).toBe("Shevat")
    expect(lib.format(d, "LLLL y")).toBe("Shevat 5786")
    expect(lib.format(d, "yyyy")).toBe("5786")
    const a = new HDate(1, months.ADAR_I, 5787).greg()
    const b = new HDate(1, months.ADAR_II, 5787).greg()
    expect(lib.format(a, "yyyy-MM")).not.toBe(lib.format(b, "yyyy-MM"))
  })
})
