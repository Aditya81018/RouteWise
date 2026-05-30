import * as React from "react"
import { Navigation, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router"
// import { TimePicker } from "@/components/ui/time-picker"

export default function RoutePlannerCard() {
  const navigate = useNavigate()

  const [fromLocation, setFromLocation] = React.useState("Your Location")
  const [toLocation, setToLocation] = React.useState(
    "Sister Nivedita University"
  )
  // const [departureTime, setDepartureTime] = React.useState("08:30")

  const handleSearch = () => {
    console.log("Searching routes:", {
      fromLocation,
      toLocation,
      // departureTime,
    })

    navigate("/routes", {
      state: {
        from: fromLocation,
        to: toLocation,
        // departureTime,
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-4xl border border-border bg-card p-4 shadow-xl shadow-black/5 sm:max-w-md sm:p-6 dark:shadow-black/40">
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* Isolated Segment: Grouping From & To together keeps the timeline line perfectly bound */}
        <div className="relative flex flex-col gap-5 sm:gap-6">
          {/* FIXED BLUE LINE: 
            top starts exactly halfway down the first node icon (12px), 
            bottom stops exactly halfway down the last node icon (12px)
          */}
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

            <Input
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              icon={
                <Navigation className="shrink-0 rotate-45 fill-blue-600/10 text-blue-600 dark:fill-blue-400/10 dark:text-blue-400" />
              }
              placeholder="Enter starting point"
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

            <Input
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              icon={
                <MapPin className="shrink-0 fill-red-500/20 text-red-500 dark:fill-red-400/10 dark:text-red-400" />
              }
              placeholder="Enter destination"
            />
          </div>
        </div>

        {/* --- ACTIONS FOOTER --- */}
        {/* Placed outside the timeline wrapper div, so it will never interfere with the vertical line tracking length */}
        <div className="mt-1.5 flex items-center justify-between gap-3">
          {/* <TimePicker
            value={departureTime}
            onChange={setDepartureTime}
            className="justify-center shadow-sm"
          /> */}

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
