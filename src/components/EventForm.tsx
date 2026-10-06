import { cn } from "cn"
import {
  Bell,
  CalendarCheck2,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  Info,
  Loader2,
  MoonStar,
  PencilLine,
  Repeat,
  Save,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { DualCalendar, type CalendarMode } from "@/components/DualCalendar"
import { Segmented } from "@/components/Segmented"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { AppEvent } from "@/hooks/useGoogle"
import { buildEventBody, formValuesFromEvent, REMINDER_OPTIONS, type Reminder, ymd } from "@/lib/event"
import { calName, createEvent, type GCalendar, moveEvent, patchEvent } from "@/lib/google"
import { relativeFromToday } from "@/lib/format"
import { HDate, formatHebrew, formatHebrewNative, sameDay } from "@/lib/hebrew"
import { buildRRule, expand, type Occurrence, skipIssue, type Freq, type RecurrenceSpec, type Skip } from "@/lib/recurrence"
import { useDateFormat, useI18n } from "@/i18n"

interface Props {
  calendars: GCalendar[] | null
  onCreated: (e: AppEvent) => void
  onError: (e: unknown, msg?: string) => void
  /** When set, the form edits this event instead of creating a new one. Remount (key) to switch events. */
  editing?: AppEvent | null
  onSaved?: (updated: AppEvent, previous: AppEvent) => void
  onCancelEdit?: () => void
}

type EndType = "never" | "count" | "until"

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
const SHORT_DATE: Intl.DateTimeFormatOptions = { weekday: "short", year: "numeric", month: "short", day: "numeric" }

export function EventForm({ calendars, onCreated, onError, editing, onSaved, onCancelEdit }: Props) {
  const { t } = useI18n()
  const shortDate = useDateFormat(SHORT_DATE)
  // Initial values: from the event being edited, or defaults for a new one.
  const [initial] = useState(() => (editing ? formValuesFromEvent(editing) : null))
  const [title, setTitle] = useState(initial?.title ?? "")
  const [mode, setMode] = useState<CalendarMode>("hebrew")
  const [picked, setPicked] = useState<Date | undefined>(initial?.spec.start.greg())
  const [afterSunset, setAfterSunset] = useState(false)
  const [freq, setFreq] = useState<Freq>(initial?.spec.freq ?? "YEARLY")
  const [interval, setRepeatInterval] = useState(initial?.spec.interval ?? 1)
  const [skipChoice, setSkipChoice] = useState<Skip | null>(initial && initial.spec.skip !== "OMIT" ? initial.spec.skip : initial ? "OMIT" : null)
  const [allDay, setAllDay] = useState(initial?.allDay ?? true)
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00")
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00")
  const [endType, setEndType] = useState<EndType>(initial?.spec.end.type ?? "never")
  const [count, setCount] = useState(initial?.spec.end.type === "count" ? initial.spec.end.count : 10)
  const [until, setUntil] = useState(initial?.spec.end.type === "until" ? ymd(initial.spec.end.until) : "")
  const [calendarId, setCalendarId] = useState<string | null>(editing?.calendarId ?? null)
  const [reminder, setReminder] = useState<Reminder>(initial?.reminder ?? "default")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [showRule, setShowRule] = useState(false)

  // Bring the form into view when an edit starts (the list is further down the page).
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const card = cardRef.current
    if (!editing || !card) return
    card.scrollIntoView({ behavior: "smooth", block: "start" })
    // Smooth scrolling can be skipped (background tabs, some browsers); make sure we end up there.
    const fallback = setTimeout(() => {
      if (Math.abs(card.getBoundingClientRect().top) > 120) card.scrollIntoView({ block: "start" })
    }, 700)
    return () => clearTimeout(fallback)
  }, [editing])

  const timeZone = initial?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const calendar = calendars?.find((c) => c.id === calendarId) ?? calendars?.[0] ?? null

  // The Hebrew date is what recurs. In Gregorian mode, "after sunset" means the Hebrew date had already advanced.
  const hdate = useMemo(() => {
    if (!picked) return null
    const hd = new HDate(picked)
    return mode === "gregorian" && afterSunset ? hd.next() : hd
  }, [picked, mode, afterSunset])

  const issue = hdate ? skipIssue({ start: hdate, freq }) : null
  const skip: Skip = issue ? (skipChoice ?? issue.recommended) : "OMIT"

  const untilDate = until ? new Date(`${until}T00:00:00`) : null
  const spec: RecurrenceSpec | null = hdate
    ? {
        start: hdate,
        freq,
        interval: Math.max(1, interval || 1),
        skip,
        end:
          endType === "count"
            ? { type: "count", count: Math.max(1, count || 1) }
            : endType === "until" && untilDate
              ? { type: "until", until: untilDate }
              : { type: "never" },
      }
    : null

  const rrule = spec ? buildRRule(spec, { allDay }) : null
  const today = new Date()
  const upcoming = spec ? expand(spec, 6, today) : []
  const startInPast = hdate ? hdate.greg() < new Date(today.getFullYear(), today.getMonth(), today.getDate()) : false

  const missing: string[] = []
  if (!title.trim()) missing.push(t.form.missing.title)
  if (!hdate) missing.push(t.form.missing.date)
  if (endType === "until" && !untilDate) missing.push(t.form.missing.endDate)
  if (!calendar) missing.push(t.form.missing.calendar)

  const changeMode = (m: CalendarMode) => {
    // Keep the *Hebrew* date stable when switching grids.
    if (m === "hebrew" && hdate) setPicked(hdate.greg())
    setAfterSunset(false)
    setMode(m)
  }

  const changeFreq = (f: Freq) => {
    setFreq(f)
    setSkipChoice(null)
  }

  const copyRule = async () => {
    if (!rrule) return
    await navigator.clipboard.writeText(rrule)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const reset = () => {
    setTitle("")
    setDescription("")
    setPicked(undefined)
    setAfterSunset(false)
    setSkipChoice(null)
  }

  const submit = async () => {
    if (missing.length || !spec || !calendar) return
    setSubmitting(true)
    try {
      const draft = {
        title,
        description,
        calendarId: calendar.id,
        allDay,
        startTime,
        endTime,
        timeZone,
        spec,
        reminder,
        extraRecurrence: initial?.extraRecurrence,
      }
      const body = buildEventBody(draft)

      if (editing) {
        // Changing the calendar is a move, then the regular update.
        if (calendar.id !== editing.calendarId) await moveEvent(editing.calendarId, editing.id, calendar.id)
        const updated = await patchEvent(calendar.id, editing.id, body)
        toast.success(t.form.saved(updated.summary ?? ""), { description: t.describe(spec) })
        onSaved?.({ ...updated, calendarId: calendar.id }, editing)
        return
      }

      const created = await createEvent(calendar.id, body)
      const kept = created.recurrence?.some((r) => /RSCALE=HEBREW/i.test(r))
      if (!kept) {
        toast.warning(t.form.droppedRule, {
          description: t.form.savedRecurrence(created.recurrence?.join(" ") ?? ""),
          duration: 15000,
        })
      } else {
        toast.success(t.form.created(created.summary ?? "", calName(calendar)), {
          description: t.describe(spec),
          action: { label: t.form.open, onClick: () => window.open(created.htmlLink, "_blank", "noopener") },
          duration: 8000,
        })
      }
      onCreated({ ...created, calendarId: calendar.id })
      reset()
    } catch (e) {
      onError(e, editing ? t.form.saveFailed : t.form.createFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const reminderOptions: { value: Reminder; label: keyof typeof t.reminders }[] = [
    // When editing an event with reminders we can't represent, offer to leave them alone.
    ...(initial?.reminder === "keep" ? [{ value: "keep" as const, label: "keep" as const }] : []),
    ...REMINDER_OPTIONS.filter((o) => o.allDay === allDay),
  ]

  const reminderLabel = t.reminders[reminderOptions.find((o) => String(o.value) === String(reminder))?.label ?? "default"]
  const endLabel =
    endType === "count" ? t.form.timesCount(Math.max(1, count || 1)) : endType === "until" && untilDate ? t.form.untilDate(shortDate.format(untilDate)) : t.form.forever

  return (
    <div ref={cardRef} className="scroll-mt-20 space-y-6">
      {editing && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/[0.07] px-4 py-2.5">
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <PencilLine className="size-4 shrink-0 text-primary" />
            <span className="truncate">
              <span className="font-semibold">{t.form.editTitle}</span>
              <span className="text-muted-foreground"> · {editing.summary}</span>
            </span>
          </p>
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>
            <X /> {t.form.cancelEdit}
          </Button>
        </div>
      )}

      {initial && initial.unsupported.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            {t.form.unsupportedRule}{" "}
            <code dir="ltr" className="font-mono text-xs">
              {initial.unsupported.join(", ")}
            </code>
          </span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        {/* ------------------------------------------------ calendar */}
        <Panel className="p-5 sm:p-6">
          <Eyebrow>{t.form.dateSection}</Eyebrow>
          <p className="mb-4 text-sm text-muted-foreground">{t.form.dateHint}</p>
          <DualCalendar selected={picked} onSelect={setPicked} mode={mode} onModeChange={changeMode} />
        </Panel>

        {/* ------------------------------------------------ event */}
        <Panel className="flex flex-col gap-6 p-5 sm:p-6">
          <div>
            <Eyebrow>{editing ? t.form.editTitle : t.form.title}</Eyebrow>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.form.titlePlaceholder}
              aria-label={t.form.titleLabel}
              autoComplete="off"
              className="w-full border-b-2 border-border bg-transparent pb-2 font-display text-2xl font-semibold outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-primary sm:text-3xl"
            />
          </div>

          <DateHero hdate={hdate} eveningOf={mode === "gregorian" && afterSunset ? picked : undefined} />

          {mode === "gregorian" && hdate && (
            <label className="-mt-3 flex cursor-pointer items-center gap-3 text-sm">
              <Switch checked={afterSunset} onCheckedChange={setAfterSunset} />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <MoonStar className="size-3.5" /> {t.form.afterSunset}
                </span>
                <span className="block text-xs text-muted-foreground">{t.form.afterSunsetHint}</span>
              </span>
            </label>
          )}

          <div className="space-y-3">
            <Segmented
              aria-label={t.form.frequencyAria}
              value={freq}
              onChange={changeFreq}
              options={[
                { value: "YEARLY", label: t.form.yearly },
                { value: "MONTHLY", label: t.form.monthly },
              ]}
              className="h-10 w-full"
            />
            {spec && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <Repeat className="size-3.5 shrink-0" /> {t.describe(spec)}
              </p>
            )}
          </div>

          {issue && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="flex items-start gap-2 text-sm font-medium">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                {t.skip.problem(issue)} {t.form.whatThen}
              </p>
              <RadioGroup value={skip} onValueChange={(v) => setSkipChoice(v as Skip)} className="mt-3 gap-2 ps-6">
                {(["BACKWARD", "FORWARD", "OMIT"] as const).map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <RadioGroupItem value={s} />
                    {t.skip.outcome(issue, s)}
                    {s === issue.recommended && (
                      <Badge variant="secondary" className="h-5 text-[0.65rem]">
                        {t.form.commonChoice}
                      </Badge>
                    )}
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Options: collapsed to a one-line summary */}
          <div className="rounded-xl border bg-background/60">
            <button
              type="button"
              onClick={() => setOptionsOpen((o) => !o)}
              aria-expanded={optionsOpen}
              className="flex w-full items-center gap-3 px-4 py-3 text-start"
            >
              <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                <span className="me-1 text-sm font-medium">{t.form.options}</span>
                {interval > 1 && <Chip>{`${t.form.every} ${interval} ${t.form.unit(freq, interval)}`}</Chip>}
                <Chip>{endLabel}</Chip>
                <Chip>
                  <Clock className="size-3" /> {allDay ? t.form.allDay : `${startTime}–${endTime}`}
                </Chip>
                {calendar && (
                  <Chip>
                    <span className="size-2 rounded-full" style={{ background: calendar.backgroundColor ?? "var(--primary)" }} />
                    <span className="max-w-32 truncate">{calName(calendar)}</span>
                  </Chip>
                )}
                <Chip>
                  <Bell className="size-3" /> {reminderLabel}
                </Chip>
              </span>
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", optionsOpen && "rotate-180")} />
            </button>

            {optionsOpen && (
              <div className="space-y-5 border-t px-4 py-4">
                <OptionRow label={t.form.repeatSection}>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {t.form.every}
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={interval}
                      onChange={(e) => setRepeatInterval(Number(e.target.value))}
                      className="h-9 w-16 text-center"
                      aria-label={t.form.intervalAria}
                    />
                    {t.form.unit(freq, interval)}
                  </div>
                </OptionRow>

                <OptionRow label={t.form.ends}>
                  <RadioGroup value={endType} onValueChange={(v) => setEndType(v as EndType)} className="gap-2">
                    <label className="flex h-9 cursor-pointer items-center gap-2.5 text-sm">
                      <RadioGroupItem value="never" /> {t.form.never}
                    </label>
                    <label className="flex h-9 cursor-pointer items-center gap-2.5 text-sm">
                      <RadioGroupItem value="count" /> {t.form.after}
                      <Input
                        type="number"
                        min={1}
                        value={count}
                        onFocus={() => setEndType("count")}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="h-9 w-20 text-center"
                        aria-label={t.form.countAria}
                      />
                      {t.form.times}
                    </label>
                    <label className="flex h-9 cursor-pointer items-center gap-2.5 text-sm">
                      <RadioGroupItem value="until" /> {t.form.on}
                      <Input
                        type="date"
                        value={until}
                        onFocus={() => setEndType("until")}
                        onChange={(e) => setUntil(e.target.value)}
                        className="h-9 w-44"
                        aria-label={t.form.endDateAria}
                      />
                    </label>
                  </RadioGroup>
                </OptionRow>

                <OptionRow label={t.form.detailsSection}>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                      <Switch
                        checked={allDay}
                        onCheckedChange={(v) => {
                          setAllDay(v)
                          setReminder("default")
                        }}
                      />
                      {t.form.allDay}
                    </label>
                    {!allDay && (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 w-32" aria-label={t.form.startTimeAria} />
                        <span className="text-muted-foreground">{t.form.to}</span>
                        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9 w-32" aria-label={t.form.endTimeAria} />
                        <span dir="ltr" className="text-xs text-muted-foreground">
                          {timeZone.replace(/_/g, " ")}
                        </span>
                      </div>
                    )}
                  </div>
                </OptionRow>

                <div className="grid gap-4 sm:grid-cols-2">
                  <OptionRow label={t.form.calendar}>
                    <Select value={calendar?.id ?? null} onValueChange={(v) => v && setCalendarId(v)}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue>
                          {calendar ? <CalendarOption cal={calendar} /> : <span className="text-muted-foreground">{t.form.loading}</span>}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {calendars?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <CalendarOption cal={c} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </OptionRow>
                  <OptionRow label={t.form.reminder}>
                    <Select value={String(reminder)} onValueChange={(v) => v && setReminder(v === "default" || v === "none" || v === "keep" ? v : Number(v))}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue>{reminderLabel}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {reminderOptions.map((o) => (
                          <SelectItem key={String(o.value)} value={String(o.value)}>
                            {t.reminders[o.label]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </OptionRow>
                </div>

                <OptionRow label={`${t.form.descriptionLabel} ${t.form.optional}`}>
                  <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t.form.descriptionPlaceholder} />
                </OptionRow>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              size="lg"
              className="h-12 w-full bg-gradient-to-br from-primary to-[oklch(0.45_0.19_285)] text-base shadow-lg shadow-primary/25 hover:brightness-110 dark:to-[oklch(0.66_0.15_285)]"
              disabled={!!missing.length || submitting}
              onClick={submit}
            >
              {submitting ? <Loader2 className="animate-spin" /> : editing ? <Save /> : <CalendarCheck2 />}
              {editing ? (submitting ? t.form.saving : t.form.save) : submitting ? t.form.submitting : t.form.submit}
            </Button>
            {missing.length > 0 && !submitting && <p className="text-center text-xs text-muted-foreground">{t.form.addToContinue(missing)}</p>}
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------ timeline */}
      {spec && (
        <Panel className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <Eyebrow>{t.form.upcoming}</Eyebrow>
              {startInPast && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="size-3 shrink-0" />
                  {t.form.startsInPast(shortDate.format(hdate!.greg()))}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowRule((v) => !v)}>
              <Code2 /> {showRule ? t.form.hideRule : t.form.showRule}
            </Button>
          </div>

          {showRule && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <code dir="ltr" className="flex-1 font-mono text-xs break-all">
                {rrule}
              </code>
              <Button variant="ghost" size="xs" onClick={copyRule}>
                {copied ? <Check /> : <Copy />} {copied ? t.form.copied : t.form.copy}
              </Button>
            </div>
          )}

          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.form.noFuture}</p>
          ) : (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {upcoming.map((o, i) => (
                <OccurrenceCard key={o.date.toISOString()} occurrence={o} first={i === 0} today={sameDay(o.date, today)} />
              ))}
            </ol>
          )}
        </Panel>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-2xl border bg-card/90 shadow-sm shadow-primary/5 backdrop-blur", className)}>{children}</section>
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-1 text-xs font-semibold tracking-[0.12em] text-primary uppercase">{children}</h2>
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{children}</span>
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

/** The selected date, large: Hebrew in the display serif, Gregorian underneath. */
function DateHero({ hdate, eveningOf }: { hdate: HDate | null; eveningOf?: Date }) {
  const { t, lang } = useI18n()
  const longDate = useDateFormat(LONG_DATE)
  const shortDate = useDateFormat(SHORT_DATE)
  if (!hdate)
    return (
      <div className="flex min-h-28 items-center justify-center rounded-xl border-2 border-dashed px-4 text-center text-sm text-muted-foreground">
        {t.form.selectDay}
      </div>
    )
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-gold/[0.12] px-5 py-4 ring-1 ring-primary/15" aria-live="polite">
      <p dir="rtl" lang="he" className="font-display text-4xl leading-tight font-semibold text-primary sm:text-5xl">
        {formatHebrewNative(hdate)}
      </p>
      <p className="mt-1 text-sm">
        {lang !== "he" && <span className="font-semibold">{formatHebrew(hdate)} · </span>}
        <span className="text-muted-foreground">{longDate.format(hdate.greg())}</span>
      </p>
      {eveningOf && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MoonStar className="size-3" /> {t.form.eveningOf(shortDate.format(eveningOf))}
        </p>
      )}
    </div>
  )
}

/** One upcoming date as a small calendar-page card. */
function OccurrenceCard({ occurrence: o, first, today }: { occurrence: Occurrence; first: boolean; today: boolean }) {
  const { t, lang, locale } = useI18n()
  const weekday = useDateFormat({ weekday: "short" })
  const monthYear = useDateFormat({ month: "short", year: "numeric" })
  return (
    <li
      className={cn(
        "flex flex-col items-center rounded-xl border bg-background/70 px-2 pt-3 pb-2.5 text-center",
        first && "border-gold/60 bg-gold/[0.08] ring-1 ring-gold/40",
      )}
    >
      <span className="text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">{weekday.format(o.date)}</span>
      <span className="font-display text-4xl leading-none font-semibold tabular-nums">{o.date.getDate()}</span>
      <span className="mt-0.5 text-xs font-medium">{monthYear.format(o.date)}</span>
      <span className="mt-2 w-full truncate border-t pt-1.5 text-[0.7rem] text-muted-foreground" dir="auto">
        {formatHebrew(o.hdate, { lang })}
      </span>
      <span
        className={cn(
          "mt-1.5 rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
          first ? "bg-gold text-gold-foreground dark:text-background" : "bg-muted text-muted-foreground",
        )}
      >
        {today ? t.form.today : relativeFromToday(o.date, locale)}
      </span>
      {o.shifted && <span className="mt-1 text-[0.6rem] text-amber-700 dark:text-amber-400">{t.form.moved}</span>}
    </li>
  )
}

function CalendarOption({ cal }: { cal: GCalendar }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: cal.backgroundColor ?? "var(--primary)" }} />
      <span className="truncate">{calName(cal)}</span>
    </span>
  )
}
