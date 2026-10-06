import { ExternalLink, KeyRound } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/i18n"

/** Shown when no OAuth client ID is configured (no VITE_GOOGLE_CLIENT_ID and nothing saved). */
export function SetupClientId({ onSave }: { onSave: (id: string) => void }) {
  const { t } = useI18n()
  const [value, setValue] = useState("")
  const valid = /^[\w-]+\.apps\.googleusercontent\.com$/.test(value.trim())
  const origin = window.location.origin

  const link = (href: string, label: string) => (
    <a className="font-medium text-primary underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">
      {label} <ExternalLink className="inline size-3" />
    </a>
  )
  const code = (s: string) => (
    <code dir="ltr" className="font-mono">
      {s}
    </code>
  )

  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="size-5 text-primary" /> {t.setup.title}
          </CardTitle>
          <CardDescription>{t.setup.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="list-decimal space-y-3 ps-5 text-sm marker:text-muted-foreground">
            {t.setup
              .steps(
                link,
                <code dir="ltr" className="mt-1.5 block w-fit rounded bg-muted px-2 py-1 font-mono text-xs">
                  {origin}
                </code>,
              )
              .map((step, i) => (
                <li key={i}>{step}</li>
              ))}
          </ol>

          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (valid) onSave(value.trim())
            }}
          >
            <Label htmlFor="client-id">{t.setup.label}</Label>
            <div className="flex gap-2">
              <Input
                id="client-id"
                dir="ltr"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="1234567890-abc123.apps.googleusercontent.com"
                className="h-10 font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              <Button type="submit" size="lg" className="h-10" disabled={!valid}>
                {t.setup.save}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t.setup.note(code)}</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
