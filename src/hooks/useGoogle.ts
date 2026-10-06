import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { type Messages, useI18n } from "@/i18n"
import {
  AuthError,
  type GCalendar,
  type GEvent,
  getClientId,
  getUserProfile,
  findHebrewEvents,
  listAppEvents,
  listCalendars,
  loadGis,
  loadToken,
  requestToken,
  SignInError,
  signOut as gSignOut,
  type UserProfile,
} from "@/lib/google"

export type AuthStatus = "signed-out" | "signing-in" | "signed-in"

function signInMessage(e: unknown, t: Messages): string {
  if (!(e instanceof SignInError)) return (e as Error)?.message ?? t.errors.signInFailed
  switch (e.code) {
    case "popup_closed":
      return t.errors.popupClosed
    case "scopes_missing":
      return t.errors.scopesMissing
    case "gis_load":
      return t.errors.gisLoad
    default:
      return e.message && e.message !== e.code ? e.message : t.errors.signInFailed
  }
}

export function useGoogleAuth() {
  const { t } = useI18n()
  const [status, setStatus] = useState<AuthStatus>(() => (loadToken() ? "signed-in" : "signed-out"))
  const [expired, setExpired] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (getClientId()) loadGis().catch(() => {})
  }, [])

  useEffect(() => {
    if (status !== "signed-in") return setProfile(null)
    let cancelled = false
    getUserProfile().then((p) => !cancelled && setProfile(p))
    return () => {
      cancelled = true
    }
  }, [status])

  const signIn = useCallback(
    async (opts: { selectAccount?: boolean } = {}) => {
      const wasSignedIn = status === "signed-in"
      setStatus("signing-in")
      try {
        await requestToken({ prompt: opts.selectAccount ? "select_account" : "" })
        setExpired(false)
        // Re-run the profile effect even when switching between two signed-in accounts.
        if (wasSignedIn) setProfile(await getUserProfile())
        setStatus("signed-in")
      } catch (e) {
        setStatus(loadToken() ? "signed-in" : "signed-out")
        toast.error(signInMessage(e, t))
      }
    },
    [status, t],
  )

  const signOut = useCallback(() => {
    gSignOut()
    setExpired(false)
    setStatus("signed-out")
  }, [])

  /** Call from any API error handler: flips to signed-out on expired tokens. */
  const handleError = useCallback(
    (e: unknown, fallback?: string) => {
      if (e instanceof AuthError) {
        setExpired(true)
        setStatus("signed-out")
        return
      }
      toast.error(fallback ?? t.errors.generic, { description: (e as Error)?.message })
    },
    [t],
  )

  return { status, expired, profile, signIn, signOut, handleError }
}

export interface AppEvent extends GEvent {
  calendarId: string
}

export function useCalendarData(enabled: boolean, onError: (e: unknown, msg?: string) => void) {
  const { t } = useI18n()
  const [calendars, setCalendars] = useState<GCalendar[] | null>(null)
  const [events, setEvents] = useState<AppEvent[] | null>(null)
  const { loadCalendars, loadEvents } = t.errors

  const refreshEvents = useCallback(
    async (cals: GCalendar[]) => {
      try {
        const lists = await Promise.all(
          cals.map((c) =>
            listAppEvents(c.id)
              .then((evs) => evs.map((e) => ({ ...e, calendarId: c.id })))
              // A single inaccessible calendar shouldn't break the whole list.
              .catch((e) => {
                if (e instanceof AuthError) throw e
                return [] as AppEvent[]
              }),
          ),
        )
        setEvents(lists.flat())
      } catch (e) {
        onError(e, loadEvents)
      }
    },
    [onError, loadEvents],
  )

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    listCalendars()
      .then((cals) => {
        if (cancelled) return
        setCalendars(cals)
        void refreshEvents(cals)
      })
      .catch((e) => !cancelled && onError(e, loadCalendars))
    return () => {
      cancelled = true
    }
    // Language changes shouldn't refetch.
  }, [enabled])

  return {
    calendars,
    events,
    refresh: () => calendars && refreshEvents(calendars),
    addEvent: (e: AppEvent) => setEvents((prev) => [e, ...(prev ?? [])]),
    /** Replace an event after an edit (it may have moved to another calendar). */
    updateEvent: (e: AppEvent) => setEvents((prev) => prev?.map((x) => (x.id === e.id ? e : x)) ?? [e]),
    /** Add RSCALE=HEBREW events created outside the app; returns how many were new. */
    scanForHebrewEvents: async (): Promise<number> => {
      if (!calendars) return 0
      try {
        const lists = await Promise.all(
          calendars.map((c) =>
            findHebrewEvents(c.id)
              .then((evs) => evs.map((e) => ({ ...e, calendarId: c.id })))
              .catch((e) => {
                if (e instanceof AuthError) throw e
                return [] as AppEvent[]
              }),
          ),
        )
        const known = new Set((events ?? []).map((e) => e.id))
        const fresh = lists.flat().filter((e) => !known.has(e.id))
        if (fresh.length) setEvents((prev) => [...(prev ?? []), ...fresh])
        return fresh.length
      } catch (e) {
        onError(e, loadEvents)
        return 0
      }
    },
    removeEvent: (id: string) => setEvents((prev) => prev?.filter((e) => e.id !== id) ?? null),
  }
}
