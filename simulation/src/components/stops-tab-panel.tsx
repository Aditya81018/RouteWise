import { type RefObject } from "react"
import { Search, MapPinned, Layers } from "lucide-react"
import coordsData from "@/assets/coords.json"

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
}: StopsTabPanelProps) {
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
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm text-slate-700 transition-all focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
        </div>

        {/* Autocomplete Dropdown */}
        {isDropdownOpen && filteredStops.length > 0 && (
          <div className="absolute top-[68px] right-0 left-0 z-[9999] max-h-60 overflow-hidden overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {filteredStops.map((stopName) => {
              const hasCoords =
                coordsData[stopName as keyof typeof coordsData] !== null
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

      {/* SECTION 2: Filters */}
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
