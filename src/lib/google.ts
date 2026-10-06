/**
 * Google Identity Services (token model) + a thin Calendar v3 REST client.
 * Everything runs in the browser; the access token never leaves it except to googleapis.com.
 */

/** Required for the app to work. */
const SCOPE_LIST = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events",
] as const
/** Nice to have: name and avatar in the header. */
const PROFILE_SCOPES = ["email", "profile"]
const SCOPES = [...SCOPE_LIST, ...PROFILE_SCOPES].join(" ")

const API = "https://www.googleapis.com/calendar/v3"
const TOKEN_KEY = "hrg.token"
const CLIENT_ID_KEY = "hrg.clientId"

/** Marker stored on every event we create, so we can list them later. */
export const APP_MARKER = { key: "hebrewRecurrence", value: "1" } as const

/* ------------------------------------------------------------------ */
/* Client ID                                                           */
/* ------------------------------------------------------------------ */

export function getClientId(): string | null {
  const fromEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (fromEnv) return fromEnv
  try {
    return localStorage.getItem(CLIENT_ID_KEY)
  } catch {
    return null
  }
}

export function setClientId(id: string | null) {
  try {
    if (id) localStorage.setItem(CLIENT_ID_KEY, id)
    else localStorage.removeItem(CLIENT_ID_KEY)
  } catch {
    /* storage unavailable */
  }
}

export const clientIdFromEnv = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

/* ------------------------------------------------------------------ */
/* Token handling                                                      */
/* ------------------------------------------------------------------ */

interface StoredToken {
  accessToken: string
  expiresAt: number
}

export class AuthError extends Error {}

export type SignInErrorCode = "missing_client_id" | "gis_load" | "popup_closed" | "scopes_missing" | "failed"

/** Sign-in failure with a code the UI can translate; `message` holds Google's own detail, if any. */
export class SignInError extends Error {
  readonly code: SignInErrorCode
  constructor(code: SignInErrorCode, detail?: string) {
    super(detail ?? code)
    this.code = code
  }
}

export function loadToken(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as StoredToken
    // Treat tokens about to expire as expired.
    return t.expiresAt - 60_000 > Date.now() ? t : null
  } catch {
    return null
  }
}

function saveToken(t: StoredToken | null) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t))
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

let gisLoading: Promise<void> | null = null

/** Load the GIS script. Call early so the consent popup opens within the click's user-activation window. */
export function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  gisLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = "https://accounts.google.com/gsi/client"
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisLoading = null
      reject(new SignInError("gis_load"))
    }
    document.head.appendChild(s)
  })
  return gisLoading
}

/** Opens Google's consent popup (or reuses an existing grant silently when possible). */
export async function requestToken(opts: { hint?: string; prompt?: "" | "consent" | "select_account" } = {}): Promise<StoredToken> {
  const clientId = getClientId()
  if (!clientId) throw new SignInError("missing_client_id")
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      login_hint: opts.hint,
      callback: (resp) => {
        if (resp.error) return reject(new SignInError("failed", resp.error_description || resp.error))
        if (!google.accounts.oauth2.hasGrantedAllScopes(resp, ...SCOPE_LIST)) return reject(new SignInError("scopes_missing"))
        const t = { accessToken: resp.access_token, expiresAt: Date.now() + Number(resp.expires_in) * 1000 }
        saveToken(t)
        resolve(t)
      },
      error_callback: (err) => {
        reject(err.type === "popup_closed" ? new SignInError("popup_closed") : new SignInError("failed", err.message))
      },
    })
    client.requestAccessToken({ prompt: opts.prompt ?? "" })
  })
}

export function signOut() {
  const t = loadToken()
  saveToken(null)
  if (t && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(t.accessToken, () => {})
}

/* ------------------------------------------------------------------ */
/* REST                                                                */
/* ------------------------------------------------------------------ */

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = loadToken()
  if (!t) throw new AuthError("Your Google session expired")
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${t.accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  })
  if (res.status === 401) {
    saveToken(null)
    throw new AuthError("Your Google session expired")
  }
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      message = body?.error?.message ?? message
    } catch {
      /* not JSON */
    }
    throw new Error(message)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export interface UserProfile {
  name?: string
  email?: string
  picture?: string
}

