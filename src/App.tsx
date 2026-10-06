import { Info, Languages, LogOut, Monitor, Moon, Settings2, Sun, UserRound } from "lucide-react"
import { useState } from "react"
import type { AppEvent } from "@/hooks/useGoogle"
import { About } from "@/components/About"
import { EventForm } from "@/components/EventForm"
import { EventsList } from "@/components/EventsList"
import { Landing } from "@/components/Landing"
import { SetupClientId } from "@/components/SetupClientId"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCalendarData, useGoogleAuth } from "@/hooks/useGoogle"
import { type Theme, useTheme } from "@/hooks/useTheme"
import { useI18n } from "@/i18n"
import { clientIdFromEnv, type GCalendar, getClientId, setClientId, type UserProfile } from "@/lib/google"

/** Dev-only: `?demo` renders the signed-in UI with fake calendars, for working on the UI without OAuth. */
const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has("demo")
const DEMO_CALENDARS: GCalendar[] = [
  { id: "you@example.com", summary: "you@example.com", primary: true, backgroundColor: "#4285f4", accessRole: "owner" },
  { id: "family", summary: "Family", backgroundColor: "#33b679", accessRole: "writer" },
]

/** Dev-only sample event so the edit flow can be exercised in demo mode. */
const DEMO_EVENTS: AppEvent[] = [
  {
    id: "demo1",
    calendarId: "family",
    summary: "Grandma’s birthday",
    htmlLink: "#",
    start: { date: "2026-02-02" },
    end: { date: "2026-02-03" },
    recurrence: ["RRULE:FREQ=YEARLY;RSCALE=HEBREW"],
    reminders: { useDefault: true },
  },
]

export default function App() {
  const { t } = useI18n()
  const [clientId, setClientIdState] = useState(getClientId)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [editing, setEditing] = useState<AppEvent | null>(null)
  const auth = useGoogleAuth()
  const signedIn = DEMO || auth.status === "signed-in"
  const real = useCalendarData(!DEMO && signedIn, auth.handleError)
  const data = DEMO ? { ...real, calendars: DEMO_CALENDARS, events: real.events ?? DEMO_EVENTS } : real

  const startEdit = (e: AppEvent) => setEditing(e)
  const profile: UserProfile = DEMO
    ? { name: "Demo User", email: "you@example.com" }
    : { ...auth.profile, email: auth.profile?.email ?? data.calendars?.find((c) => c.primary)?.id }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2.5">
            <Logo />
            <div className="leading-tight">
              <p className="font-semibold tracking-tight">{t.app.name}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">{t.app.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <AboutButton onClick={() => setAboutOpen(true)} />
            <LanguageToggle />
            <ThemeMenu />
            {signedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" className="ms-1 h-9 gap-2 px-1.5" />}>
                  <Avatar profile={profile} />
                  <span className="hidden max-w-48 truncate text-sm lg:inline">{profile.name ?? profile.email}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
                      <Avatar profile={profile} />
                      <span className="min-w-0 leading-tight">
                        {profile.name && <span className="block truncate font-medium text-foreground">{profile.name}</span>}
                        <span className="block truncate text-xs">{profile.email}</span>
                      </span>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => auth.signIn({ selectAccount: true })}>
                    <UserRound /> {t.header.switchAccount}
                  </DropdownMenuItem>
                  {!clientIdFromEnv && (
                    <DropdownMenuItem
                      onClick={() => {
                        auth.signOut()
                        setClientId(null)
                        setClientIdState(null)
                      }}
                    >
                      <Settings2 /> {t.header.changeClientId}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={auth.signOut}>
                    <LogOut className="rtl:rotate-180" /> {t.header.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {!clientId && !DEMO ? (
          <SetupClientId
            onSave={(id) => {
              setClientId(id)
              setClientIdState(id)
            }}
          />
        ) : !signedIn ? (
          <Landing
            onConnect={() => auth.signIn()}
            connecting={auth.status === "signing-in"}
            expired={auth.expired}
            onAbout={() => setAboutOpen(true)}
          />
        ) : (
          <div className="space-y-6">
            <EventForm
              // A fresh form per event being edited (or for a new event).
              key={editing ? `edit:${editing.id}` : "new"}
              calendars={data.calendars}
              onCreated={data.addEvent}
              onError={auth.handleError}
              editing={editing}
              onSaved={(updated) => {
                data.updateEvent(updated)
                setEditing(null)
              }}
              onCancelEdit={() => setEditing(null)}
            />
            <EventsList
              events={data.events}
              calendars={data.calendars}
              onDeleted={(id) => {
                data.removeEvent(id)
                if (editing?.id === id) setEditing(null)
              }}
              onRefresh={data.refresh}
              onError={auth.handleError}
              onEdit={startEdit}
              editingId={editing?.id}
              onScan={data.scanForHebrewEvents}
            />
          </div>
        )}
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {t.footer.uses}
        <code dir="ltr" className="font-mono">
          RRULE:…;RSCALE=HEBREW
        </code>{" "}
        (RFC 7529) ·{" "}
        <button type="button" onClick={() => setAboutOpen(true)} className="underline underline-offset-2 hover:text-foreground">
          {t.header.about}
        </button>{" "}
        · {t.footer.datesBy}{" "}
        <a href="https://github.com/hebcal/hdate" className="underline underline-offset-2 hover:text-foreground" target="_blank" rel="noreferrer">
          @hebcal/hdate
        </a>
        <span className="mt-2 block">
          <a href="./privacy.html" className="underline underline-offset-2 hover:text-foreground">
            {t.footer.privacy}
          </a>{" "}
          ·{" "}
          <a href="./terms.html" className="underline underline-offset-2 hover:text-foreground">
            {t.footer.terms}
          </a>
        </span>
      </footer>

      <About open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  )
}

function Logo() {
  return (
    <div className="relative flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
      <span lang="he" className="text-lg leading-none font-semibold">
        א
      </span>
    </div>
  )
}

function Avatar({ profile }: { profile: UserProfile }) {
  const [failed, setFailed] = useState(false)
  const initial = (profile.name ?? profile.email ?? "?")[0]
  if (profile.picture && !failed)
    return (
      <img
        src={profile.picture}
        alt=""
        // Google avatar URLs reject requests that carry a third-party referrer.
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-7 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    )
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground uppercase">
      {initial}
    </span>
  )
}

function AboutButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <Button variant="ghost" className="h-9 gap-1.5 px-2.5" onClick={onClick} aria-label={t.header.about}>
      <Info /> <span className="max-sm:hidden">{t.header.about}</span>
    </Button>
  )
}

/** Switches to the other language. Until clicked, the language follows the browser's preferences. */
function LanguageToggle() {
  const { t, lang, setLang } = useI18n()
  return (
    <Button variant="ghost" className="h-9 gap-1.5 px-2.5" onClick={() => setLang(lang === "he" ? "en" : "he")} aria-label={t.header.otherLanguageAria}>
      <Languages />{" "}
      <span className="max-sm:hidden" lang={lang === "he" ? "en" : "he"}>
        {t.header.otherLanguage}
      </span>
    </Button>
  )
}

function ThemeMenu() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  const Icon = theme === "system" ? Monitor : theme === "dark" ? Moon : Sun
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t.header.theme} />}>
        <Icon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.header.theme}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
            <DropdownMenuRadioItem value="system">
              <Monitor /> {t.header.themeSystem}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light">
              <Sun /> {t.header.themeLight}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon /> {t.header.themeDark}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
