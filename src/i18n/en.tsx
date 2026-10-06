import { icalMonthLabel, icalMonthOf, monthName, ordinal } from "@/lib/hebrew"
import type { RecurrenceSpec, Skip, SkipIssue } from "@/lib/recurrence"
import { months } from "@hebcal/hdate"
import type { ReactNode } from "react"

const B = ({ children }: { children: ReactNode }) => <b>{children}</b>
const UNTIL = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

export const en = {
  app: {
    name: "Luach",
    tagline: "Hebrew dates for Google Calendar",
    documentTitle: "Luach · Hebrew dates for Google Calendar",
  },

  header: {
    about: "About",
    switchAccount: "Switch account",
    changeClientId: "Change client ID",
    signOut: "Sign out",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    /** Label of the button that switches to the *other* language. */
    otherLanguage: "עברית",
    otherLanguageAria: "Switch to Hebrew",
  },

  footer: {
    uses: "Uses ",
    datesBy: "Hebrew dates by",
    privacy: "Privacy",
    terms: "Terms",
  },

  landing: {
    title: (em: (s: string) => ReactNode) => <>Repeat events on the {em("Hebrew date")} in Google Calendar.</>,
    body:
      "Birthdays, yahrzeits, anniversaries. Google Calendar can repeat events by the Hebrew calendar, but its app has no setting for it. Pick the date here and it’s added to your calendar, landing on the right day every year.",
    connect: "Connect Google Calendar",
    reconnect: "Reconnect Google Calendar",
    expired: "Your Google session expired. Reconnect to continue.",
    privacy: "Runs entirely in your browser, with no server. It can only see your profile, your list of calendars, and manage events.",
    howItWorks: "Why is this needed? Read the background",
    exampleTitle: "Grandma’s birthday",
    exampleNote: "The Gregorian date moves every year. With a normal yearly repeat, Google would keep it on the same Gregorian date.",
  },

  setup: {
    title: "One-time setup: Google OAuth client ID",
    description: "Google requires every app that signs in with Google to have its own client ID. It’s free and takes about three minutes.",
    steps: (link: (href: string, label: string) => ReactNode, origin: ReactNode) => [
      <>
        Open the {link("https://console.cloud.google.com/apis/library/calendar-json.googleapis.com", "Google Calendar API page")}, pick or create a project, and click <B>Enable</B>.
      </>,
      <>
        In {link("https://console.cloud.google.com/auth/overview", "Google Auth Platform")}, set up branding with audience <B>External</B>, then add your Google account under <B>Audience → Test users</B>.
      </>,
      <>
        Under <B>Clients → Create client</B>, choose <B>Web application</B> and add this to <B>Authorized JavaScript origins</B>:{origin}
      </>,
      <>Copy the client ID and paste it below.</>,
    ],
    label: "Client ID",
    save: "Save",
    note: (code: (s: string) => ReactNode) => (
      <>
        It’s saved in this browser only. To build it in instead, set {code("VITE_GOOGLE_CLIENT_ID")} in {code(".env.local")}.
      </>
    ),
  },

  calendar: {
    hebrew: "Hebrew",
    gregorian: "Gregorian",
    monthsSuffix: " months",
    gridAria: "Calendar grid",
    today: "Today",
    goToSelected: "Go to selected",
  },

  form: {
    title: "New event on a Hebrew date",
    description: "Pick the date once. It will repeat on the same Hebrew date every year or month.",
    titleLabel: "Title",
    titlePlaceholder: "e.g. Grandma’s Hebrew birthday",
    dateSection: "Date",
    dateHint: "Use the grid you know the date in. Each day shows both dates.",
    selectDay: "Select a day in the calendar",
    eveningOf: (date: string) => `Began the evening of ${date}`,
    afterSunset: "It happened after sunset",
    afterSunsetHint: "The Hebrew day starts at nightfall, so the Hebrew date is one day later.",
    repeatSection: "Repeat",
    yearly: "Yearly",
    monthly: "Monthly",
    frequencyAria: "Repeat frequency",
    every: "every",
    intervalAria: "Interval",
    unit: (freq: "YEARLY" | "MONTHLY", n: number): string =>
      freq === "YEARLY" ? (n === 1 ? "Hebrew year" : "Hebrew years") : n === 1 ? "Hebrew month" : "Hebrew months",
    whatThen: "What should happen then?",
    commonChoice: "Common choice",
    ends: "Ends",
    never: "Never",
    after: "After",
    times: "times",
    countAria: "Number of occurrences",
    on: "On",
    endDateAria: "End date",
    detailsSection: "Details",
    allDay: "All day",
    to: "to",
    startTimeAria: "Start time",
    endTimeAria: "End time",
    calendar: "Calendar",
    loading: "Loading…",
    reminder: "Reminder",
    descriptionLabel: "Description",
    optional: "(optional)",
    descriptionPlaceholder: "Notes, links, who to call…",
    preview: "Preview",
    previewDescription: "Exactly what will be added to your calendar.",
    pickDateForPreview: "Pick a date to see the upcoming dates.",
    untitled: "Untitled event",
    upcoming: "Upcoming",
    noFuture: "No future dates. The series ends before today.",
    moved: "moved",
    today: "today",
    startsInPast: (date: string) => `The series starts on ${date}, so past dates show up too.`,
    rule: "Recurrence rule",
    showRule: "Show rule",
    hideRule: "Hide rule",
    options: "Options",
    forever: "Forever",
    timesCount: (n: number) => (n === 1 ? "Once" : `${n} times`),
    untilDate: (date: string) => `Until ${date}`,
    copy: "Copy",
    copied: "Copied",
    submit: "Add to Google Calendar",
    submitting: "Adding…",
    missing: {
      title: "a title",
      date: "a date",
      endDate: "an end date",
      calendar: "a calendar",
    },
    addToContinue: (items: string[]) => `Add ${joinList(items, "and")} to continue.`,
    created: (title: string, calendar: string) => `“${title}” added to ${calendar}`,
    open: "Open",
    droppedRule: "Event created, but Google dropped the Hebrew rule",
    savedRecurrence: (r: string) => `Saved recurrence: ${r || "none"}`,
    createFailed: "Couldn’t create the event",
    editTitle: "Edit event",
    editDescription: "Change anything below. Saving updates every occurrence in Google Calendar.",
    cancelEdit: "Cancel",
    save: "Save changes",
    saving: "Saving…",
    saved: (title: string) => `Saved “${title}”`,
    saveFailed: "Couldn’t save the event",
    unsupportedRule: "This event’s rule has parts the editor doesn’t support. Saving will replace the rule and drop them:",
  },

  reminders: {
    keep: "Keep current reminders",
    default: "Calendar default",
    none: "No reminder",
    dayBefore9: "Day before at 9 AM",
    weekBefore9: "Week before at 9 AM",
    min10: "10 minutes before",
    hour1: "1 hour before",
    day1: "1 day before",
  },

  skip: {
    problem: (issue: SkipIssue): string => {
      if (issue.kind === "monthly-30") return "About half of Hebrew months have only 29 days."
      if (issue.kind === "leap-month") return "Adar I only exists in leap years (7 out of every 19)."
      return `${monthName(issue.month, 5786)} sometimes has only 29 days.`
    },
    outcome: (issue: SkipIssue, skip: Skip): string => {
      const { day, month } = issue
      if (issue.kind === "monthly-30")
        return { OMIT: "Skip those months", BACKWARD: "Use the 29th instead", FORWARD: "Use the 1st of the next month" }[skip]
      if (issue.kind === "leap-month")
        return {
          OMIT: "Only in leap years",
          BACKWARD: `Use ${day} Shevat in regular years`,
          FORWARD: day === 30 ? "Use 1 Nisan in regular years (Adar has 29 days)" : `Use ${day} Adar in regular years`,
        }[skip]
      const name = monthName(month, 5786)
      const next = month === months.CHESHVAN ? "Kislev" : "Tevet"
      return { OMIT: "Skip those years", BACKWARD: `Use 29 ${name} instead`, FORWARD: `Use 1 ${next} instead` }[skip]
    },
  },

  describe: (spec: RecurrenceSpec): string => {
    const day = spec.start.getDate()
    const ical = icalMonthOf(spec.start)
    let s: string
    if (spec.freq === "YEARLY") {
      const every = spec.interval > 1 ? `Every ${spec.interval} years` : "Every year"
      s = `${every} on ${day} ${icalMonthLabel(ical)}`
      if (ical === "6") s += " (Adar II in leap years)"
    } else {
      const every = spec.interval > 1 ? `Every ${spec.interval} Hebrew months` : "Every Hebrew month"
      s = `${every} on the ${ordinal(day)}`
    }
    if (spec.end.type === "count") s += `, ${spec.end.count} times`
    if (spec.end.type === "until") s += `, until ${UNTIL.format(spec.end.until)}`
    return s
  },

  events: {
    title: "Your Hebrew-date events",
    description:
      "Events created with this app. You can edit the title, time and notes in Google Calendar, but don’t change the repeat settings there: Google’s editor can’t show Hebrew dates and would replace the rule.",
    subtitle: "Created here, or found in your calendars.",
    editTip: "Edit repeat settings here, not in Google Calendar: its editor can’t show Hebrew dates and would replace the rule. Titles, times and notes are fine to edit there.",
    more: "More actions",
    refresh: "Refresh",
    empty: "Nothing here yet. Events you add will appear here.",
    untitled: "(untitled)",
    next: "Next:",
    noUpcoming: "No upcoming dates",
    open: "Open",
    edit: "Edit",
    editing: "Editing",
    delete: "Delete",
    scan: "Find other Hebrew-date events",
    scanning: "Searching your calendars…",
    scanFound: (n: number) => (n === 1 ? "Found 1 more Hebrew-date event" : `Found ${n} more Hebrew-date events`),
    scanNone: "No other Hebrew-date events found",
    external: "Not created here",
    deleteTitle: (name: string) => `Delete “${name}”?`,
    deleteDescription: (calendar: string | null) =>
      `This deletes every occurrence from ${calendar ?? "your calendar"}. Google Calendar keeps it in its trash for 30 days.`,
    cancel: "Cancel",
    deleteAll: "Delete all occurrences",
    deleted: (name: string) => `Deleted “${name}”`,
    deleteFailed: "Couldn’t delete the event",
    checkFailed: (name: string) => `Couldn’t check “${name}”`,
    verified: "Google’s upcoming dates match the Hebrew calendar",
    verifiedAria: "Verified",
    mismatch: "Google’s dates differ from the expected ones.",
    mismatchAria: "Dates differ",
    google: "Google",
    expected: "Expected",
    none: "none",
  },

  errors: {
    generic: "Something went wrong",
    loadCalendars: "Couldn’t load your calendars",
    loadEvents: "Couldn’t load your events",
    popupClosed: "Sign-in window was closed.",
    scopesMissing: "Calendar access wasn’t granted. Please tick both calendar checkboxes on Google’s consent screen.",
    gisLoad: "Couldn’t load Google sign-in. Check your connection or ad blocker.",
    signInFailed: "Sign-in failed",
  },
}

function joinList(items: string[], and: string) {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}`
}

