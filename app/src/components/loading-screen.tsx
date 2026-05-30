import * as React from "react"
import { Navigation } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingScreenProps extends React.ComponentProps<"div"> {
  message?: string
}

export function LoadingScreen({
  message = "Finding best routes...",
  //   className,
  ...props
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center p-6",
        "animate-in bg-background text-foreground transition-colors duration-300 fade-in-0"
      )}
      {...props}
    >
      <div className="relative flex w-full max-w-xs flex-col items-center gap-8 text-center">
        {/* --- BRAND ANIMATION ELEMENT --- */}
        <div className="relative flex size-24 items-center justify-center">
          {/* Ambient Outer Radar Waves */}
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/10 opacity-75 duration-1000" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-primary/5 duration-1000" />

          {/* Central Animated Core Icon Container */}
          <div className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-[#5B93FF] to-[#3B82F6] text-white shadow-lg shadow-blue-500/20">
            <Navigation className="size-7 animate-bounce stroke-[2.2] drop-shadow-sm filter duration-1000" />
          </div>
        </div>

        {/* --- TEXT & STATUS MESSAGES --- */}
        <div className="space-y-2">
          <h2 className="animate-pulse text-xl font-black tracking-tight text-foreground">
            RouteWise
          </h2>
          <p className="min-h-[20px] text-sm font-semibold tracking-wide text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}
