import { months } from "@hebcal/hdate"
import { ArrowRight, Loader2, Lock, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDateFormat, useI18n } from "@/i18n"
import { HDate, formatHebrew } from "@/lib/hebrew"
import { expand, type RecurrenceSpec } from "@/lib/recurrence"

interface Props {
  onConnect: () => void
  connecting: boolean
  expired: boolean
  onAbout: () => void
}

export function Landing({ onConnect, connecting, expired, onAbout }: Props) {
  const { t, lang } = useI18n()
  const fmt = useDateFormat({ month: "short", day: "numeric", year: "numeric" })
  // Live example: 15 Shevat drifting across the Gregorian calendar.
  const thisYear = new HDate().getFullYear()
  const exampleSpec: RecurrenceSpec = { start: new HDate(15, months.SHVAT, thisYear), freq: "YEARLY", interval: 1, skip: "OMIT", end: { type: "never" } }
  const example = expand(exampleSpec, 4)

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-12 py-10 md:grid-cols-[1.1fr_1fr] md:py-20">
      <div className="space-y-6">
        <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          {t.landing.title((s) => <span className="text-primary">{s}</span>)}
        </h1>
        <p className="max-w-prose text-lg text-pretty text-muted-foreground">
          {t.landing.body}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" className="h-11 gap-2 px-5 text-base" onClick={onConnect} disabled={connecting}>
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
        <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-2xl" />
        <div className="rounded-2xl border bg-card p-5 shadow-xl shadow-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{t.landing.exampleTitle}</p>
              <p className="flex items-center gap-1.5 text-sm text-primary">
                <Repeat className="size-3.5" /> {t.describe(exampleSpec)}
              </p>
            </div>
            <span dir="rtl" lang="he" className="text-2xl font-medium text-primary/80">
              ט״ו בשבט
            </span>
          </div>
          <ol className="mt-4 divide-y rounded-lg border">
            {example.map((o) => (
              <li key={o.date.toISOString()} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span className="font-medium tabular-nums">{fmt.format(o.date)}</span>
                <span className="text-muted-foreground">{formatHebrew(o.hdate, { lang })}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            {t.landing.exampleNote}
          </p>
        </div>
      </div>
    </div>
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
