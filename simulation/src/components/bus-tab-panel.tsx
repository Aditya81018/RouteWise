import { type RefObject } from "react"
import { Search, Bus as BusIcon, Compass, Info, ArrowRight } from "lucide-react"
import coordsData from "@/assets/coords.json"

interface BusRoute {
  code: string
  kind: string
  stops: string[]
  scope: string
  towards?: string
  directional?: boolean
}

interface BusTabPanelProps {
  busSearchQuery: string
  setBusSearchQuery: (query: string) => void
  isBusDropdownOpen: boolean
  setIsBusDropdownOpen: (open: boolean) => void
  filteredBuses: BusRoute[]
  selectedBus: BusRoute | null
  setSelectedBus: (bus: BusRoute | null) => void
  setOsrmRoutePoints: (points: [number, number][]) => void
  handleSelectBus: (bus: BusRoute) => void
  busDropdownRef: RefObject<HTMLDivElement | null>
}

export function BusTabPanel({
  busSearchQuery,
  setBusSearchQuery,
  isBusDropdownOpen,
  setIsBusDropdownOpen,
  filteredBuses,
  selectedBus,
  setSelectedBus,
  setOsrmRoutePoints,
  handleSelectBus,
  busDropdownRef,
}: BusTabPanelProps) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="relative flex flex-col gap-2" ref={busDropdownRef}>
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <BusIcon className="h-4 w-4 text-slate-500" />
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Search Bus Routes
          </h2>
        </div>

        <div className="relative mt-1">
          <input
            type="text"
            placeholder="Enter bus code (e.g., 1A, 202)..."
            value={busSearchQuery}
            onFocus={() => setIsBusDropdownOpen(true)}
            onChange={(e) => {
              setBusSearchQuery(e.target.value)
              setIsBusDropdownOpen(true)
            }}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm text-slate-700 transition-all focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          {selectedBus && (
            <button
              onClick={() => {
                setSelectedBus(null)
                setBusSearchQuery("")
                setOsrmRoutePoints([])
              }}
              className="absolute top-2.5 right-3 text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Bus Autocomplete Dropdown */}
        {isBusDropdownOpen && filteredBuses.length > 0 && (
          <div className="absolute top-[68px] right-0 left-0 z-[9999] max-h-60 overflow-hidden overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {filteredBuses.map((bus, i) => {
              // Extract origin and destination to display in the dropdown
              const origin = bus.stops.length > 0 ? bus.stops[0] : "Unknown"
              const destination =
                bus.stops.length > 1
                  ? bus.stops[bus.stops.length - 1]
                  : "Unknown"

              return (
                <button
                  key={i}
                  onClick={() => handleSelectBus(bus)}
                  className="group flex w-full flex-col gap-1 border-b border-slate-50 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-slate-50"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-600">
                      Route {bus.code}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400 capitalize">
                      {bus.kind}
                    </span>
                  </div>

                  {/* Origin -> Destination Subtitle */}
                  <div className="flex w-full items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="truncate">{origin}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />
                    <span className="truncate font-medium text-slate-600">
                      {destination}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* DYNAMIC SELECTED BUS METRICS PANEL INFORMATION DISPLAY */}
      {selectedBus ? (
        <div className="flex animate-in flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 shadow-2xs duration-200 fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-sm font-bold text-slate-800">
              Route details ({selectedBus.code})
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${selectedBus.kind === "government" ? "bg-purple-50 text-purple-600" : "bg-amber-50 text-amber-600"}`}
            >
              {selectedBus.kind}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col rounded-lg border border-slate-100 bg-white p-2">
              <span className="text-[10px] tracking-wide text-slate-400 uppercase">
                Network Scope
              </span>
              <span className="mt-0.5 font-medium text-slate-700 capitalize">
                {selectedBus.scope}
              </span>
            </div>
            <div className="flex flex-col rounded-lg border border-slate-100 bg-white p-2">
              <span className="text-[10px] tracking-wide text-slate-400 uppercase">
                Total Stops
              </span>
              <span className="mt-0.5 font-medium text-slate-700">
                {selectedBus.stops.length} stations
              </span>
            </div>
          </div>

          {selectedBus.towards && (
            <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-white p-2 text-xs">
              <Compass className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] tracking-wide text-slate-400 uppercase">
                  Heading Towards
                </p>
                <p className="mt-0.5 font-semibold text-slate-700">
                  {selectedBus.towards}
                </p>
              </div>
            </div>
          )}

          {/* Sequential Terminal Node Trail */}
          <div className="mt-1 flex flex-col gap-2">
            <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
              Path Schedule Sequence
            </span>
            <div className="flex max-h-44 flex-col gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-white p-2 pr-1 text-xs">
              {selectedBus.stops.map((stop, i) => {
                const hasCoords =
                  coordsData[stop as keyof typeof coordsData] !== null
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between border-l-2 border-slate-100 py-0.5 pl-1 text-slate-600 hover:border-emerald-500"
                  >
                    <span className="truncate pr-2 font-medium">
                      {i + 1}. {stop}
                    </span>
                    <span
                      className={`shrink-0 text-[9px] font-medium ${hasCoords ? "text-emerald-600" : "text-slate-300"}`}
                    >
                      {hasCoords ? "• Marked" : "• Not marked"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Fallback frame before selection trigger clicks occur */
        <div className="mt-2 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-6 text-center">
          <Info className="mb-1 h-5 w-5 text-slate-300" />
          <p className="text-xs text-slate-400">
            Select a bus route profile to view network schedules and display
            customized path nodes.
          </p>
        </div>
      )}
    </div>
  )
}
