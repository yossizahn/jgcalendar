import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { cn } from "cn"
import type { ReactNode } from "react"

interface Props<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
  "aria-label"?: string
}

/** Pill-style single-choice control (iOS-like segmented control). */
export function Segmented<T extends string>({ value, onChange, options, className, ...rest }: Props<T>) {
  return (
    <ToggleGroupPrimitive
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as T)}
      className={cn("inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground", className)}
      {...rest}
    >
      {options.map((o) => (
        <TogglePrimitive
          key={o.value}
          value={o.value}
          className={cn(
            "inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all outline-none",
            "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            "data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-sm dark:data-pressed:bg-input/50",
          )}
        >
          {o.label}
        </TogglePrimitive>
      ))}
    </ToggleGroupPrimitive>
  )
}
