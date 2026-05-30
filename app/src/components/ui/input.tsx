import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  // Accepts direct JSX elements like <MapPin className="text-red-500" />
  icon?: React.ReactNode
}

function Input({ className, type, icon, ...props }: InputProps) {
  return (
    // h-fit prevents the wrapper from stretching outside its intended bounds
    <div
      className="relative flex h-fit w-full items-center"
      data-slot="input-wrapper"
    >
      {/* Absolute container that safely clones style attributes onto your passed icon element */}
      {icon && (
        <div className="pointer-events-none absolute left-4 z-10 flex items-center justify-center text-muted-foreground [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0">
          {icon}
        </div>
      )}

      <input
        type={type}
        data-slot="input"
        className={cn(
          // Sizing & Structure: Tall mobile target with full pill-rounding
          "h-12 w-full min-w-0 rounded-full py-3 text-base font-medium transition-all outline-none md:text-sm",

          // Dynamic left padding based on the presence of the icon element
          icon ? "pr-5 pl-12" : "px-5",

          // Background & Text: Solid light grey container, high contrast text, no harsh borders
          "border-none bg-secondary text-foreground placeholder:text-muted-foreground/70",

          // Focus state: Smooth ambient glow ring shadow
          "focus-visible:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-primary/20",

          // Disabled States
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",

          // Error States
          "aria-invalid:bg-destructive/10 aria-invalid:text-destructive aria-invalid:placeholder:text-destructive/60",

          className
        )}
        {...props}
      />
    </div>
  )
}

export { Input }
