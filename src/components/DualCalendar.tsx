import { gematriya } from "@hebcal/hdate"
import { cn } from "cn"
import { useMemo, useState } from "react"
import type { DayButtonProps, DayPickerProps } from "react-day-picker"
import { he as heLocale } from "react-day-picker/locale"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Segmented } from "@/components/Segmented"
import { useDateFormat, useI18n } from "@/i18n"
import { type DisplayLang, HDate, monthName } from "@/lib/hebrew"
import { createHebrewDateLib } from "@/lib/hebrewDateLib"

export type CalendarMode = "hebrew" | "gregorian"

interface Props {
  selected: Date | undefined
  onSelect: (date: Date) => void
  mode: CalendarMode
  onModeChange: (mode: CalendarMode) => void
}

const START = new Date(1900, 0, 1)
const END = new Date(new Date().getFullYear() + 30, 11, 31)

/** Strip the geresh/gershayim for a compact cell label: ט״ו → טו */
const compactGematriya = (n: number) => gematriya(n).replace(/[׳״']/g, "")

function DualDayButton({
  mode,
  lang,
  gregMonthShort,
  ...props
}: DayButtonProps & { mode: CalendarMode; lang: DisplayLang; gregMonthShort: Intl.DateTimeFormat }) {
  const date = props.day.date
  const hd = new HDate(date)
  const g = date.getDate()
  const h = hd.getDate()

  // Secondary label: the other calendar's day, with its month name on the 1st.
  const secondary =
    mode === "hebrew"
      ? g === 1
        ? lang === "he"
          ? `1 ${gregMonthShort.format(date)}`
          : `${gregMonthShort.format(date)} 1`
        : String(g)
      : h === 1
        ? monthName(hd.getMonth(), hd.getFullYear(), lang)
        : compactGematriya(h)

  const isMonthStart = mode === "hebrew" ? g === 1 : h === 1

  return (
    <CalendarDayButton {...props}>
      <span className="text-[0.95rem]! leading-none font-medium opacity-100!">{mode === "hebrew" ? compactGematriya(h) : g}</span>
      <span
        dir="auto"
        className={cn(
          "max-w-full truncate px-0.5 text-[0.62rem]! leading-none",
          isMonthStart && "font-semibold text-primary opacity-100! group-data-[selected=true]/day:text-primary-foreground",
        )}
      >
        {secondary}
      </span>
    </CalendarDayButton>
  )
}

export function DualCalendar({ selected, onSelect, mode, onModeChange }: Props) {
  const { t, lang, dir } = useI18n()
  const [month, setMonth] = useState<Date>(selected ?? new Date())
  const gregMonthShort = useDateFormat({ month: "short" })
  const hebrewDateLib = useMemo(() => createHebrewDateLib(lang), [lang])

  // Stable component identity, so day buttons aren't remounted on every render.
  const DayButton = useMemo(
    () => (p: DayButtonProps) => <DualDayButton {...p} mode={mode} lang={lang} gregMonthShort={gregMonthShort} />,
    [mode, lang, gregMonthShort],
  )

  const shared: DayPickerProps = {
    mode: "single",
    required: true,
    selected,
    onSelect: (d: Date | undefined) => d && onSelect(d),
    month,
    onMonthChange: setMonth,
    captionLayout: "dropdown",
    startMonth: START,
    endMonth: END,
    fixedWeeks: true,
    dir,
    locale: lang === "he" ? heLocale : undefined,
    className: "w-full bg-transparent p-0 [--cell-size:--spacing(11)]",
    classNames: { root: "w-full" },
    components: { DayButton },
  }

  return (
    <div className="w-full max-w-[22rem] shrink-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Segmented
          aria-label={t.calendar.gridAria}
          value={mode}
          onChange={onModeChange}
          options={[
            { value: "hebrew", label: <>{t.calendar.hebrew}<span className="max-sm:hidden">{t.calendar.monthsSuffix}</span></> },
            { value: "gregorian", label: <>{t.calendar.gregorian}<span className="max-sm:hidden">{t.calendar.monthsSuffix}</span></> },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setMonth(selected ?? new Date())}>
          {selected ? t.calendar.goToSelected : t.calendar.today}
        </Button>
      </div>

      {mode === "hebrew" ? (
        <Calendar
          {...shared}
          dateLib={hebrewDateLib}
          // shadcn formats dropdowns with Intl (Gregorian); go through the Hebrew date lib instead.
          formatters={{
            formatMonthDropdown: (d, lib) => lib?.format(d, "LLLL") ?? "",
            formatYearDropdown: (d, lib) => lib?.format(d, "yyyy") ?? "",
          }}
        />
      ) : (
        <Calendar {...shared} />
      )}
    </div>
  )
}
