import { cn } from "cn"
import { CalendarDays, CircleCheck, ExternalLink, Loader2, PencilLine, RefreshCw, Search, Trash2, TriangleAlert } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { AppEvent } from "@/hooks/useGoogle"
import { eventYmd, specFromEvent, ymd, ymdToDate } from "@/lib/event"
import { relativeFromToday } from "@/lib/format"
import { APP_MARKER, calName, deleteEvent, type GCalendar, listInstances } from "@/lib/google"
import { Badge } from "@/components/ui/badge"
import { HDate, formatHebrew } from "@/lib/hebrew"
import { expand } from "@/lib/recurrence"
import { useDateFormat, useI18n } from "@/i18n"

interface Props {
  events: AppEvent[] | null
  calendars: GCalendar[] | null
  onDeleted: (id: string) => void
  onRefresh: () => void
  onError: (e: unknown, msg?: string) => void
  onEdit: (e: AppEvent) => void
  editingId?: string
  /** Scan all calendars for RSCALE=HEBREW events not created by this app. Resolves to how many were added. */
  onScan: () => Promise<number>
}

const SHORT_DATE: Intl.DateTimeFormatOptions = { weekday: "short", year: "numeric", month: "short", day: "numeric" }

export function EventsList({ events, calendars, onDeleted, onRefresh, onError, onEdit, editingId, onScan }: Props) {
  const { t } = useI18n()
  const [scanning, setScanning] = useState(false)

  const scan = async () => {
    setScanning(true)
    try {
      const n = await onScan()
      if (n > 0) toast.success(t.events.scanFound(n))
      else toast.info(t.events.scanNone)
    } finally {
      setScanning(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle className="text-lg">{t.events.title}</CardTitle>
          <CardDescription>{t.events.description}</CardDescription>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onRefresh} aria-label={t.events.refresh}>
          <RefreshCw />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {events === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <CalendarDays className="size-7 opacity-40" />
            {t.events.empty}
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {events.map((e) => (
              <EventRow
                // Remount after an edit so verification re-runs against the new rule.
                key={`${e.id}:${e.etag ?? ""}`}
                event={e}
                calendar={calendars?.find((c) => c.id === e.calendarId)}
                onDeleted={onDeleted}
                onError={onError}
                onEdit={onEdit}
                isEditing={e.id === editingId}
              />
            ))}
          </ul>
        )}
        <Button variant="outline" size="sm" onClick={scan} disabled={scanning || !calendars}>
          {scanning ? <Loader2 className="animate-spin" /> : <Search />}
          {scanning ? t.events.scanning : t.events.scan}
        </Button>
      </CardContent>
    </Card>
  )
}

type Verification =
  | { state: "checking" }
  | { state: "ok"; next: Date | null }
  | { state: "mismatch"; google: string[]; expected: string[]; next: Date | null }
  | { state: "error" }

function EventRow({
  event,
  calendar,
  onDeleted,
  onError,
  onEdit,
  isEditing,
}: {
  event: AppEvent
  calendar?: GCalendar
  onDeleted: (id: string) => void
  onError: (e: unknown, msg?: string) => void
  onEdit: (e: AppEvent) => void
  isEditing: boolean
}) {
  const { t, lang, locale } = useI18n()
  const shortDate = useDateFormat(SHORT_DATE)
  const spec = specFromEvent(event)
  const [verification, setVerification] = useState<Verification>({ state: "checking" })
  const [deleting, setDeleting] = useState(false)

  // Ask Google for the next few instances and compare with our own RFC 7529 expansion.
  useEffect(() => {
    let cancelled = false
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    listInstances(event.calendarId, event.id, { timeMin: startOfToday, max: 5 })
      .then((instances) => {
        if (cancelled) return
        const google = instances.map((i) => eventYmd(i.originalStartTime ?? i.start))
        const next = google[0] ? ymdToDate(google[0]) : null
        if (!spec) return setVerification({ state: "ok", next })
        const expected = expand(spec, google.length || 5, startOfToday).map((o) => ymd(o.date))
        const same = google.length === expected.length && google.every((d, i) => d === expected[i])
        setVerification(same ? { state: "ok", next } : { state: "mismatch", google, expected, next })
      })
      .catch((e) => {
        if (cancelled) return
        setVerification({ state: "error" })
        onError(e, t.events.checkFailed(event.summary ?? ""))
      })
    return () => {
      cancelled = true
    }
  }, [event.id, event.calendarId])

  const remove = async () => {
    setDeleting(true)
    try {
      await deleteEvent(event.calendarId, event.id)
      onDeleted(event.id)
      toast.success(t.events.deleted(event.summary ?? ""))
    } catch (e) {
      setDeleting(false)
      onError(e, t.events.deleteFailed)
    }
  }

  const next = verification.state === "ok" || verification.state === "mismatch" ? verification.next : null

  return (
    <li className={cn("flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center", isEditing && "bg-primary/5")}>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex items-center gap-2 font-medium">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: calendar?.backgroundColor ?? "var(--primary)" }} />
          <span className="truncate">{event.summary || t.events.untitled}</span>
          <VerificationBadge v={verification} />
          {event.extendedProperties?.private?.[APP_MARKER.key] !== APP_MARKER.value && (
            <Badge variant="outline" className="h-5 text-[0.65rem] font-normal">
              {t.events.external}
            </Badge>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {spec ? t.describe(spec) : event.recurrence?.join(" ")}
          {calendar && <span className="text-muted-foreground/70"> · {calName(calendar)}</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {verification.state === "checking" ? (
            <Skeleton className="inline-block h-3 w-40 align-middle" />
          ) : next ? (
            <>
              {t.events.next} <span className="font-medium text-foreground">{shortDate.format(next)}</span> · {formatHebrew(new HDate(next), { lang })} ·{" "}
              {relativeFromToday(next, locale)}
            </>
          ) : verification.state !== "error" ? (
            t.events.noUpcoming
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant={isEditing ? "secondary" : "ghost"} size="sm" onClick={() => onEdit(event)} disabled={isEditing || !spec}>
          <PencilLine /> {isEditing ? t.events.editing : t.events.edit}
        </Button>
        <Button variant="ghost" size="sm" render={<a href={event.htmlLink} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
          <ExternalLink /> {t.events.open}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t.events.delete} disabled={deleting} />}>
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.events.deleteTitle(event.summary ?? "")}</AlertDialogTitle>
              <AlertDialogDescription>{t.events.deleteDescription(calendar ? calName(calendar) : null)}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.events.cancel}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={remove}>
                {t.events.deleteAll}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )
}

function VerificationBadge({ v }: { v: Verification }) {
  const { t } = useI18n()
  if (v.state === "ok")
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-label={t.events.verifiedAria} />
        </TooltipTrigger>
        <TooltipContent>{t.events.verified}</TooltipContent>
      </Tooltip>
    )
  if (v.state === "mismatch")
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" aria-label={t.events.mismatchAria} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {t.events.mismatch}
          <br />
          {t.events.google}: <span dir="ltr">{v.google.join(", ") || t.events.none}</span>
          <br />
          {t.events.expected}: <span dir="ltr">{v.expected.join(", ")}</span>
        </TooltipContent>
      </Tooltip>
    )
  return null
}
