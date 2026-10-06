import { ExternalLink } from "lucide-react"
import type { ReactNode } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/i18n"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Slide-over panel explaining the problem, the iCalendar RFCs, and what the app does. */
export function About({ open, onOpenChange }: Props) {
  const { lang, dir } = useI18n()
  const he = lang === "he"
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={dir === "rtl" ? "left" : "right"}
        closeLabel={he ? "סגירה" : "Close"}
        className="w-full gap-0 p-0 data-[side=left]:sm:max-w-2xl data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-xl">{he ? "על הפרויקט" : "About"}</SheetTitle>
          <SheetDescription>
            {he
              ? "למה קשה לקבוע אירוע חוזר לפי התאריך העברי, ואיך האפליקציה פותרת את זה."
              : "Why Hebrew-date recurring events are hard, and how this app fixes that."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <article className="space-y-8 px-6 py-6 text-[0.94rem] leading-relaxed">{he ? <AboutHe /> : <AboutEn />}</article>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

const P = ({ children }: { children: ReactNode }) => <p className="text-pretty text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground">{children}</p>

const C = ({ children }: { children: ReactNode }) => (
  <code dir="ltr" className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
    {children}
  </code>
)

function Pre({ children }: { children: string }) {
  return (
    <pre dir="ltr" className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-start font-mono text-xs leading-relaxed text-foreground">
      {children}
    </pre>
  )
}

function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 ps-5 text-muted-foreground marker:text-muted-foreground/60 [&_b]:font-semibold [&_b]:text-foreground">{children}</ul>
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
      {children}
      <ExternalLink className="size-3" />
    </a>
  )
}

