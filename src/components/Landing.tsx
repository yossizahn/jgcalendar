import { months } from "@hebcal/hdate"
import { ArrowRight, Loader2, Lock, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDateFormat, useI18n } from "@/i18n"
import { HDate } from "@/lib/hebrew"
import { expand, type Occurrence, type RecurrenceSpec } from "@/lib/recurrence"

interface Props {
  onConnect: () => void
  connecting: boolean
  expired: boolean
  onAbout: () => void
}

export function Landing({ onConnect, connecting, expired, onAbout }: Props) {
  const { t } = useI18n()
  // Live example: 15 Shevat drifting across the Gregorian calendar.
  const thisYear = new HDate().getFullYear()
  const exampleSpec: RecurrenceSpec = { start: new HDate(15, months.SHVAT, thisYear), freq: "YEARLY", interval: 1, skip: "OMIT", end: { type: "never" } }
  const example = expand(exampleSpec, 10)

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-12 py-10 md:grid-cols-[1.1fr_1fr] md:py-20">
      <div className="space-y-6">
        <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
          {t.landing.title((s) => <em className="text-seal">{s}</em>)}
        </h1>
        <p className="max-w-prose text-lg text-pretty text-muted-foreground">
          {t.landing.body}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" className="h-12 gap-2 rounded-md px-6 text-base" onClick={onConnect} disabled={connecting}>
            {connecting ? <Loader2 className="animate-spin" /> : <GoogleMark />}
            {expired ? t.landing.reconnect : t.landing.connect}
            {!connecting && <ArrowRight className="size-4 rtl:rotate-180" />}
          </Button>
          <Button variant="link" className="h-11 px-1 text-sm" onClick={onAbout}>
            {t.landing.howItWorks}
          </Button>
        </div>
        {expired && <p className="text-sm text-amber-700 dark:text-amber-400">{t.landing.expired}</p>}
        <p className="flex max-w-prose items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          {t.landing.privacy}
        </p>
      </div>

      <div className="relative">
        <div className="rounded-lg border bg-card p-5 shadow-[0_1px_0_var(--border),0_12px_32px_-18px_oklch(0.3_0.05_262/0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{t.landing.exampleTitle}</p>
              <p className="flex items-center gap-1.5 text-sm text-primary">
                <Repeat className="size-3.5" /> {t.describe(exampleSpec)}
              </p>
            </div>
            <span dir="rtl" lang="he" className="font-display text-3xl font-semibold text-seal">
              ט״ו בשבט
            </span>
          </div>
          <DriftChart occurrences={example} />
          <p className="mt-3 text-xs text-muted-foreground">{t.landing.exampleNote}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * One Hebrew date over ten years, plotted on a Jan–Feb axis: shows how the Gregorian date wanders.
 * Always laid out left-to-right (time axis), also in Hebrew.
 */
function DriftChart({ occurrences }: { occurrences: Occurrence[] }) {
  const { lang } = useI18n()
  const dayMonth = useDateFormat({ day: "numeric", month: "short" })
  const ROW = 24
  const TOP = 8
  const LEFT = 44
  const WIDTH = 340
  const START = { m: 0, d: 12 } // Jan 12
  const SPAN = 38 // days shown (to ~Feb 19)
  const height = TOP + occurrences.length * ROW + 22
  const x = (date: Date) => {
    const start = new Date(date.getFullYear(), START.m, START.d)
    const days = (date.getTime() - start.getTime()) / 86_400_000
    return LEFT + (days / SPAN) * (WIDTH - LEFT - 8)
  }
  const ticks = [new Date(2000, 0, 15), new Date(2000, 1, 1), new Date(2000, 1, 15)]
  const points = occurrences.map((o, i) => [x(o.date), TOP + i * ROW + ROW / 2] as const)

  return (
    <svg style={{ direction: "ltr" }} viewBox={`0 0 ${WIDTH} ${height}`} className="mt-4 w-full" role="img" aria-label={occurrences.map((o) => dayMonth.format(o.date)).join(", ")}>
      {ticks.map((d) => (
        <g key={d.toISOString()}>
          <line x1={x(d)} x2={x(d)} y1={TOP - 4} y2={height - 18} className="stroke-border" strokeDasharray="2 3" />
          <text x={x(d)} y={height - 4} textAnchor="middle" className="fill-muted-foreground text-[9px]">
            {dayMonth.format(d)}
          </text>
        </g>
      ))}
      <polyline points={points.map((p) => p.join(",")).join(" ")} fill="none" className="stroke-foreground/25" strokeWidth={1} strokeLinejoin="round" />
      {occurrences.map((o, i) => {
        const [cx, cy] = points[i]
        return (
          <g key={o.date.toISOString()}>
            <text x={4} y={cy + 3} className="fill-muted-foreground text-[9px] tabular-nums">
              {o.date.getFullYear()}
            </text>
            <circle cx={cx} cy={cy} r={i === 0 ? 5 : 4} className={i === 0 ? "fill-seal" : "fill-primary"} />
            <text x={cx + 9} y={cy + 3} className="fill-foreground text-[9px] font-medium" direction={lang === "he" ? "rtl" : "ltr"} textAnchor="start">
              {dayMonth.format(o.date)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61h-4A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  )
}
