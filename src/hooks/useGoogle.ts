import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { type Messages, useI18n } from "@/i18n"
import {
  AuthError,
  type GCalendar,
  type GEvent,
  ACCOUNT_KEY,
  getClientId,
  getUserProfile,
  loadAccount,
  findHebrewEvents,
  listAppEvents,
  listCalendars,
  loadGis,
  loadToken,
  requestToken,
  saveAccount,
  SignInError,
  signOut as gSignOut,
  TOKEN_KEY,
  tokenTimeLeft,
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
  /** Signed in, but Google's (≈1 h) access token has run out: keep the UI and offer a one-click reconnect. */
  const [sessionExpired, setSessionExpired] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  /** Last account used on this device, for "Continue as …". */
  const [account, setAccount] = useState<UserProfile | null>(loadAccount)
  /** Bumped whenever a new token arrives (here or from another tab), to reschedule the expiry timer. */
  const [tokenStamp, setTokenStamp] = useState(0)

  useEffect(() => {
    if (getClientId()) loadGis().catch(() => {})
  }, [])

  // Load the profile once signed in, and remember the account for next time.
  useEffect(() => {
    if (status !== "signed-in" || sessionExpired) return
    let cancelled = false
    getUserProfile().then((p) => {
      if (cancelled || !p) return
      setProfile(p)
      saveAccount(p)
      setAccount(p)
    })
    return () => {
      cancelled = true
    }
  }, [status, sessionExpired])

  // Flag the session as expired when the token runs out (rather than waiting for a failed request).
  useEffect(() => {
    if (status !== "signed-in" || sessionExpired) return
    const left = tokenTimeLeft()
    if (left <= 0) return setSessionExpired(true)
    const timer = setTimeout(() => setSessionExpired(true), left)
    return () => clearTimeout(timer)
  }, [status, sessionExpired, tokenStamp])

  // Keep tabs in sync: connecting or signing out in one tab updates the others.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY && e.key !== ACCOUNT_KEY) return
      const remembered = loadAccount()
      setAccount(remembered)
      if (loadToken()) {
        setStatus("signed-in")
        setSessionExpired(false)
        setTokenStamp((n) => n + 1)
      } else if (!remembered) {
        // Signed out elsewhere.
        setStatus("signed-out")
        setSessionExpired(false)
        setProfile(null)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const signIn = useCallback(
    async (opts: { selectAccount?: boolean } = {}) => {
      const wasSignedIn = status === "signed-in"
      if (!wasSignedIn) setStatus("signing-in")
      try {
        // With a remembered account and existing consent, Google's popup closes on its own.
        await requestToken({ prompt: opts.selectAccount ? "select_account" : "", hint: opts.selectAccount ? undefined : account?.email })
        setSessionExpired(false)
        setTokenStamp((n) => n + 1)
        if (wasSignedIn && opts.selectAccount) setProfile(await getUserProfile())
        setStatus("signed-in")
      } catch (e) {
        if (!wasSignedIn) setStatus(loadToken() ? "signed-in" : "signed-out")
        toast.error(signInMessage(e, t))
      }
    },
    [status, account, t],
  )

  const signOut = useCallback(() => {
    gSignOut()
    setSessionExpired(false)
    setProfile(null)
    setAccount(null)
    setStatus("signed-out")
  }, [])

  /** Call from any API error handler: an expired token shows the reconnect banner instead of an error. */
  const handleError = useCallback(
    (e: unknown, fallback?: string) => {
      if (e instanceof AuthError) {
        setSessionExpired(true)
        return
      }
      toast.error(fallback ?? t.errors.generic, { description: (e as Error)?.message })
    },
    [t],
  )

  return { status, sessionExpired, profile, account, signIn, signOut, handleError }
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
