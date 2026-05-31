import { useState, useMemo, useRef, useEffect } from "react"
import {
  Plus,
  Trash2,
  Radio,
  Bus,
  MapPin,
  Compass,
  ArrowRight,
  Users,
  Activity,
  Filter,
  Search,
} from "lucide-react"
import busDataRaw from "@/assets/busdata.json"
import {
  cn,
  getRandomColor,
  getRandomCrowdStatus,
  getRandomReliability,
} from "@/lib/utils"

export interface LiveBus {
  id: string
  routeCode: string
  currentStop: string
  direction: string
  color: string
  crowdStatus: "LOW" | "MEDIUM" | "HIGH"
  reliability: number
}

interface BusRoute {
  code: string
  kind: string
  stops: string[]
}

interface LiveBusTabPanelProps {
  liveBuses: LiveBus[]
  onSpawnBus: (bus: LiveBus) => void
  onRemoveBus: (id: string) => void
  onRemoveAllBuses: () => void
  onSelectBus: (bus: LiveBus | null) => void
  selectedBusId?: string | null
  preSelectedBus?: { routeCode: string; stopName: string } | null
  onClearPreSelected?: () => void
}

export function LiveBusTabPanel({
  liveBuses,
  onSpawnBus,
  onRemoveBus,
  onRemoveAllBuses,
  onSelectBus,
  selectedBusId,
  preSelectedBus,
  onClearPreSelected,
}: LiveBusTabPanelProps) {
  // Form State
  const [routeQuery, setRouteQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null)

  const [selectedStop, setSelectedStop] = useState("")
  const [selectedDirection, setSelectedDirection] = useState("")
  const [selectedColor, setSelectedColor] = useState(getRandomColor())
  const [crowdStatus, setCrowdStatus] = useState<"LOW" | "MEDIUM" | "HIGH">(getRandomCrowdStatus())
  const [reliability, setReliability] = useState(getRandomReliability())

  // Fleet Filter State
  const [fleetFilterQuery, setFleetFilterQuery] = useState("")
  const [fleetCrowdFilter, setFleetCrowdFilter] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH">("ALL")

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Pre-selection effect
  useEffect(() => {
    if (preSelectedBus) {
      const routes = (
        Array.isArray(busDataRaw) ? busDataRaw : busDataRaw.routes || []
      ) as BusRoute[]
      const route = routes.find((r) => r.code === preSelectedBus.routeCode)

      if (route) {
        setSelectedRoute(route)
        setRouteQuery(route.code)
        setSelectedStop(preSelectedBus.stopName)
        setSelectedDirection(`Towards ${route.stops[route.stops.length - 1]}`)
      }
      onClearPreSelected?.()
    }
  }, [preSelectedBus, onClearPreSelected])

  // Filter routes for the autocomplete
  const filteredRoutes = useMemo(() => {
    const routes = (
      Array.isArray(busDataRaw) ? busDataRaw : busDataRaw.routes || []
    ) as BusRoute[]
    if (!routeQuery.trim()) return routes.slice(0, 5)
    return routes
      .filter((r) => r.code.toLowerCase().includes(routeQuery.toLowerCase()))
      .slice(0, 5)
  }, [routeQuery])

  // Computed Filtered Fleet
  const filteredFleet = useMemo(() => {
    return liveBuses.filter((bus) => {
      const matchesQuery = 
        !fleetFilterQuery || 
        bus.routeCode.toLowerCase().includes(fleetFilterQuery.toLowerCase()) ||
        bus.currentStop.toLowerCase().includes(fleetFilterQuery.toLowerCase()) ||
        bus.direction.toLowerCase().includes(fleetFilterQuery.toLowerCase())
      
      const matchesCrowd = fleetCrowdFilter === "ALL" || bus.crowdStatus === fleetCrowdFilter

      return matchesQuery && matchesCrowd
    })
  }, [liveBuses, fleetFilterQuery, fleetCrowdFilter])

  // Handle outside clicks for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelectRoute = (route: BusRoute) => {
    setSelectedRoute(route)
    setRouteQuery(route.code)
    setIsDropdownOpen(false)

    // Set defaults when route is picked
    if (route.stops && route.stops.length > 0) {
      setSelectedStop(route.stops[0])
      setSelectedDirection(`Towards ${route.stops[route.stops.length - 1]}`)
    }
  }

  const handleSpawn = () => {
    if (!selectedRoute || !selectedStop || !selectedDirection) return

    onSpawnBus({
      id: `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      routeCode: selectedRoute.code,
      currentStop: selectedStop,
      direction: selectedDirection,
      color: selectedColor,
      crowdStatus: crowdStatus,
      reliability: reliability,
    })

    // Reset form
    setSelectedRoute(null)
    setRouteQuery("")
    setSelectedStop("")
    setSelectedDirection("")
    setSelectedColor(getRandomColor())
    setCrowdStatus(getRandomCrowdStatus())
    setReliability(getRandomReliability())
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* SPAWN FORM */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Radio className="h-4 w-4 animate-pulse text-emerald-500" />
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Spawn Live Bus
          </h2>
        </div>

        {/* Route Selector */}
        <div className="relative flex flex-col gap-1" ref={dropdownRef}>
          <label className="text-[10px] font-medium text-slate-500 uppercase">
            Bus Route
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search route (e.g., 1A)..."
              value={routeQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setRouteQuery(e.target.value)
                setIsDropdownOpen(true)
                if (selectedRoute) setSelectedRoute(null)
              }}
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-2 pl-8 text-sm text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
            <Bus className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>

          {isDropdownOpen && filteredRoutes.length > 0 && (
            <div className="absolute top-[48px] z-[9999] max-h-52 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl">
              {filteredRoutes.map((route, i) => {
                const origin =
                  route.stops?.length > 0 ? route.stops[0] : "Unknown"
                const destination =
                  route.stops?.length > 1
                    ? route.stops[route.stops.length - 1]
                    : "Unknown"

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectRoute(route)}
                    className="group flex w-full flex-col gap-1 border-b border-slate-50 px-3 py-2 text-left transition-colors last:border-0 hover:bg-slate-50"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-600">
                        Route {route.code}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400 capitalize">
                        {route.kind}
                      </span>
                    </div>
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

        {/* Dependent Selectors (Only show if a route is selected) */}
        {selectedRoute && (
          <div className="flex animate-in flex-col gap-3 duration-200 fade-in slide-in-from-top-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-slate-500 uppercase">
                Current Stop
              </label>
              <div className="relative">
                <select
                  value={selectedStop}
                  onChange={(e) => setSelectedStop(e.target.value)}
                  className="w-full appearance-none rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-8 pl-8 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  {selectedRoute.stops.map((stop, i) => (
                    <option key={i} value={stop}>
                      {stop}
                    </option>
                  ))}
                </select>
                <MapPin className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-slate-500 uppercase">
                Direction
              </label>
              <div className="relative">
                <select
                  value={selectedDirection}
                  onChange={(e) => setSelectedDirection(e.target.value)}
                  className="w-full appearance-none rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-8 pl-8 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option
                    value={`Towards ${selectedRoute.stops[selectedRoute.stops.length - 1]}`}
                  >
                    Towards{" "}
                    {selectedRoute.stops[selectedRoute.stops.length - 1]}
                  </option>
                  <option value={`Towards ${selectedRoute.stops[0]}`}>
                    Towards {selectedRoute.stops[0]}
                  </option>
                </select>
                <Compass className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-slate-500 uppercase">
                  Crowd Status
                </label>
                <div className="relative">
                  <select
                    value={crowdStatus}
                    onChange={(e) => setCrowdStatus(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
                    className="w-full appearance-none rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-8 pl-8 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                  <Users className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-slate-500 uppercase">
                  Reliability
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={reliability}
                    onChange={(e) => setReliability(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-2 pl-8 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                  />
                  <Activity className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
                  <span className="absolute top-2 right-2 text-[10px] font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-slate-500 uppercase">
                Bus Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="flex-1 rounded-md border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSpawn}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Spawn Bus
            </button>
          </div>
        )}
      </div>

      {/* ACTIVE SPAWNED BUSES LIST */}
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Active Fleet ({filteredFleet.length}/{liveBuses.length})
            </h3>
            {liveBuses.length > 0 && (
              <button
                onClick={onRemoveAllBuses}
                className="text-[9px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase"
              >
                Clear All
              </button>
            )}
          </div>
          <Filter className="h-3 w-3 text-slate-300" />
        </div>

        {/* Fleet Filters */}
        <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by route, stop, direction..."
              value={fleetFilterQuery}
              onChange={(e) => setFleetFilterQuery(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white py-1.5 pr-2 pl-7 text-[11px] text-slate-700 focus:border-emerald-500 focus:outline-none"
            />
            <Search className="absolute top-2 left-2 h-3 w-3 text-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-medium text-slate-400 uppercase whitespace-nowrap">Crowd:</label>
            <div className="flex flex-1 items-center gap-1">
              {(["ALL", "LOW", "MEDIUM", "HIGH"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFleetCrowdFilter(s)}
                  className={cn(
                    "flex-1 rounded py-0.5 text-[9px] font-bold transition-all",
                    fleetCrowdFilter === s
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-white text-slate-400 border border-slate-100 hover:border-slate-200"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {filteredFleet.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <p className="text-xs text-slate-400">
                {liveBuses.length === 0 ? "No buses spawned yet." : "No matching buses found."}
              </p>
            </div>
          ) : (
            filteredFleet.map((bus, i) => (
              <div
                key={i}
                onClick={() => onSelectBus(selectedBusId === bus.id ? null : bus)}
                className={cn(
                  "flex cursor-pointer flex-col rounded-lg border p-2.5 shadow-sm transition-all",
                  selectedBusId === bus.id
                    ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                    : "border-slate-100 bg-white hover:border-slate-200"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm"
                      style={{ backgroundColor: bus.color }}
                    >
                      <Bus className="h-3 w-3" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">
                        {bus.routeCode}
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveBus(bus.id)
                    }}
                    className="text-slate-400 transition-colors hover:text-red-500"
                    title="Remove Bus"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2 ml-8 flex flex-col gap-1.5">
                  <div className="flex flex-col gap-0.5 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <strong>At:</strong> {bus.currentStop}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Compass className="h-3 w-3 text-slate-300" />
                      {bus.direction}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      bus.crowdStatus === "LOW" ? "bg-emerald-100 text-emerald-700" :
                      bus.crowdStatus === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                      "bg-rose-100 text-rose-700"
                    )}>
                      <Users className="h-2.5 w-2.5" />
                      {bus.crowdStatus}
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 uppercase">
                      <Activity className="h-2.5 w-2.5" />
                      {bus.reliability}% RELIABLE
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
