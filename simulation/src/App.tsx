import { useEffect, useState, useMemo, useRef } from "react"
import Map, { type MapDataPoint } from "@/components/map"
import { SidebarControls } from "@/components/sidebar-controls" // Import your isolated component
import { MapPin, Circle, AlertCircle, Crosshair } from "lucide-react"
import coordsData from "@/assets/coords.json"
import stopsData from "@/assets/stops.json"
import busDataRaw from "@/assets/busdata.json"

type TabType = "buses" | "stops"

interface BusRoute {
  code: string
  kind: string
  stops: string[]
  scope: string
  towards?: string
  directional?: boolean
}

interface MapPath {
  id: string | number
  points: [number, number][]
  color?: string
  width?: number
  opacity?: number
  useOSRM?: boolean
}

export default function App() {
  const [mapMarkers, setMapMarkers] = useState<MapDataPoint[]>([])
  const [showStops, setShowStops] = useState<boolean>(true)
  const [userLocation, setUserLocation] = useState<[number, number]>([
    88.3639, 22.5726,
  ])
  const [rawUserLocation, setRawUserLocation] = useState<
    [number, number] | null
  >(null)
  const [loading, setLoading] = useState(true)

  // Sidebar Tabs
  const [activeTab, setActiveTab] = useState<TabType>("stops")

  // Search States (Stops)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Search States (Buses)
  const [busSearchQuery, setBusSearchQuery] = useState<string>("")
  const [isBusDropdownOpen, setIsBusDropdownOpen] = useState<boolean>(false)
  const [selectedBus, setSelectedBus] = useState<BusRoute | null>(null)
  const busDropdownRef = useRef<HTMLDivElement>(null)

  // Dynamic OSRM Route state management layer
  const [osrmRoutePoints, setOsrmRoutePoints] = useState<[number, number][]>([])
  const [isRouting, setIsRouting] = useState<boolean>(false)

  useEffect(() => {
    const processedPoints: MapDataPoint[] = Object.entries(coordsData).map(
      ([name, coordinates]) => ({
        id: name,
        coordinates: coordinates as [number, number] | null,
        element: (
          <div className="group relative flex flex-col items-center">
            <div className="absolute bottom-6 z-50 hidden rounded bg-slate-950 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
              {name}
            </div>
            <MapPin className="h-4 w-4 cursor-pointer fill-emerald-100 text-emerald-600 transition-transform group-hover:scale-120" />
          </div>
        ),
      })
    )

    setMapMarkers(processedPoints)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords
          setUserLocation([longitude, latitude])
          setRawUserLocation([longitude, latitude])

          setMapMarkers((prev) => [
            ...prev,
            {
              id: "current-user-identity-pin",
              coordinates: [latitude, longitude],
              element: (
                <div className="group relative flex flex-col items-center">
                  <div className="absolute bottom-6 z-50 hidden rounded bg-slate-950 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
                    You
                  </div>
                  <Circle className="h-4 w-4 cursor-pointer fill-blue-100 text-blue-600 transition-transform group-hover:scale-120" />
                </div>
              ),
            },
          ])
          setLoading(false)
        },
        () => setLoading(false)
      )
    } else {
      setLoading(false)
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
      if (
        busDropdownRef.current &&
        !busDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBusDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredBuses = useMemo(() => {
    const routes = (busDataRaw.routes || []) as BusRoute[]
    if (!busSearchQuery.trim()) return routes.slice(0, 5)
    const query = busSearchQuery.toLowerCase()
    return routes.filter((r) => r.code.toLowerCase().includes(query))
  }, [busSearchQuery])

  const filteredStops = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return stopsData
      .filter((stopName) => stopName.toLowerCase().includes(query))
      .slice(0, 6)
  }, [searchQuery])

  const fetchOSRMRoute = async (bus: BusRoute) => {
    setIsRouting(true)
    setErrorMessage(null)

    const stopCoordinates = bus.stops
      .map(
        (stopName) =>
          (coordsData as unknown as Record<string, [number, number] | null>)[
            stopName
          ]
      )
      .filter((coords): coords is [number, number] => coords !== null)

    if (stopCoordinates.length < 2) {
      setOsrmRoutePoints([])
      setIsRouting(false)
      setErrorMessage(
        `Route ${bus.code} does not have enough geocoded stops to trace a path.`
      )
      return
    }

    try {
      const osrmCoordsString = stopCoordinates
        .map(([lat, lng]) => `${lng},${lat}`)
        .join(";")

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${osrmCoordsString}?geometries=geojson&overview=full`
      )

      if (!response.ok) throw new Error("OSRM routing server failure.")
      const data = await response.json()

      if (data.routes && data.routes.length > 0) {
        const pathGeometry = data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        )
        setOsrmRoutePoints(pathGeometry)
      } else {
        setOsrmRoutePoints([])
        setErrorMessage(
          "Could not calculate a driving path across these route points."
        )
      }
    } catch (err) {
      console.error("OSRM Fetch Error:", err)
      setOsrmRoutePoints(stopCoordinates)
    } finally {
      setIsRouting(false)
    }
  }

  const handleSelectBus = (bus: BusRoute) => {
    setSelectedBus(bus)
    setBusSearchQuery(bus.code)
    setIsBusDropdownOpen(false)

    fetchOSRMRoute(bus)

    const firstStopWithCoords = bus.stops.find(
      (stopName) =>
        (coordsData as unknown as Record<string, [number, number] | null>)[
          stopName
        ] !== null
    )

    if (firstStopWithCoords) {
      const coordinates = (
        coordsData as unknown as Record<string, [number, number] | null>
      )[firstStopWithCoords]
      if (coordinates) {
        setUserLocation([coordinates[1], coordinates[0]])
      }
    }
  }

  const handleNavigateToStop = (stopName: string) => {
    setIsDropdownOpen(false)
    setSearchQuery(stopName)
    setErrorMessage(null)

    const coordinates = (
      coordsData as unknown as Record<string, [number, number] | null>
    )[stopName]

    if (!coordinates) {
      setErrorMessage(
        `"${stopName}" is registered in network profiles but has no physical map coordinates yet.`
      )
      return
    }

    setUserLocation([coordinates[1], coordinates[0]])
    setShowStops(true)
  }

  const handleRecenterToUser = () => {
    if (rawUserLocation) {
      setUserLocation([rawUserLocation[0], rawUserLocation[1]])
    } else {
      setErrorMessage(
        "Unable to fetch current position. Check device location permissions."
      )
    }
  }

  const visiblePaths = useMemo<MapPath[]>(() => {
    if (!selectedBus || osrmRoutePoints.length === 0) return []
    const pathColor = selectedBus.kind === "government" ? "#8b5cf6" : "#f59e0b"
    return [
      {
        id: `line-path-${selectedBus.code}`,
        points: osrmRoutePoints,
        color: pathColor,
        width: 5,
        opacity: 0.85,
      },
    ]
  }, [selectedBus, osrmRoutePoints])

  const visibleMarkers = useMemo(() => {
    const userPin = mapMarkers.find((m) => m.id === "current-user-identity-pin")
    const dynamicMarkers: MapDataPoint[] = userPin ? [userPin] : []

    if (selectedBus) {
      selectedBus.stops.forEach((stopName, index) => {
        const coords = (
          coordsData as unknown as Record<string, [number, number] | null>
        )[stopName]
        if (!coords) return

        const isStart = index === 0
        const isEnd = index === selectedBus.stops.length - 1

        let element = (
          <div className="group relative flex flex-col items-center">
            <div className="absolute bottom-5 z-50 hidden rounded bg-slate-950 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
              {stopName} (Stop {index + 1})
            </div>
            <Circle className="h-2.5 w-2.5 cursor-pointer fill-emerald-500 text-white shadow-xs transition-transform group-hover:scale-120" />
          </div>
        )

        if (isStart) {
          element = (
            <div className="group relative flex flex-col items-center">
              <div className="absolute bottom-7 z-50 hidden rounded bg-slate-950 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
                Origin: {stopName}
              </div>
              <MapPin className="h-6 w-6 cursor-pointer fill-blue-100 text-blue-600 drop-shadow-md transition-transform group-hover:scale-110" />
            </div>
          )
        } else if (isEnd) {
          element = (
            <div className="group relative flex flex-col items-center">
              <div className="absolute bottom-7 z-50 hidden rounded bg-slate-950 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
                Destination: {stopName}
              </div>
              <MapPin className="h-6 w-6 cursor-pointer fill-red-100 text-red-600 drop-shadow-md transition-transform group-hover:scale-110" />
            </div>
          )
        }

        dynamicMarkers.push({
          id: `bus-stop-${stopName}-${index}`,
          coordinates: coords as [number, number],
          element: element,
        })
      })

      return dynamicMarkers
    }

    if (showStops) {
      return [
        ...dynamicMarkers,
        ...mapMarkers.filter((m) => m.id !== "current-user-identity-pin"),
      ]
    }

    return dynamicMarkers
  }, [mapMarkers, showStops, selectedBus])

  const isMapLoading = loading || isRouting

  return (
    <div className="flex h-dvh w-full gap-4 bg-slate-50 p-4 font-sans">
      {/* LEFT SIDE: Map View Canvas */}
      <div className="relative h-full flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <Map
          markers={visibleMarkers}
          paths={visiblePaths}
          center={userLocation}
          zoom={14}
          isLoading={isMapLoading}
        />

        {/* Floating Warning Toast */}
        {errorMessage && (
          <div className="absolute top-4 left-1/2 z-[1000] flex max-w-md -translate-x-1/2 animate-in items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 shadow-md duration-200 fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <p>{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-2 px-1 font-bold text-amber-900 hover:text-amber-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Floating Recenter Button */}
        {!loading && (
          <button
            onClick={handleRecenterToUser}
            title="Recenter map to user coordinates"
            className="absolute right-5 bottom-5 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-all hover:bg-slate-50 hover:text-emerald-600 active:scale-95"
          >
            <Crosshair className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* RIGHT SIDE SIDEBAR (Now cleanly extracted) */}
      <SidebarControls
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isDropdownOpen={isDropdownOpen}
        setIsDropdownOpen={setIsDropdownOpen}
        filteredStops={filteredStops}
        handleNavigateToStop={handleNavigateToStop}
        dropdownRef={dropdownRef}
        showStops={showStops}
        setShowStops={setShowStops}
        visibleMarkersCount={visibleMarkers.length}
      />
    </div>
  )
}
