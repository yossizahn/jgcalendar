import { cn } from "cn"
import { CalendarDays, CircleCheck, ExternalLink, Info, Loader2, MoreHorizontal, PencilLine, RefreshCw, Search, Trash2, TriangleAlert } from "lucide-react"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">{t.events.title}</h2>
          <p className="text-sm text-muted-foreground">{t.events.subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={scan} disabled={scanning || !calendars}>
            {scanning ? <Loader2 className="animate-spin" /> : <Search />}
            {scanning ? t.events.scanning : t.events.scan}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onRefresh} aria-label={t.events.refresh}>
            <RefreshCw />
          </Button>
        </div>
      </div>

      {events === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          <CalendarDays className="size-8 opacity-40" />
          {t.events.empty}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => (
            <EventCard
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

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" /> {t.events.editTip}
      </p>
    </section>
  )
}

type Verification =
  | { state: "checking" }
  | { state: "ok"; next: Date | null }
  | { state: "mismatch"; google: string[]; expected: string[]; next: Date | null }
  | { state: "error"; next: Date | null }

function EventCard({
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
  const [confirmOpen, setConfirmOpen] = useState(false)

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
        // Couldn't ask Google; still show the next date from our own expansion.
        setVerification({ state: "error", next: spec ? (expand(spec, 1, startOfToday)[0]?.date ?? null) : null })
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

  const next = verification.state === "checking" ? null : verification.next
  const color = calendar?.backgroundColor ?? "var(--primary)"
  const external = event.extendedProperties?.private?.[APP_MARKER.key] !== APP_MARKER.value

  return (
    <li
      className={cn("group relative flex flex-col overflow-hidden rounded-lg border border-s-4 bg-card shadow-[0_1px_0_var(--border)]", isEditing && "ring-2 ring-seal/50")}
      style={{ borderInlineStartColor: color }}
    >
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{event.summary || t.events.untitled}</span>
              <VerificationBadge v={verification} />
            </p>
            <p className="truncate text-sm text-muted-foreground">{spec ? t.describe(spec) : event.recurrence?.join(" ")}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t.events.more} className="-me-1.5 -mt-1" />}>
              {deleting ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem render={<a href={event.htmlLink} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink /> {t.events.open}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2 /> {t.events.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="border-y border-dashed py-2.5">
          {verification.state === "checking" ? (
            <Skeleton className="h-12 w-full" />
          ) : next ? (
            <>
              <p className="font-display text-2xl leading-tight font-semibold text-seal">{relativeFromToday(next, locale)}</p>
              <p className="text-xs text-muted-foreground">
                {shortDate.format(next)} · {formatHebrew(new HDate(next), { lang })}
              </p>
            </>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">{t.events.noUpcoming}</p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
            <span className="truncate">{calendar ? calName(calendar) : ""}</span>
            {external && (
              <Badge variant="outline" className="h-5 shrink-0 text-[0.62rem] font-normal">
                {t.events.external}
              </Badge>
            )}
          </span>
          <Button variant={isEditing ? "secondary" : "outline"} size="sm" onClick={() => onEdit(event)} disabled={isEditing || !spec}>
            <PencilLine /> {isEditing ? t.events.editing : t.events.edit}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
