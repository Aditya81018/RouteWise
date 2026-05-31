import { type RefObject } from "react"
import { Bus as BusIcon, Navigation, Radio } from "lucide-react"
import { BusTabPanel } from "./bus-tab-panel"
import { StopsTabPanel } from "./stops-tab-panel"
import { LiveBusTabPanel, type LiveBus } from "./live-bus-tab-panel"

type TabType = "buses" | "stops" | "live"

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

  // Buses
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

  // Stops
  searchQuery: string
  setSearchQuery: (query: string) => void
  isDropdownOpen: boolean
  setIsDropdownOpen: (open: boolean) => void
  filteredStops: string[]
  handleNavigateToStop: (stopName: string) => void
  dropdownRef: RefObject<HTMLDivElement | null>

  // Live Buses
  liveBuses: LiveBus[]
  handleSpawnBus: (bus: LiveBus) => void
  handleRemoveLiveBus: (id: string) => void
  handleRemoveAllLiveBuses: () => void
  onSelectLiveBus: (bus: LiveBus | null) => void
  selectedLiveBusId: string | null
  preSelectedBus: { routeCode: string; stopName: string } | null
  setPreSelectedBus: (val: { routeCode: string; stopName: string } | null) => void

  // Toggles
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
  liveBuses,
  handleSpawnBus,
  handleRemoveLiveBus,
  handleRemoveAllLiveBuses,
  onSelectLiveBus,
  selectedLiveBusId,
  preSelectedBus,
  setPreSelectedBus,
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
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-all ${
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
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-all ${
            activeTab === "stops"
              ? "border border-slate-200/40 bg-white text-slate-900 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Navigation className="h-3.5 w-3.5" />
          Stops
        </button>
        <button
          onClick={() => setActiveTab("live")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-all ${
            activeTab === "live"
              ? "border border-slate-200/40 bg-white text-emerald-600 shadow-xs"
              : "text-slate-500 hover:text-emerald-600"
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          Live
        </button>
      </div>

      {/* CORE CONTENT LAYERS */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {activeTab === "buses" && (
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
            onPreSelectBus={(routeCode, stopName) => {
              setPreSelectedBus({ routeCode, stopName })
              setActiveTab("live")
            }}
          />
        )}
        {activeTab === "stops" && (
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
            onSpawnBus={handleSpawnBus}
            onPreSelectBus={(routeCode, stopName) => {
              setPreSelectedBus({ routeCode, stopName })
              setActiveTab("live")
            }}
          />
        )}
        {activeTab === "live" && (
          <LiveBusTabPanel
            liveBuses={liveBuses}
            onSpawnBus={handleSpawnBus}
            onRemoveBus={handleRemoveLiveBus}
            onRemoveAllBuses={handleRemoveAllLiveBuses}
            onSelectBus={onSelectLiveBus}
            selectedBusId={selectedLiveBusId}
            preSelectedBus={preSelectedBus}
            onClearPreSelected={() => setPreSelectedBus(null)}
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
