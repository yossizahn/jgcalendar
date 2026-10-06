import { cn } from "cn"
import { useState } from "react"
import type { UserProfile } from "@/lib/google"

/** Google profile picture, falling back to the first letter of the name or email. */
export function Avatar({ profile, className }: { profile: UserProfile; className?: string }) {
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
        className={cn("size-7 shrink-0 rounded-full object-cover ring-1 ring-border", className)}
      />
    )
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground uppercase", className)}>
      {initial}
    </span>
  )
}
