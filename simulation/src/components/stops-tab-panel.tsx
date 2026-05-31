import { type RefObject, useState, useMemo } from "react"
import { Search, MapPinned, Layers, X, Bus, Plus, ExternalLink, Zap } from "lucide-react"
import coordsData from "@/assets/coords.json"
import stopBusesData from "@/assets/stop-buses.json"
import busDataRaw from "@/assets/busdata.json"
import { 
  getRandomColor, 
  getRandomCrowdStatus, 
  getRandomReliability 
} from "@/lib/utils"
import { type LiveBus } from "./live-bus-tab-panel"

interface BusRoute {
  code: string
  kind: string
  stops: string[]
}

interface BusData {
  routes: BusRoute[]
}

interface StopsTabPanelProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  isDropdownOpen: boolean
  setIsDropdownOpen: (open: boolean) => void
  filteredStops: string[]
  handleNavigateToStop: (stopName: string) => void
  dropdownRef: RefObject<HTMLDivElement | null>
  showStops: boolean
  setShowStops: (show: boolean) => void
  isBusSelected: boolean
  onSpawnBus: (bus: LiveBus) => void
  onPreSelectBus: (routeCode: string, stopName: string) => void
}

export function StopsTabPanel({
  searchQuery,
  setSearchQuery,
  isDropdownOpen,
  setIsDropdownOpen,
  filteredStops,
  handleNavigateToStop,
  dropdownRef,
  showStops,
  setShowStops,
  isBusSelected,
  onSpawnBus,
  onPreSelectBus,
}: StopsTabPanelProps) {
  const [multiplier, setMultiplier] = useState(1)

  const stopBuses = useMemo(() => {
    if (!searchQuery) return []
    const buses = (stopBusesData as Record<string, string[]>)[searchQuery] || []
    // Filter duplicates
    return Array.from(new Set(buses))
  }, [searchQuery])

  const performSpawn = (routeCode: string, index: number) => {
    const routes = (busDataRaw as unknown as BusData).routes || []
    const route = routes.find((r) => r.code === routeCode)
    if (!route || !route.stops || route.stops.length === 0) return

    // Pick a random stop from the route that has valid coordinates
    const validStops = route.stops.filter((s: string) => (coordsData as Record<string, [number, number] | null>)[s] !== null)
    const randomStop = validStops.length > 0 
      ? validStops[Math.floor(Math.random() * validStops.length)]
      : route.stops[0]

    onSpawnBus({
      id: `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
      routeCode: routeCode,
      currentStop: randomStop,
      direction: "Towards Destination",
      color: getRandomColor(),
      crowdStatus: getRandomCrowdStatus(),
      reliability: getRandomReliability(),
    })
  }

  const handleSpawnRandom = (routeCode: string) => {
    for (let i = 0; i < multiplier; i++) {
      performSpawn(routeCode, i)
    }
  }

  const handleSpawnAllRandom = () => {
    if (stopBuses.length === 0) return
    for (let i = 0; i < multiplier; i++) {
      const randomRoute = stopBuses[Math.floor(Math.random() * stopBuses.length)]
      performSpawn(randomRoute, i)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* SECTION 1: Transit Search Engine */}
      <div className="relative flex flex-col gap-2" ref={dropdownRef}>
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <MapPinned className="h-4 w-4 text-slate-500" />
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Find Bus Stop
          </h2>
        </div>

        <div className="relative mt-1">
          <input
            type="text"
            placeholder="Search e.g., Biswa Bangla Gate..."
            value={searchQuery}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsDropdownOpen(true)
            }}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-10 pl-9 text-sm text-slate-700 transition-all focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("")
                setIsDropdownOpen(false)
              }}
              className="absolute top-2.5 right-3 text-slate-400 transition-colors hover:text-slate-600"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isDropdownOpen && filteredStops.length > 0 && (
          <div className="absolute top-[68px] right-0 left-0 z-[9999] max-h-60 overflow-hidden overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {filteredStops.map((stopName) => {
              const hasCoords =
                (coordsData as Record<string, [number, number] | null>)[stopName] !== null
              return (
                <button
                  key={stopName}
                  onClick={() => handleNavigateToStop(stopName)}
                  className="group flex w-full items-center justify-between border-b border-slate-50 px-3 py-2 text-left text-sm transition-colors last:border-0 hover:bg-slate-50"
                >
                  <span className="truncate text-slate-700 group-hover:text-emerald-600">
                    {stopName}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${hasCoords ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                  >
                    {hasCoords ? "Mapped" : "No GPS"}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Stop Details & Buses */}
      {searchQuery && (coordsData as Record<string, [number, number] | null>)[searchQuery] && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Bus className="h-4 w-4 text-emerald-600" />
              <h3 className="text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                Buses at this stop ({stopBuses.length})
              </h3>
            </div>
          </div>

          <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto pr-1">
            {stopBuses.length > 0 ? (
              stopBuses.map((routeCode) => (
                <div key={routeCode} className="group flex items-center justify-between rounded-md border border-slate-100 bg-white p-2 shadow-xs transition-colors hover:border-emerald-200">
                  <span className="text-xs font-bold text-slate-700">Route {routeCode}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSpawnRandom(routeCode)}
                      className="rounded bg-emerald-50 p-1.5 text-emerald-600 transition-colors hover:bg-emerald-100"
                      title="Quick spawn (random position)"
                    >
                      <Zap className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onPreSelectBus(routeCode, searchQuery)}
                      className="rounded bg-slate-50 p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      title="Manual spawn at this stop"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-[10px] text-slate-400 italic">No routes recorded for this stop.</p>
            )}
          </div>

          {stopBuses.length > 0 && (
            <div className="flex items-center gap-2 border-t border-slate-100 pt-2 mt-1">
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={multiplier}
                  onChange={(e) => setMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 rounded border border-slate-200 bg-white py-1 px-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                  title="Multiplier"
                />
                <button
                  onClick={handleSpawnAllRandom}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded bg-emerald-600 py-1.5 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
                >
                  <Plus className="h-3 w-3" />
                  Spawn Random Fleet
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Layers className="h-4 w-4 text-slate-500" />
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Map Settings
          </h2>
        </div>

        <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-2.5 transition-colors select-none hover:bg-slate-50">
          <input
            type="checkbox"
            checked={showStops}
            onChange={(e) => setShowStops(e.target.checked)}
            disabled={isBusSelected}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
          />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-700">
              Display All Network Stops
            </span>
            <span className="text-[10px] text-slate-400">
              {isBusSelected
                ? "Disabled while inspecting a route"
                : "Toggles active nodes layer indicators"}
            </span>
          </div>
        </label>
      </div>
    </div>
  )
}
