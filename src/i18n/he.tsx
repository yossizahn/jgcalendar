import { months } from "@hebcal/hdate"
import type { ReactNode } from "react"
import { hebrewDay, icalMonthLabel, icalMonthOf, monthName } from "@/lib/hebrew"
import type { RecurrenceSpec, Skip, SkipIssue } from "@/lib/recurrence"
import type { Messages } from "."

const B = ({ children }: { children: ReactNode }) => <b>{children}</b>
const UNTIL = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" })
/** Gematria day, e.g. ט״ו */
const d = (n: number) => hebrewDay(n, "he")
/** Month name in Hebrew, e.g. שבט */
const m = (month: number) => monthName(month, 5786, "he")

export const he: Messages = {
  app: {
    name: "לוח",
    tagline: "תאריכים עבריים ביומן Google",
    documentTitle: "לוח · תאריכים עבריים ביומן Google",
  },

  header: {
    about: "אודות",
    switchAccount: "החלפת חשבון",
    changeClientId: "שינוי מזהה לקוח",
    signOut: "התנתקות",
    theme: "ערכת נושא",
    themeSystem: "לפי המערכת",
    themeLight: "בהירה",
    themeDark: "כהה",
    otherLanguage: "English",
    otherLanguageAria: "Switch to English",
  },

  footer: {
    uses: "משתמש ב־",
    datesBy: "תאריכים עבריים באמצעות",
    privacy: "פרטיות",
    terms: "תנאי שימוש",
  },

  landing: {
    title: (em) => <>אירועים חוזרים לפי {em("התאריך העברי")} ביומן Google.</>,
    body:
      "ימי הולדת, ימי זיכרון (יארצייט), ימי נישואין. יומן Google יודע לחזור על אירועים לפי הלוח העברי, אבל באפליקציה שלו אין לזה הגדרה. בוחרים כאן את התאריך, והוא נוסף ליומן שלכם ויופיע ביום הנכון בכל שנה.",
    connect: "חיבור ליומן Google",
    reconnect: "התחברות מחדש ליומן Google",
    expired: "פג תוקף החיבור ל־Google. יש להתחבר מחדש כדי להמשיך.",
    privacy: "פועל כולו בדפדפן, ללא שרת. יש לו גישה רק לפרופיל שלכם, לרשימת היומנים ולניהול אירועים.",
    howItWorks: "למה צריך את זה? לקריאת הרקע",
    exampleTitle: "יום ההולדת של סבתא",
    exampleNote: "התאריך הלועזי משתנה משנה לשנה. בחזרה שנתית רגילה, Google היה משאיר את האירוע באותו תאריך לועזי.",
  },

  setup: {
    title: "הגדרה חד־פעמית: מזהה לקוח OAuth של Google",
    description: "Google דורש שלכל אפליקציה שמתחברת עם חשבון Google יהיה מזהה לקוח משלה. זה בחינם ולוקח כשלוש דקות.",
    steps: (link, origin) => [
      <>
        פתחו את {link("https://console.cloud.google.com/apis/library/calendar-json.googleapis.com", "דף Google Calendar API")}, בחרו או צרו פרויקט ולחצו <B>Enable</B>.
      </>,
      <>
        ב־{link("https://console.cloud.google.com/auth/overview", "Google Auth Platform")}, הגדירו מיתוג (Branding) עם קהל <B>External</B>, ואז הוסיפו את חשבון ה־Google שלכם תחת <B>Audience → Test users</B>.
      </>,
      <>
        תחת <B>Clients → Create client</B>, בחרו <B>Web application</B> והוסיפו את הכתובת הזו ל־<B>Authorized JavaScript origins</B>:{origin}
      </>,
      <>העתיקו את מזהה הלקוח והדביקו אותו למטה.</>,
    ],
    label: "מזהה לקוח (Client ID)",
    save: "שמירה",
    note: (code) => (
      <>
        נשמר בדפדפן הזה בלבד. כדי לקבע אותו בבנייה, הגדירו {code("VITE_GOOGLE_CLIENT_ID")} בקובץ {code(".env.local")}.
      </>
    ),
  },

  calendar: {
    hebrew: "עברי",
    gregorian: "לועזי",
    monthsSuffix: "",
    gridAria: "סוג לוח השנה",
    today: "היום",
    goToSelected: "לתאריך שנבחר",
  },

  form: {
    title: "אירוע חדש בתאריך עברי",
    description: "בוחרים את התאריך פעם אחת, והאירוע יחזור באותו תאריך עברי בכל שנה או בכל חודש.",
    titleLabel: "כותרת",
    titlePlaceholder: "למשל: יום ההולדת העברי של סבתא",
    dateSection: "תאריך",
    dateHint: "השתמשו בלוח שבו אתם מכירים את התאריך. בכל יום מוצגים שני התאריכים.",
    selectDay: "בחרו יום בלוח",
    eveningOf: (date) => `התחיל בערב של ${date}`,
    afterSunset: "זה קרה אחרי השקיעה",
    afterSunsetHint: "היום העברי מתחיל בערב, ולכן התאריך העברי הוא היום שלמחרת.",
    repeatSection: "חזרה",
    yearly: "שנתי",
    monthly: "חודשי",
    frequencyAria: "תדירות החזרה",
    every: "כל",
    intervalAria: "מרווח",
    unit: (freq, n) => (freq === "YEARLY" ? (n === 1 ? "שנה עברית" : "שנים עבריות") : n === 1 ? "חודש עברי" : "חודשים עבריים"),
    whatThen: "מה לעשות במקרה כזה?",
    commonChoice: "הבחירה המקובלת",
    ends: "סיום",
    never: "אף פעם",
    after: "אחרי",
    times: "פעמים",
    countAria: "מספר מופעים",
    on: "בתאריך",
    endDateAria: "תאריך סיום",
    detailsSection: "פרטים",
    allDay: "כל היום",
    to: "עד",
    startTimeAria: "שעת התחלה",
    endTimeAria: "שעת סיום",
    calendar: "יומן",
    loading: "טוען…",
    reminder: "תזכורת",
    descriptionLabel: "תיאור",
    optional: "(לא חובה)",
    descriptionPlaceholder: "הערות, קישורים, למי להתקשר…",
    preview: "תצוגה מקדימה",
    previewDescription: "בדיוק מה שיתווסף ליומן שלכם.",
    pickDateForPreview: "בחרו תאריך כדי לראות את המועדים הקרובים.",
    untitled: "אירוע ללא שם",
    upcoming: "המועדים הקרובים",
    noFuture: "אין מועדים עתידיים. הסדרה מסתיימת לפני היום.",
    moved: "הוזז",
    today: "היום",
    startsInPast: (date) => `הסדרה מתחילה ב־${date}, ולכן יופיעו גם מועדים שכבר עברו.`,
    rule: "כלל החזרה",
    showRule: "הצגת הכלל",
    hideRule: "הסתרת הכלל",
    detailsTitle: "פרטי האירוע",
    timeSection: "שעה",
    onDate: "בתאריך",
    copy: "העתקה",
    copied: "הועתק",
    submit: "הוספה ליומן Google",
    submitting: "מוסיף…",
    missing: {
      title: "כותרת",
      date: "תאריך",
      endDate: "תאריך סיום",
      calendar: "יומן",
    },
    addToContinue: (items) => `כדי להמשיך יש להוסיף ${joinList(items)}.`,
    created: (title, calendar) => `״${title}״ נוסף ליומן ${calendar}`,
    open: "פתיחה",
    droppedRule: "האירוע נוצר, אבל Google השמיט את הכלל העברי",
    savedRecurrence: (r) => `כלל החזרה שנשמר: ${r || "אין"}`,
    createFailed: "לא הצלחנו ליצור את האירוע",
    editTitle: "עריכת אירוע",
    editDescription: "אפשר לשנות כל דבר למטה. השמירה תעדכן את כל המופעים ביומן Google.",
    cancelEdit: "ביטול",
    save: "שמירת השינויים",
    saving: "שומר…",
    saved: (title) => `״${title}״ נשמר`,
    saveFailed: "לא הצלחנו לשמור את האירוע",
    unsupportedRule: "בכלל של האירוע יש חלקים שהעורך לא תומך בהם. השמירה תחליף את הכלל ותשמיט אותם:",
  },

  reminders: {
    keep: "להשאיר את התזכורות הקיימות",
    default: "ברירת המחדל של היומן",
    none: "ללא תזכורת",
    dayBefore9: "יום לפני ב־9:00",
    weekBefore9: "שבוע לפני ב־9:00",
    min10: "10 דקות לפני",
    hour1: "שעה לפני",
    day1: "יום לפני",
  },

  skip: {
    problem: (issue: SkipIssue) => {
      if (issue.kind === "monthly-30") return "בערך מחצית מהחודשים העבריים הם בני 29 ימים בלבד."
      if (issue.kind === "leap-month") return "אדר א׳ קיים רק בשנים מעוברות (7 מכל 19 שנים)."
      return `חודש ${m(issue.month)} הוא לפעמים בן 29 ימים בלבד.`
    },
    outcome: (issue: SkipIssue, skip: Skip) => {
      const { day, month } = issue
      if (issue.kind === "monthly-30")
        return { OMIT: "לדלג על החודשים האלה", BACKWARD: "להשתמש בכ״ט במקום", FORWARD: "להשתמש בא׳ בחודש הבא" }[skip]
      if (issue.kind === "leap-month")
        return {
          OMIT: "רק בשנים מעוברות",
          BACKWARD: `בשנים רגילות: ${d(day)} בשבט`,
          FORWARD: day === 30 ? "בשנים רגילות: א׳ בניסן (באדר יש 29 ימים)" : `בשנים רגילות: ${d(day)} באדר`,
        }[skip]
      const next = month === months.CHESHVAN ? m(months.KISLEV) : m(months.TEVET)
      return { OMIT: "לדלג על השנים האלה", BACKWARD: `להשתמש בכ״ט ב${m(month)} במקום`, FORWARD: `להשתמש בא׳ ב${next} במקום` }[skip]
    },
  },

  describe: (spec: RecurrenceSpec) => {
    const day = d(spec.start.getDate())
    const ical = icalMonthOf(spec.start)
    let s: string
    if (spec.freq === "YEARLY") {
      const every = spec.interval > 1 ? `כל ${spec.interval} שנים` : "בכל שנה"
      s = `${every} ב${day} ב${icalMonthLabel(ical, "he")}`
      if (ical === "6") s += " (באדר ב׳ בשנים מעוברות)"
    } else {
      s = spec.interval > 1 ? `כל ${spec.interval} חודשים עבריים, ב${day} לחודש` : `בכל חודש עברי, ב${day} לחודש`
    }
    if (spec.end.type === "count") s += `, ${spec.end.count} פעמים`
    if (spec.end.type === "until") s += `, עד ${UNTIL.format(spec.end.until)}`
    return s
  },

  events: {
    title: "האירועים העבריים שלכם",
    description:
      "אירועים שנוצרו באפליקציה הזו. אפשר לערוך ביומן Google את הכותרת, השעה וההערות, אבל לא לשנות שם את הגדרות החזרה: העורך של Google לא מכיר תאריכים עבריים ויחליף את הכלל.",
    subtitle: "נוצרו כאן, או נמצאו ביומנים שלכם.",
    editTip: "את הגדרות החזרה ערכו כאן, לא ביומן Google: העורך שלו לא מכיר תאריכים עבריים ויחליף את הכלל. כותרות, שעות והערות אפשר לערוך שם.",
    more: "פעולות נוספות",
    refresh: "רענון",
    empty: "עדיין אין כאן כלום. אירועים שתוסיפו יופיעו כאן.",
    untitled: "(ללא שם)",
    next: "הבא:",
    noUpcoming: "אין מועדים קרובים",
    open: "פתיחה",
    edit: "עריכה",
    editing: "בעריכה",
    delete: "מחיקה",
    scan: "חיפוש אירועים עבריים נוספים",
    scanning: "מחפש ביומנים שלכם…",
    scanFound: (n) => (n === 1 ? "נמצא עוד אירוע עברי אחד" : `נמצאו עוד ${n} אירועים עבריים`),
    scanNone: "לא נמצאו אירועים עבריים נוספים",
    external: "לא נוצר כאן",
    deleteTitle: (name) => `למחוק את ״${name}״?`,
    deleteDescription: (calendar) => `כל המופעים יימחקו מ${calendar ? `היומן ${calendar}` : "היומן שלכם"}. יומן Google שומר אותם באשפה למשך 30 יום.`,
    cancel: "ביטול",
    deleteAll: "מחיקת כל המופעים",
    deleted: (name) => `״${name}״ נמחק`,
    deleteFailed: "לא הצלחנו למחוק את האירוע",
    checkFailed: (name) => `לא הצלחנו לבדוק את ״${name}״`,
    verified: "המועדים הקרובים ב־Google תואמים ללוח העברי",
    verifiedAria: "אומת",
    mismatch: "המועדים ב־Google שונים מהצפוי.",
    mismatchAria: "המועדים שונים",
    google: "Google",
    expected: "צפוי",
    none: "אין",
  },

  errors: {
    generic: "משהו השתבש",
    loadCalendars: "לא הצלחנו לטעון את היומנים שלכם",
    loadEvents: "לא הצלחנו לטעון את האירועים שלכם",
    popupClosed: "חלון ההתחברות נסגר.",
    scopesMissing: "לא ניתנה גישה ליומן. סמנו את שתי תיבות הסימון של היומן במסך ההרשאות של Google.",
    gisLoad: "לא הצלחנו לטעון את ההתחברות של Google. בדקו את החיבור או חוסם הפרסומות.",
    signInFailed: "ההתחברות נכשלה",
  },
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} ו${items.at(-1)}`
}
