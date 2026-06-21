import * as React from "react"
import {
  Bus,
  ArrowUpRight,
  Info,
  ArrowRight,
  Star,
  Zap,
  Shield,
  PiggyBank,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface RouteOptionData {
  id: string
  busNo: string
  nextBusNo?: string
  transferStop?: string
  arrivalTime: string
  duration: string
  cost: number | string
  reliabilityScore: number
  tagType?: "RECOMMENDED" | "FASTEST" | "CALMEST" | "CHEAPEST" // Upgraded tag configuration type
  crowdStatus: "LOW" | "MEDIUM" | "HIGH"
  additionalInfo?: string
  isAvailable?: boolean
}

interface RouteOptionCardProps extends RouteOptionData {
  isSelected: boolean
  onSelect: (id: string) => void
}

export function RouteOptionCard({
  id,
  busNo,
  nextBusNo,
  transferStop,
  arrivalTime,
  duration,
  cost,
  reliabilityScore,
  tagType,
  crowdStatus,
  additionalInfo,
  isAvailable = true,
  isSelected,
  onSelect,
}: RouteOptionCardProps) {
  // Custom theme configurations based on the crowd status enum
  const crowdConfig = {
    LOW: {
      bg: "bg-green-500/10 dark:bg-green-500/20",
      text: "text-green-600 dark:text-green-400",
      dot: "bg-green-500",
      label: "Less Crowded",
    },
    MEDIUM: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
      label: "Crowded",
    },
    HIGH: {
      bg: "bg-red-500/10 dark:bg-red-500/20",
      text: "text-red-600 dark:text-red-400",
      dot: "bg-red-500",
      label: "Too Crowded",
    },
  }[crowdStatus]

  // Config mapping containing colors, labels, and matching icons for our badges
  const tagConfig = tagType
    ? {
        RECOMMENDED: {
          bg: "bg-blue-500 shadow-blue-500/15",
          text: "text-white",
          label: "Recommended",
          icon: Star,
        },
        FASTEST: {
          bg: "bg-amber-500 shadow-amber-500/15",
          text: "text-zinc-950 dark:text-white",
          label: "Fastest",
          icon: Zap,
        },
        CALMEST: {
          bg: "bg-teal-600 shadow-teal-600/15 dark:bg-teal-500",
          text: "text-white",
          label: "Calmest",
          icon: Shield,
        },
        CHEAPEST: {
          bg: "bg-emerald-600 shadow-emerald-600/15 dark:bg-emerald-500",
          text: "text-white",
          label: "Cheapest",
          icon: PiggyBank,
        },
      }[tagType]
    : null

  const TagIcon = tagConfig?.icon

  const handleViewDirections = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `/routes/${id}`
  }

  return (
    <div
      onClick={() => isAvailable !== false && onSelect(id)}
      className={cn(
        "relative flex w-full cursor-pointer flex-col gap-4 rounded-4xl border border-transparent p-5 transition-all duration-300 select-none",
        isAvailable === false
          ? "bg-secondary/20 text-foreground/40 opacity-40 cursor-not-allowed dark:bg-secondary/5"
          : isSelected
          ? "scale-[1.01] bg-white opacity-100 shadow-xl shadow-black/5 dark:bg-zinc-900 dark:shadow-black/30"
          : "bg-secondary/40 text-foreground/70 opacity-60 hover:opacity-85 dark:bg-secondary/10"
      )}
    >
      {/* Smart Render Pill Badge Area */}
      {isAvailable === false ? (
        <span
          className={cn(
            "absolute -top-3 right-8 inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-[10px] font-black tracking-widest uppercase shadow-md sm:text-xs bg-red-600 text-white shadow-red-600/15"
          )}
        >
          Unavailable
        </span>
      ) : tagConfig && TagIcon && (
        <span
          className={cn(
            "absolute -top-3 right-8 inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-[10px] font-black tracking-widest uppercase shadow-md sm:text-xs",
            tagConfig.bg,
            tagConfig.text
          )}
        >
          <TagIcon className="size-3 shrink-0 stroke-[2.5]" />
          {tagConfig.label}
        </span>
      )}

      {/* Main Row layout split */}
      <div className="flex items-start justify-between gap-3">
        {/* Left Hand: Icon & Identification Layout */}
        <div className="flex items-center gap-3.5">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full transition-colors",
              isAvailable === false
                ? "bg-zinc-500/10 text-zinc-500 dark:bg-zinc-500/20 dark:text-zinc-400"
                : isSelected
                ? "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400"
                : "bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400"
            )}
          >
            <Bus className="size-6 stroke-[2.2]" />
          </div>

          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xl font-bold tracking-tight text-foreground">
              <span>{busNo}</span>
              {nextBusNo && (
                <>
                  <ArrowRight className="size-4 stroke-3 text-muted-foreground/70" />
                  <span>{nextBusNo}</span>
                </>
              )}
            </div>

            <p className="text-xs font-semibold text-muted-foreground">
              {isAvailable !== false ? `Arrives ${arrivalTime}` : "No active bus"}
            </p>

            {transferStop && (
              <p className="text-xs font-medium text-muted-foreground/80">
                Change at{" "}
                <span className="font-bold text-foreground/80">
                  {transferStop}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Right Hand: Metrics */}
        <div className="space-y-0.5 text-right">
          <div className="text-xl font-black tracking-tight text-foreground">
            {duration}
          </div>
          <div className="text-xs font-bold text-muted-foreground">₹{cost}</div>
          <div
            className={cn(
              "mt-1 block text-xs font-bold",
              isAvailable === false
                ? "text-red-500 dark:text-red-400"
                : reliabilityScore >= 90
                ? "text-green-600 dark:text-green-400"
                : "text-muted-foreground"
            )}
          >
            {isAvailable !== false ? `Reliability: ${reliabilityScore}%` : "Offline"}
          </div>
        </div>
      </div>

      {/* Footer Meta Row */}
      <div className="mt-1 flex items-center justify-between gap-4">
        {/* Crowd Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-2 py-1 text-[0.625rem] font-extrabold tracking-wider uppercase",
            isAvailable === false ? "bg-red-500/10 text-red-500 dark:bg-red-500/20" : crowdConfig.bg,
            isAvailable === false ? "text-red-600 dark:text-red-400" : crowdConfig.text
          )}
        >
          <span className={cn("size-2 rounded-full", isAvailable === false ? "bg-red-500" : crowdConfig.dot)} />
          {isAvailable === false ? "Unavailable" : crowdConfig.label}
        </div>

        {/* Custom Direction Button */}
        {isAvailable !== false ? (
          <button
            onClick={handleViewDirections}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-left text-xs font-extrabold tracking-wider uppercase transition-all",
              isSelected
                ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                : "bg-blue-500/5 text-blue-400 hover:bg-blue-500/10"
            )}
          >
            <ArrowUpRight className="size-4 stroke-[2.5]" />
            View Directions
          </button>
        ) : (
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-extrabold tracking-wider uppercase text-red-500 bg-red-500/5 dark:text-red-400 dark:bg-red-500/10">
            No Live Bus
          </span>
        )}
      </div>

      {/* Additional Alert Details Banner */}
      {additionalInfo && (
        <div className={cn(
          "flex animate-in items-center gap-2 border-t border-dashed border-border pt-3 pl-1 duration-200 fade-in slide-in-from-top-1",
          isAvailable === false ? "text-red-500 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
        )}>
          <Info className="size-4 shrink-0 stroke-[2.5]" />
          <p className="text-xs font-bold tracking-wide">{additionalInfo}</p>
        </div>
      )}
    </div>
  )
}