/**
 * Name/email/avatar of the signed-in user. Returns null instead of throwing: tokens granted before the
 * profile scopes were added can't read it, and that shouldn't sign the user out.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const t = loadToken()
  if (!t) return null
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${t.accessToken}` },
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

export interface GCalendar {
  id: string
  summary: string
  summaryOverride?: string
  backgroundColor?: string
  primary?: boolean
  timeZone?: string
  accessRole: "owner" | "writer" | "reader" | "freeBusyReader"
}

export interface GEventTime {
  date?: string
  dateTime?: string
  timeZone?: string
}

export interface GEvent {
  id: string
  etag?: string
  summary?: string
  description?: string
  htmlLink: string
  start: GEventTime
  end: GEventTime
  recurrence?: string[]
  recurringEventId?: string
  originalStartTime?: GEventTime
  extendedProperties?: { private?: Record<string, string> }
  reminders?: { useDefault: boolean; overrides?: { method: string; minutes: number }[] }
}

export async function listCalendars(): Promise<GCalendar[]> {
  const res = await api<{ items: GCalendar[] }>("/users/me/calendarList?minAccessRole=writer&maxResults=250")
  return res.items.sort((a, b) => Number(!!b.primary) - Number(!!a.primary) || calName(a).localeCompare(calName(b)))
}

export const calName = (c: GCalendar) => c.summaryOverride || c.summary

const enc = encodeURIComponent

export function createEvent(calendarId: string, body: Partial<GEvent>): Promise<GEvent> {
  return api<GEvent>(`/calendars/${enc(calendarId)}/events`, { method: "POST", body: JSON.stringify(body) })
}

export function patchEvent(calendarId: string, eventId: string, body: Partial<GEvent>): Promise<GEvent> {
  return api<GEvent>(`/calendars/${enc(calendarId)}/events/${enc(eventId)}`, { method: "PATCH", body: JSON.stringify(body) })
}

export function moveEvent(calendarId: string, eventId: string, destination: string): Promise<GEvent> {
  return api<GEvent>(`/calendars/${enc(calendarId)}/events/${enc(eventId)}/move?destination=${enc(destination)}`, { method: "POST" })
}

/**
 * Scan a calendar for RSCALE=HEBREW recurring events (e.g. created by hand through the API).
 * The API can't filter by recurrence, so this pages through all recurring masters with a trimmed field set.
 */
export async function findHebrewEvents(calendarId: string): Promise<GEvent[]> {
  const found: GEvent[] = []
  let pageToken: string | undefined
  do {
    const q = new URLSearchParams({
      singleEvents: "false",
      maxResults: "2500",
      fields: "nextPageToken,items(id,etag,summary,description,htmlLink,start,end,recurrence,reminders,extendedProperties)",
    })
    if (pageToken) q.set("pageToken", pageToken)
    const res = await api<{ items: GEvent[]; nextPageToken?: string }>(`/calendars/${enc(calendarId)}/events?${q}`)
    found.push(...res.items.filter((e) => e.recurrence?.some((r) => /RSCALE=HEBREW/i.test(r))))
    pageToken = res.nextPageToken
  } while (pageToken)
  return found
}

export function deleteEvent(calendarId: string, eventId: string): Promise<void> {
  return api<void>(`/calendars/${enc(calendarId)}/events/${enc(eventId)}`, { method: "DELETE" })
}

export async function listInstances(calendarId: string, eventId: string, opts: { timeMin?: Date; max?: number } = {}): Promise<GEvent[]> {
  const q = new URLSearchParams({ maxResults: String(opts.max ?? 10) })
  if (opts.timeMin) q.set("timeMin", opts.timeMin.toISOString())
  const res = await api<{ items: GEvent[] }>(`/calendars/${enc(calendarId)}/events/${enc(eventId)}/instances?${q}`)
  return res.items
}

/** Recurring events this app created in a calendar (master events, not instances). */
export async function listAppEvents(calendarId: string): Promise<GEvent[]> {
  const q = new URLSearchParams({
    privateExtendedProperty: `${APP_MARKER.key}=${APP_MARKER.value}`,
    maxResults: "250",
    singleEvents: "false",
  })
  const res = await api<{ items: GEvent[] }>(`/calendars/${enc(calendarId)}/events?${q}`)
  return res.items.filter((e) => e.recurrence?.length)
}

/** Parse a Google event start (date or dateTime) into a local Date (date-only → local midnight). */
export function eventStartDate(t: GEventTime): Date {
  if (t.date) {
    const [y, m, d] = t.date.split("-").map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(t.dateTime!)
}
