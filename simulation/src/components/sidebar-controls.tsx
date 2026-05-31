import { type RefObject } from "react"
import { Bus as BusIcon, Navigation } from "lucide-react"
import { BusTabPanel } from "./bus-tab-panel"
import { StopsTabPanel } from "./stops-tab-panel"

type TabType = "buses" | "stops"

interface BusRoute {
  code: string
  kind: string
  stops: string[]
  scope: string
  towards?: string
  directional?: boolean
}

interface SidebarControlsProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void

  // Buses State & Handlers
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

  // Stops State & Handlers
  searchQuery: string
  setSearchQuery: (query: string) => void
  isDropdownOpen: boolean
  setIsDropdownOpen: (open: boolean) => void
  filteredStops: string[]
  handleNavigateToStop: (stopName: string) => void
  dropdownRef: RefObject<HTMLDivElement | null>

  // Map Layer Toggles
  showStops: boolean
  setShowStops: (show: boolean) => void
  visibleMarkersCount: number
}

export function SidebarControls({
  activeTab,
  setActiveTab,
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
  searchQuery,
  setSearchQuery,
  isDropdownOpen,
  setIsDropdownOpen,
  filteredStops,
  handleNavigateToStop,
  dropdownRef,
  showStops,
  setShowStops,
  visibleMarkersCount,
}: SidebarControlsProps) {
  return (
    <div className="flex h-full w-80 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* TAB TOGGLES HEADER */}
      <div className="flex rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab("buses")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${
            activeTab === "buses"
              ? "border border-slate-200/40 bg-white text-slate-900 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <BusIcon className="h-3.5 w-3.5" />
          Buses
        </button>
        <button
          onClick={() => setActiveTab("stops")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${
            activeTab === "stops"
              ? "border border-slate-200/40 bg-white text-slate-900 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Navigation className="h-3.5 w-3.5" />
          Stops
        </button>
      </div>

      {/* CORE CONTENT LAYERS */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {activeTab === "buses" ? (
          <BusTabPanel
            busSearchQuery={busSearchQuery}
            setBusSearchQuery={setBusSearchQuery}
            isBusDropdownOpen={isBusDropdownOpen}
            setIsBusDropdownOpen={setIsBusDropdownOpen}
            filteredBuses={filteredBuses}
            selectedBus={selectedBus}
            setSelectedBus={setSelectedBus}
            setOsrmRoutePoints={setOsrmRoutePoints}
            handleSelectBus={handleSelectBus}
            busDropdownRef={busDropdownRef}
          />
        ) : (
          <StopsTabPanel
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            filteredStops={filteredStops}
            handleNavigateToStop={handleNavigateToStop}
            dropdownRef={dropdownRef}
            showStops={showStops}
            setShowStops={setShowStops}
            isBusSelected={!!selectedBus}
          />
        )}
      </div>

      {/* Footer Metrics */}
      <div className="mt-auto flex justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
        <span>Map Rendering Layer:</span>
        <span>{visibleMarkersCount} marks rendering</span>
      </div>
    </div>
  )
}