/** RFC 7529 month numbers for RSCALE=HEBREW. */
function MonthTable({ he }: { he: boolean }) {
  const rows: [string, string, string][] = [
    ["1", "Tishrei", "תשרי"],
    ["2", "Cheshvan", "חשוון"],
    ["3", "Kislev", "כסלו"],
    ["4", "Tevet", "טבת"],
    ["5", "Shevat", "שבט"],
    ["5L", he ? "Adar I" : "Adar I (leap years only)", he ? "אדר א׳ (רק בשנה מעוברת)" : "אדר א׳"],
    ["6", he ? "Adar / Adar II" : "Adar (Adar II in leap years)", he ? "אדר / אדר ב׳ (בשנה מעוברת)" : "אדר / אדר ב׳"],
    ["7", "Nisan", "ניסן"],
    ["8–12", "Iyar … Elul", "אייר … אלול"],
  ]
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-start font-medium">BYMONTH</th>
            <th className="px-3 py-2 text-start font-medium">{he ? "חודש" : "Month"}</th>
            <th className="px-3 py-2 text-start font-medium">{he ? "באנגלית" : "Hebrew"}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(([n, en, heName]) => (
            <tr key={n}>
              <td className="px-3 py-1.5 font-mono text-xs" dir="ltr">
                {n}
              </td>
              <td className="px-3 py-1.5">{he ? heName : en}</td>
              <td className="px-3 py-1.5 text-muted-foreground" dir={he ? "ltr" : "rtl"}>
                {he ? en : heName}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const EXAMPLE = `DTSTART;VALUE=DATE:20260202
RRULE:FREQ=YEARLY;RSCALE=HEBREW
SUMMARY:Grandma's birthday (15 Shevat)`

const SKIP_EXAMPLE = `RRULE:FREQ=YEARLY;RSCALE=HEBREW;SKIP=FORWARD`

/* ------------------------------------------------------------------ */
/* English                                                             */
/* ------------------------------------------------------------------ */

function AboutEn() {
  return (
    <>
      <Section title="The problem">
        <P>
          Many Jewish dates are kept by the <b>Hebrew calendar</b>: birthdays, yahrzeits (anniversaries of a death), wedding
          anniversaries, bar and bat mitzvahs. The Hebrew calendar is <b>lunisolar</b>. Its months follow the moon (29 or
          30 days), and a 13th month is added 7 times in every 19 years so the holidays stay in their seasons. As a result, a
          Hebrew date falls on a different Gregorian date every year, usually about 11 days earlier than the year before,
          then roughly 30 days later after a leap year.
        </P>
        <P>
          Google Calendar’s “Repeat → Annually” only understands the Gregorian calendar, so a yearly event set for a
          Hebrew birthday is wrong from the second year on. The usual workarounds are entering every year by hand, or
          subscribing to a feed of precomputed one-off events. Neither gives you a real recurring event you can rename,
          set reminders on, or delete as one series.
        </P>
      </Section>

      <Section title="Background: iCalendar and RRULE">
        <P>
          Calendar software exchanges events in the <b>iCalendar</b> format (the <C>.ics</C> files), first standardized
          in 1998 as <A href="https://www.rfc-editor.org/rfc/rfc2445">RFC 2445</A> and revised in 2009 as{" "}
          <A href="https://www.rfc-editor.org/rfc/rfc5545">RFC 5545</A>. The same format underlies CalDAV and the
          Google Calendar API, where an event’s <C>recurrence</C> field holds iCalendar <C>RRULE</C>, <C>RDATE</C> and{" "}
          <C>EXDATE</C> lines.
        </P>
        <P>
          An <C>RRULE</C> describes a repeating pattern: <C>FREQ</C> (daily, weekly, monthly, yearly), <C>INTERVAL</C>,{" "}
          <C>COUNT</C> or <C>UNTIL</C>, and filters like <C>BYMONTH</C> or <C>BYMONTHDAY</C>. RFC 5545 interprets all of
          these in the <b>Gregorian calendar</b>. “Every year on 15 Shevat” simply can’t be written in it.
        </P>
      </Section>

      <Section title="RFC 7529: non-Gregorian recurrence rules">
        <P>
          In 2015, <A href="https://www.rfc-editor.org/rfc/rfc7529">RFC 7529</A> (by C. Daboo of Apple and G. Yakushev of
          Google) extended <C>RRULE</C> with three things:
        </P>
        <UL>
          <li>
            <b>
              <C>RSCALE</C>
            </b>
            : the calendar system the rule is evaluated in, using names registered with Unicode CLDR, such as{" "}
            <C>HEBREW</C>, <C>CHINESE</C>, <C>ISLAMIC-CIVIL</C> or <C>ETHIOPIC</C>. The start date (<C>DTSTART</C>) stays
            Gregorian; it’s converted to the chosen calendar, the rule is applied there, and each occurrence is converted
            back.
          </li>
          <li>
            <b>Leap months</b>: a month number with an <C>L</C> suffix is the leap month that follows that month. In the
            Hebrew calendar, <C>5L</C> is Adar I.
          </li>
          <li>
            <b>
              <C>SKIP</C>
            </b>
            : what to do when a computed date doesn’t exist that year. <C>OMIT</C> (the default) drops it,{" "}
            <C>BACKWARD</C> moves it to the previous valid day or month, and <C>FORWARD</C> to the next one.
          </li>
        </UL>
        <P>So a birthday on 15 Shevat 5786 (February 2, 2026) becomes:</P>
        <Pre>{EXAMPLE}</Pre>
        <P>
          Note that <C>FREQ</C> comes first. RFC 5545 requires that for compatibility with older software, and RFC 7529
          leaves it unchanged.
        </P>
      </Section>

      <Section title="The Hebrew calendar in RFC 7529 terms">
        <P>
          Months are numbered from Tishrei, the start of the Hebrew year. Regular years have 12 months; leap years (years
          3, 6, 8, 11, 14, 17 and 19 of each 19-year cycle) insert Adar I before Adar, which is then called Adar II:
        </P>
        <MonthTable he={false} />
        <P>Two kinds of dates don’t exist every year, and that’s where SKIP matters:</P>
        <UL>
          <li>
            <b>Adar I</b> (<C>5L</C>) exists only in leap years. A yearly event on 10 Adar I would, by default, appear only
            in leap years. <C>SKIP=FORWARD</C> moves it to 10 Adar in regular years (the common custom);{" "}
            <C>BACKWARD</C> moves it to 10 Shevat.
          </li>
          <li>
            <b>The 30th</b> of Cheshvan and Kislev exists only in some years, and about half of all months have 29 days.
            Here <C>BACKWARD</C> means the 29th and <C>FORWARD</C> the 1st of the next month.
          </li>
        </UL>
        <Pre>{SKIP_EXAMPLE}</Pre>
        <P>
          An event in Adar of a regular year needs no SKIP: month <C>6</C> is Adar II in leap years, which is when Purim and
          most Adar anniversaries are kept.
        </P>
      </Section>

      <Section title="The gap in Google Calendar">
        <P>
          Google Calendar’s servers implement RSCALE. If you create an event through the{" "}
          <A href="https://developers.google.com/workspace/calendar/api/v3/reference/events">Calendar API</A> with a rule
          like the one above, Google stores it and expands it to the correct Gregorian dates in every view, on every
          device. But none of Google’s apps let you <i>create</i> such a rule, because the repeat editor only offers
          Gregorian patterns. This app fills that gap.
        </P>
      </Section>

      <Section title="What this app does">
        <UL>
          <li>Lets you pick a date on a Hebrew or Gregorian grid, with both dates shown on every day.</li>
          <li>
            Builds the <C>RRULE</C>: yearly or monthly, an interval, an end, and a <C>SKIP</C> choice when the date
            needs one.
          </li>
          <li>Previews the upcoming dates, computed locally by the same RFC 7529 rules.</li>
          <li>Creates the event in the calendar you choose, through the Google Calendar API.</li>
          <li>
            Checks each event it created by asking Google for the upcoming instances and comparing them with the
            expected Hebrew dates.
          </li>
        </UL>
        <P>
          Everything runs in your browser. There’s no server, and the Google access token is kept only for the current
          browser session.
        </P>
      </Section>

      <Section title="Good to know">
        <UL>
          <li>
            Editing the title, time, reminders or description in Google Calendar is fine. Don’t change the{" "}
            <b>repeat settings</b> there: Google’s editor can’t represent RSCALE and will replace the rule with a
            Gregorian one.
          </li>
          <li>
            Other apps that read your Google Calendar through CalDAV or <C>.ics</C> export may not support RSCALE. They
            might show only the first occurrence or treat the rule as Gregorian.
          </li>
          <li>
            The Hebrew day starts at nightfall. If something happened after sunset, use the “after sunset” option when
            picking a Gregorian date.
          </li>
          <li>
            Customs differ, for example for a first yahrzeit, or for dates in Adar of a leap year. The app follows the
            RFC rules and your SKIP choice; check your family’s or community’s custom.
          </li>
        </UL>
      </Section>

      <Section title="Further reading">
        <UL>
          <li>
            <A href="https://www.rfc-editor.org/rfc/rfc5545">RFC 5545: Internet Calendaring and Scheduling (iCalendar)</A>
          </li>
          <li>
            <A href="https://www.rfc-editor.org/rfc/rfc7529">RFC 7529: Non-Gregorian Recurrence Rules in iCalendar</A>
          </li>
          <li>
            <A href="https://www.hebcal.com/">Hebcal</A>: the Hebrew calendar library behind this app’s date conversions
          </li>
        </UL>
      </Section>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Hebrew                                                              */
/* ------------------------------------------------------------------ */

function AboutHe() {
  return (
    <>
      <Section title="הבעיה">
        <P>
          הרבה תאריכים יהודיים נשמרים לפי <b>הלוח העברי</b>: ימי הולדת, ימי זיכרון (יארצייט), ימי נישואין, בר ובת מצווה.
          הלוח העברי הוא <b>ירחי־שמשי</b>. החודשים נקבעים לפי הירח (29 או 30 ימים), ו־7 פעמים בכל 19 שנים נוסף חודש
          שלושה־עשר, כדי שהחגים יישארו בעונתם. לכן תאריך עברי נופל בכל שנה בתאריך לועזי אחר, בדרך כלל כ־11 יום מוקדם יותר
          מהשנה הקודמת, ואחרי שנה מעוברת כ־30 יום מאוחר יותר.
        </P>
        <P>
          האפשרות ״חזרה ← כל שנה״ ביומן Google מכירה רק את הלוח הלועזי, כך שאירוע שנתי ליום הולדת עברי שגוי כבר מהשנה
          השנייה. הפתרונות המקובלים הם להזין כל שנה ידנית, או להירשם לפיד של אירועים בודדים שחושבו מראש. אף אחד מהם לא
          נותן אירוע חוזר אמיתי שאפשר לשנות את שמו, להגדיר לו תזכורות או למחוק אותו כסדרה אחת.
        </P>
      </Section>

      <Section title="רקע: iCalendar ו־RRULE">
        <P>
          תוכנות יומן מעבירות אירועים ביניהן בפורמט <b>iCalendar</b> (קובצי <C>.ics</C>), שתוקנן לראשונה ב־1998 כ־
          <A href="https://www.rfc-editor.org/rfc/rfc2445">RFC 2445</A> ועודכן ב־2009 כ־
          <A href="https://www.rfc-editor.org/rfc/rfc5545">RFC 5545</A>. אותו פורמט עומד מאחורי CalDAV ומאחורי ה־API של
          יומן Google, שבו השדה <C>recurrence</C> של אירוע מכיל שורות <C>RRULE</C>, <C>RDATE</C> ו־<C>EXDATE</C>.
        </P>
        <P>
          <C>RRULE</C> מתאר תבנית חזרה: <C>FREQ</C> (יומי, שבועי, חודשי, שנתי), <C>INTERVAL</C>, <C>COUNT</C> או{" "}
          <C>UNTIL</C>, ומסננים כמו <C>BYMONTH</C> או <C>BYMONTHDAY</C>. לפי RFC 5545 כל אלה מתפרשים ב<b>לוח הלועזי</b>.
          ״בכל שנה בט״ו בשבט״ פשוט אי אפשר לכתוב בו.
        </P>
      </Section>

      <Section title="RFC 7529: כללי חזרה בלוחות שאינם גרגוריאניים">
        <P>
          ב־2015 הרחיב <A href="https://www.rfc-editor.org/rfc/rfc7529">RFC 7529</A> (מאת C. Daboo מ־Apple ו־G. Yakushev
          מ־Google) את <C>RRULE</C> בשלושה דברים:
        </P>
        <UL>
          <li>
            <b>
              <C>RSCALE</C>
            </b>
            : מערכת הלוח שבה הכלל מחושב, לפי שמות הרשומים ב־Unicode CLDR, כמו <C>HEBREW</C>, <C>CHINESE</C>,{" "}
            <C>ISLAMIC-CIVIL</C> או <C>ETHIOPIC</C>. תאריך ההתחלה (<C>DTSTART</C>) נשאר לועזי; הוא מומר ללוח שנבחר, הכלל
            מופעל שם, וכל מופע מומר בחזרה.
          </li>
          <li>
            <b>חודשים מעוברים</b>: מספר חודש עם הסיומת <C>L</C> הוא החודש המעובר שבא אחרי אותו חודש. בלוח העברי, <C>5L</C>{" "}
            הוא אדר א׳.
          </li>
          <li>
            <b>
              <C>SKIP</C>
            </b>
            : מה לעשות כשתאריך מחושב לא קיים באותה שנה. <C>OMIT</C> (ברירת המחדל) משמיט אותו, <C>BACKWARD</C> מעביר אותו
            ליום או לחודש התקף הקודם, ו־<C>FORWARD</C> לבא אחריו.
          </li>
        </UL>
        <P>כך יום הולדת בט״ו בשבט תשפ״ו (2 בפברואר 2026) נכתב:</P>
        <Pre>{EXAMPLE}</Pre>
        <P>
          שימו לב ש־<C>FREQ</C> בא ראשון. RFC 5545 דורש זאת לשם תאימות לתוכנות ישנות, ו־RFC 7529 לא שינה זאת.
        </P>
      </Section>

      <Section title="הלוח העברי במונחי RFC 7529">
        <P>
          החודשים ממוספרים החל מתשרי, תחילת השנה העברית. בשנה רגילה יש 12 חודשים; בשנה מעוברת (השנים 3, 6, 8, 11, 14, 17
          ו־19 בכל מחזור של 19 שנים) נוסף אדר א׳ לפני אדר, שנקרא אז אדר ב׳:
        </P>
        <MonthTable he />
        <P>שני סוגים של תאריכים לא קיימים בכל שנה, ושם SKIP חשוב:</P>
        <UL>
          <li>
            <b>אדר א׳</b> (<C>5L</C>) קיים רק בשנים מעוברות. אירוע שנתי בי׳ באדר א׳ יופיע כברירת מחדל רק בשנים מעוברות.{" "}
            <C>SKIP=FORWARD</C> מעביר אותו לי׳ באדר בשנים רגילות (המנהג המקובל); <C>BACKWARD</C> מעביר אותו לי׳ בשבט.
          </li>
          <li>
            <b>ל׳</b> בחשוון ובכסלו קיים רק בחלק מהשנים, ובערך מחצית מכל החודשים הם בני 29 ימים. כאן <C>BACKWARD</C> פירושו
            כ״ט, ו־<C>FORWARD</C> פירושו א׳ בחודש הבא.
          </li>
        </UL>
        <Pre>{SKIP_EXAMPLE}</Pre>
        <P>
          אירוע באדר של שנה רגילה לא צריך SKIP: חודש <C>6</C> הוא אדר ב׳ בשנים מעוברות, ושם נוהגים לציין את פורים ואת
          רוב ימי הזיכרון והשמחות של אדר.
        </P>
      </Section>

      <Section title="הפער ביומן Google">
        <P>
          השרתים של יומן Google תומכים ב־RSCALE. אם יוצרים אירוע דרך{" "}
          <A href="https://developers.google.com/workspace/calendar/api/v3/reference/events">ה־API של היומן</A> עם כלל
          כמו זה שלמעלה, Google שומר אותו ומחשב את התאריכים הלועזיים הנכונים בכל תצוגה ובכל מכשיר. אבל אף אחת
          מהאפליקציות של Google לא מאפשרת <i>ליצור</i> כלל כזה, כי עורך החזרות מציע רק תבניות לועזיות. האפליקציה הזו
          משלימה את החסר.
        </P>
      </Section>

      <Section title="מה האפליקציה עושה">
        <UL>
          <li>מאפשרת לבחור תאריך בלוח עברי או לועזי, כשבכל יום מוצגים שני התאריכים.</li>
          <li>
            בונה את ה־<C>RRULE</C>: שנתי או חודשי, מרווח, סיום, ובחירת <C>SKIP</C> כשהתאריך דורש זאת.
          </li>
          <li>מציגה מראש את המועדים הקרובים, שמחושבים מקומית לפי אותם כללים של RFC 7529.</li>
          <li>יוצרת את האירוע ביומן שבחרתם, דרך ה־API של יומן Google.</li>
          <li>בודקת כל אירוע שיצרה: מבקשת מ־Google את המופעים הקרובים ומשווה אותם לתאריכים העבריים הצפויים.</li>
        </UL>
        <P>הכול פועל בדפדפן שלכם. אין שרת, וטוקן הגישה של Google נשמר רק למשך הפעלת הדפדפן הנוכחית.</P>
      </Section>

      <Section title="כדאי לדעת">
        <UL>
          <li>
            מותר לערוך ביומן Google את הכותרת, השעה, התזכורות והתיאור. אל תשנו שם את <b>הגדרות החזרה</b>: העורך של Google
            לא יודע לייצג RSCALE ויחליף את הכלל בכלל לועזי.
          </li>
          <li>
            אפליקציות אחרות שקוראות את יומן Google שלכם דרך CalDAV או ייצוא <C>.ics</C> עשויות לא לתמוך ב־RSCALE. הן עלולות
            להציג רק את המופע הראשון, או לפרש את הכלל כלועזי.
          </li>
          <li>היום העברי מתחיל בערב. אם משהו קרה אחרי השקיעה, השתמשו באפשרות ״אחרי השקיעה״ כשבוחרים תאריך לועזי.</li>
          <li>
            המנהגים שונים, למשל ביארצייט הראשון או בתאריכים באדר של שנה מעוברת. האפליקציה פועלת לפי כללי ה־RFC ולפי בחירת
            ה־SKIP שלכם; בדקו את מנהג המשפחה או הקהילה.
          </li>
        </UL>
      </Section>

      <Section title="לקריאה נוספת">
        <UL>
          <li>
            <A href="https://www.rfc-editor.org/rfc/rfc5545">RFC 5545: Internet Calendaring and Scheduling (iCalendar)</A>
          </li>
          <li>
            <A href="https://www.rfc-editor.org/rfc/rfc7529">RFC 7529: Non-Gregorian Recurrence Rules in iCalendar</A>
          </li>
          <li>
            <A href="https://www.hebcal.com/">Hebcal</A>: ספריית הלוח העברי שעליה מבוססות המרות התאריכים באפליקציה
          </li>
        </UL>
      </Section>
    </>
  )
}
