import * as React from "react"
import { Navigation, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router"
import { LocationInput } from "@/components/ui/location-input"
import STOPS from "@/assets/stops.json"

export default function RoutePlannerCard() {
  const navigate = useNavigate()

  // Initialize state from localStorage if available, otherwise fall back to defaults
  const [fromLocation, setFromLocation] = React.useState<string>(() => {
    return localStorage.getItem("rw_last_from") || "Maniktala"
  })

  const [toLocation, setToLocation] = React.useState<string>(() => {
    return localStorage.getItem("rw_last_to") || "Biswa Bangla Gate"
  })

  const handleSearch = () => {
    console.log("Searching routes:", {
      fromLocation,
      toLocation,
    })

    // Persist the selected locations to localStorage before navigating
    localStorage.setItem("rw_last_from", fromLocation)
    localStorage.setItem("rw_last_to", toLocation)

    navigate("/routes", {
      state: {
        from: fromLocation,
        to: toLocation,
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-4xl border border-border bg-card p-4 shadow-xl shadow-black/5 sm:max-w-md sm:p-6 dark:shadow-black/40">
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* Timeline Grouping Container */}
        <div className="relative flex flex-col gap-5 sm:gap-6">
          {/* Continuous Dotted Connecting Route Line */}
          <div className="pointer-events-none absolute top-3 bottom-3 left-2.25 w-[1.5px] bg-blue-100/30 dark:bg-blue-900/30">
            <div className="absolute top-0 right-0 bottom-0 left-0 border-l border-dashed border-blue-400 dark:border-blue-500/60" />
          </div>

          {/* --- FROM SECTION --- */}
          <div className="relative flex flex-col gap-1.5 pt-1.5 pl-7">
            <div className="absolute top-0.75 left-0 flex size-5 items-center justify-center rounded-full border-2 border-blue-500 bg-card">
              <div className="size-1.5 rounded-full bg-card" />
            </div>

            <label className="text-xs font-bold tracking-wider text-muted-foreground/80 uppercase">
              From
            </label>

            <LocationInput
              value={fromLocation}
              onChange={setFromLocation}
              options={STOPS}
              placeholder="Enter starting point"
              icon={
                <Navigation className="shrink-0 rotate-45 fill-blue-600/10 text-blue-600 dark:fill-blue-400/10 dark:text-blue-400" />
              }
            />
          </div>

          {/* --- TO SECTION --- */}
          <div className="relative flex flex-col gap-1.5 pt-1.5 pl-7">
            <div className="absolute top-0.75 left-0 flex size-5 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/50">
              <div className="size-2 rounded-full bg-blue-600 dark:bg-blue-500" />
            </div>

            <label className="text-xs font-bold tracking-wider text-muted-foreground/80 uppercase">
              To
            </label>

            <LocationInput
              value={toLocation}
              onChange={setToLocation}
              options={STOPS}
              placeholder="Enter destination"
              icon={
                <MapPin className="shrink-0 fill-red-500/20 text-red-500 dark:fill-red-400/10 dark:text-red-400" />
              }
            />
          </div>
        </div>

        {/* --- ACTIONS FOOTER --- */}
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <Button
            onClick={handleSearch}
            disabled={!fromLocation || !toLocation}
            className="flex-1 sm:max-w-50"
          >
            Find Best Routes
          </Button>
        </div>
      </div>
    </div>
  )
}
