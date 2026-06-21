import { useEffect, useState, useMemo, useRef } from "react"
import Map, { type MapDataPoint } from "@/components/map"
import { SidebarControls } from "@/components/sidebar-controls"
import {
  MapPin,
  Circle,
  AlertCircle,
  Crosshair,
  Bus as BusIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import coordsData from "@/assets/coords.json"
import stopsData from "@/assets/stops.json"
import busDataRaw from "@/assets/busdata.json"
import { type LiveBus } from "@/components/live-bus-tab-panel"
import { fetchOSRMPath, getDistanceMeters, cn } from "@/lib/utils"

type TabType = "buses" | "stops" | "live"

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

// 1. Augmented interface to hold real-time animation state
export interface AnimatedLiveBus extends LiveBus {
  currentCoords: [number, number]
  nextStopIndex: number
  stopsSequence: string[]
  pathPoints?: [number, number][]
  fullPathPoints?: [number, number][]
  currentPathIndex?: number
  lastUpdateAt: number
}

// Helper mathematical function to interpolate coordinates based on Earth's curvature
function moveTowards(
  currentPos: [number, number],
  targetPos: [number, number],
  distanceMeters: number
) {
  const [lat1, lon1] = currentPos
  const [lat2, lon2] = targetPos
  const R = 6371e3 // Earth radius in meters

  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const totalDist = R * c

  // If the jump distance covers the remaining gap, snap to the target
  if (totalDist <= distanceMeters || totalDist === 0) {
    return { pos: targetPos, reached: true }
  }

  const fraction = distanceMeters / totalDist
  const newLat = lat1 + (lat2 - lat1) * fraction
  const newLon = lon1 + (lon2 - lon1) * fraction

  return { pos: [newLat, newLon] as [number, number], reached: false }
}

export default function App() {
  const [showStops, setShowStops] = useState<boolean>(true)
  const [userLocation, setUserLocation] = useState<[number, number]>([
    88.3639, 22.5726,
  ])
  const [rawUserLocation, setRawUserLocation] = useState<
    [number, number] | null
  >(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<TabType>("stops")
  const [timeScale, setTimeScale] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [busSearchQuery, setBusSearchQuery] = useState<string>("")
  const [isBusDropdownOpen, setIsBusDropdownOpen] = useState<boolean>(false)
  const [selectedBus, setSelectedBus] = useState<BusRoute | null>(null)
  const busDropdownRef = useRef<HTMLDivElement>(null)

  // WebSocket and sync state/refs
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const wsRef = useRef<WebSocket | null>(null)
  const lastSentBusesRef = useRef<Record<string, AnimatedLiveBus>>({})

  const [osrmRoutePoints, setOsrmRoutePoints] = useState<[number, number][]>([])
  const [isRouting, setIsRouting] = useState<boolean>(false)

  // 2. State converted to use Animated Busses
  const [liveBuses, setLiveBuses] = useState<AnimatedLiveBus[]>([])
  const [selectedLiveBusId, setSelectedLiveBusId] = useState<string | null>(null)
  const [preSelectedBus, setPreSelectedBus] = useState<{
    routeCode: string
    stopName: string
  } | null>(null)

  const handleSelectLiveBus = (bus: LiveBus | null) => {
    setSelectedLiveBusId(bus ? bus.id : null)
    if (bus) {
      // Clear selected static bus when a live bus is selected to avoid map clutter
      setSelectedBus(null)
      setOsrmRoutePoints([])
    }
  }

  const handleNavigateToStop = (stopName: string) => {
    setIsDropdownOpen(false)
    setSearchQuery(stopName)
    setActiveTab("stops") // Switch to stops tab to show buses
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
  }

  // 3. Setup initial coordinates and sequence when a bus is spawned
  const handleSpawnBus = async (bus: LiveBus) => {
    const route = (busDataRaw.routes as BusRoute[]).find(
      (r) => r.code === bus.routeCode
    )
    if (!route) return

    let direction = bus.direction
    if (direction === "Towards Destination" || !direction) {
      direction = `Towards ${route.stops[route.stops.length - 1]}`
    }

    // Figure out which way the array is ordered based on the direction
    const isForward = direction.includes(
      route.stops[route.stops.length - 1]
    )
    const sequence = isForward ? route.stops : [...route.stops].reverse()

    const startIdx = sequence.indexOf(bus.currentStop)
    const nextIdx = startIdx + 1 < sequence.length ? startIdx + 1 : startIdx

    const coords = (
      coordsData as unknown as Record<string, [number, number] | null>
    )[bus.currentStop]

    if (!coords) {
      setErrorMessage(
        `Cannot spawn bus. Initial stop '${bus.currentStop}' lacks GPS coordinates.`
      )
      return
    }

    const newBus: AnimatedLiveBus = {
      ...bus,
      direction, // Use the updated direction
      currentCoords: coords,
      stopsSequence: sequence,
      nextStopIndex: nextIdx,
      pathPoints: [],
      currentPathIndex: 0,
      lastUpdateAt: Date.now(),
    }

    // Immediately show the bus at the initial stop
    setLiveBuses((prev) => [...prev, newBus])

    // Fetch the detailed OSRM path for the remaining stops so it can follow the road
    const remainingStops = sequence.slice(startIdx)
    const allStops = sequence
    
    const getCoords = (stops: string[]) => stops
      .map(
        (stopName) =>
          (coordsData as unknown as Record<string, [number, number] | null>)[
            stopName
          ]
      )
      .filter((c): c is [number, number] => c !== null)

    const stopCoordinates = getCoords(remainingStops)
    const allStopCoordinates = getCoords(allStops)

    if (stopCoordinates.length >= 2) {
      try {
        const [pathGeometry, fullPathGeometry] = await Promise.all([
          fetchOSRMPath(stopCoordinates, "full"),
          fetchOSRMPath(allStopCoordinates, "full")
        ])
        
        setLiveBuses((prev) =>
          prev.map((b) =>
            b.id === newBus.id ? { 
              ...b, 
              pathPoints: pathGeometry,
              fullPathPoints: fullPathGeometry 
            } : b
          )
        )
      } catch (err) {
        console.error("Failed to fetch OSRM path for live bus", err)
      }
    }
  }

  const handleRemoveLiveBus = (id: string) => {
    setLiveBuses((prev) => prev.filter((b) => b.id !== id))
    if (selectedLiveBusId === id) {
      setSelectedLiveBusId(null)
    }
  }

  const handleRemoveAllLiveBuses = () => {
    setLiveBuses([])
    setSelectedLiveBusId(null)
  }

  // 4. ANIMATION ENGINE LOOP
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setLiveBuses((prevBuses) => {
        if (prevBuses.length === 0) return prevBuses

        const updateGap = 10000 / timeScale

        return prevBuses.map((bus) => {
          // Check if this bus is due for an update
          if (now - bus.lastUpdateAt < updateGap) return bus
          
          // If it reached the terminal station, stay there
          if (bus.nextStopIndex >= bus.stopsSequence.length) return bus

          // Physics Setup:
          // Individual bus speed in km/h.
          // Move exactly 10 seconds worth of distance per "jump"
          // Distance (m) = Speed (km/h) * 1000 / 3600 * 10s = Speed * 10 / 3.6
          const DISTANCE_METERS_PER_TICK = (bus.speed * 10) / 3.6

          let updatedBus = { ...bus, lastUpdateAt: now }

          if (
            bus.pathPoints &&
            bus.pathPoints.length > 0 &&
            bus.currentPathIndex !== undefined &&
            bus.currentPathIndex < bus.pathPoints.length
          ) {
            let remainingDistance = DISTANCE_METERS_PER_TICK
            let currentPos = bus.currentCoords
            let currentIdx = bus.currentPathIndex

            // Move along the path points
            while (remainingDistance > 0 && currentIdx < bus.pathPoints.length) {
              const targetPoint = bus.pathPoints[currentIdx]
              const distToTarget = getDistanceMeters(currentPos, targetPoint)

              if (distToTarget <= remainingDistance) {
                // We reached this path point, consume distance and move to next
                remainingDistance -= distToTarget
                currentPos = targetPoint
                currentIdx++
              } else {
                // We didn't reach the target point, interpolate and stop
                const fraction = remainingDistance / distToTarget
                const newLat = currentPos[0] + (targetPoint[0] - currentPos[0]) * fraction
                const newLon = currentPos[1] + (targetPoint[1] - currentPos[1]) * fraction
                currentPos = [newLat, newLon]
                remainingDistance = 0
              }
            }

            // Check if we passed the next stop
            let nextStopIdx = bus.nextStopIndex
            let currStop = bus.currentStop

            while (nextStopIdx < bus.stopsSequence.length) {
              const stopName = bus.stopsSequence[nextStopIdx]
              const stopCoords = (
                coordsData as unknown as Record<string, [number, number] | null>
              )[stopName]

              if (!stopCoords) {
                nextStopIdx++
                continue
              }

              // If within 100 meters of the stop, consider it reached
              const distToStop = getDistanceMeters(currentPos, stopCoords)
              if (distToStop < 100) {
                currStop = stopName
                nextStopIdx++
              } else {
                break
              }
            }

            updatedBus = {
              ...updatedBus,
              currentCoords: currentPos,
              currentPathIndex: currentIdx,
              currentStop: currStop,
              nextStopIndex: nextStopIdx,
            }
          } else {
            // Fallback to straight-line interpolation if no pathPoints are loaded yet
            const nextStopName = bus.stopsSequence[bus.nextStopIndex]
            const targetCoords = (
              coordsData as unknown as Record<string, [number, number] | null>
            )[nextStopName]

            // If the next stop lacks geodata, blindly skip to the one after it
            if (!targetCoords) {
              updatedBus = { ...updatedBus, nextStopIndex: bus.nextStopIndex + 1 }
            } else {
              const result = moveTowards(
                bus.currentCoords,
                targetCoords,
                DISTANCE_METERS_PER_TICK
              )

              if (result.reached) {
                updatedBus = {
                  ...updatedBus,
                  currentCoords: result.pos,
                  currentStop: nextStopName,
                  nextStopIndex: bus.nextStopIndex + 1,
                }
              } else {
                updatedBus = {
                  ...updatedBus,
                  currentCoords: result.pos,
                }
              }
            }
          }
          return updatedBus
        })
      })
    }, 100)

    return () => clearInterval(interval)
  }, [timeScale])

  // Connect to WebSocket server on mount
  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout>

    const connect = () => {
      console.log("Connecting to WebSocket server...")
      const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8000"
      const WS_URL = SERVER_URL.replace(/^http/, "ws") + "/ws"
      
      ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("Connected to WebSocket server")
        setIsConnected(true)
      }

      ws.onclose = () => {
        console.log("Disconnected from WebSocket. Reconnecting in 3s...")
        setIsConnected(false)
        lastSentBusesRef.current = {}
        reconnectTimeout = setTimeout(connect, 3000)
      }

      ws.onerror = (err) => {
        console.error("WebSocket error:", err)
        ws?.close()
      }
    };

    connect()

    return () => {
      if (ws) {
        ws.onclose = null
        ws.close()
      }
      clearTimeout(reconnectTimeout)
    }
  }, [])

  // Synchronize live buses with the backend server via WebSocket
  useEffect(() => {
    if (!isConnected) return

    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const lastSent = lastSentBusesRef.current
    const currentBusIds = new Set(liveBuses.map((b) => b.id))

    // 1. Send deletes/removes for buses that are no longer in state
    Object.keys(lastSent).forEach((id) => {
      if (!currentBusIds.has(id)) {
        try {
          ws.send(
            JSON.stringify({
              id,
              action: "delete",
            })
          )
        } catch (e) {
          console.error("Error sending delete event", e)
        }
        delete lastSent[id]
      }
    })

    // 2. Scan live buses and send either full payloads (first time) or updates
    liveBuses.forEach((bus) => {
      const prevBus = lastSent[bus.id]

      if (!prevBus) {
        // First-time broadcast: send everything including route (stopsSequence)
        const fullPayload = {
          id: bus.id,
          is_first_time: true,
          routeCode: bus.routeCode,
          currentStop: bus.currentStop,
          direction: bus.direction,
          color: bus.color,
          crowdStatus: bus.crowdStatus,
          reliability: bus.reliability,
          speed: bus.speed,
          currentCoords: bus.currentCoords,
          nextStopIndex: bus.nextStopIndex,
          stopsSequence: bus.stopsSequence,
        }
        try {
          ws.send(JSON.stringify(fullPayload))
          lastSent[bus.id] = JSON.parse(JSON.stringify(bus))
        } catch (e) {
          console.error("Error sending initial bus data", e)
        }
      } else {
        // Subsequent broadcasts: compare fields and send only changed values
        const diff: Record<string, any> = {}
        let hasChanges = false

        if (bus.currentStop !== prevBus.currentStop) {
          diff.currentStop = bus.currentStop
          hasChanges = true
        }
        if (bus.direction !== prevBus.direction) {
          diff.direction = bus.direction
          hasChanges = true
        }
        if (bus.color !== prevBus.color) {
          diff.color = bus.color
          hasChanges = true
        }
        if (bus.crowdStatus !== prevBus.crowdStatus) {
          diff.crowdStatus = bus.crowdStatus
          hasChanges = true
        }
        if (bus.reliability !== prevBus.reliability) {
          diff.reliability = bus.reliability
          hasChanges = true
        }
        if (bus.speed !== prevBus.speed) {
          diff.speed = bus.speed
          hasChanges = true
        }
        if (
          bus.currentCoords[0] !== prevBus.currentCoords[0] ||
          bus.currentCoords[1] !== prevBus.currentCoords[1]
        ) {
          diff.currentCoords = bus.currentCoords
          hasChanges = true
        }
        if (bus.nextStopIndex !== prevBus.nextStopIndex) {
          diff.nextStopIndex = bus.nextStopIndex
          hasChanges = true
        }

        if (hasChanges) {
          const updatePayload = {
            id: bus.id,
            is_first_time: false,
            ...diff,
          }
          try {
            ws.send(JSON.stringify(updatePayload))
            lastSent[bus.id] = JSON.parse(JSON.stringify(bus))
          } catch (e) {
            console.error("Error sending updated bus data", e)
          }
        }
      }
    })
  }, [liveBuses, isConnected])

  useEffect(() => {
    let isMounted = true

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return
          const { longitude, latitude } = position.coords
          setUserLocation([longitude, latitude])
          setRawUserLocation([longitude, latitude])
          setLoading(false)
        },
        () => {
          if (!isMounted) return
          setLoading(false)
        }
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
    return () => {
      isMounted = false
      document.removeEventListener("mousedown", handleClickOutside)
    }
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
      const pathGeometry = await fetchOSRMPath(stopCoordinates, "full")
      if (pathGeometry.length > 0) {
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
    setSelectedLiveBusId(null) // Clear selected live bus
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
    if (selectedLiveBusId) {
      const bus = liveBuses.find((b) => b.id === selectedLiveBusId)
      if (bus && bus.fullPathPoints && bus.fullPathPoints.length > 0) {
        return [
          {
            id: `live-path-${bus.id}`,
            points: bus.fullPathPoints,
            color: bus.color,
            width: 5,
            opacity: 0.85,
            useOSRM: false,
          },
        ]
      }
    }

    if (!selectedBus || osrmRoutePoints.length === 0) return []
    const pathColor = selectedBus.kind === "government" ? "#8b5cf6" : "#f59e0b"
    return [
      {
        id: `line-path-${selectedBus.code}`,
        points: osrmRoutePoints,
        color: pathColor,
        width: 5,
        opacity: 0.85,
        useOSRM: false,
      },
    ]
  }, [selectedBus, osrmRoutePoints, selectedLiveBusId, liveBuses])

  const networkStopMarkers = useMemo<MapDataPoint[]>(() => {
    return Object.entries(coordsData).map(
      ([name, coordinates]) => ({
        id: name,
        coordinates: coordinates as [number, number] | null,
        element: (
          <div className="group relative flex flex-col items-center">
            <div className="absolute bottom-6 z-50 hidden rounded bg-slate-950 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
              {name}
            </div>
            <MapPin 
              onClick={() => handleNavigateToStop(name)}
              className="h-4 w-4 cursor-pointer fill-emerald-100 text-emerald-600 transition-transform group-hover:scale-120" 
            />
          </div>
        ),
      })
    )
  }, []) // Depend on handleNavigateToStop if memoized, but here it's stable enough as it's defined above

  const visibleMarkers = useMemo(() => {
    const dynamicMarkers: MapDataPoint[] = []
    
    if (rawUserLocation) {
      dynamicMarkers.push({
        id: "current-user-identity-pin",
        coordinates: [rawUserLocation[1], rawUserLocation[0]],
        element: (
          <div className="group relative flex flex-col items-center">
            <div className="absolute bottom-6 z-50 hidden rounded bg-slate-950 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
              You
            </div>
            <Circle className="h-4 w-4 cursor-pointer fill-blue-100 text-blue-600 transition-transform group-hover:scale-120" />
          </div>
        ),
      })
    }

    // 5. Connect Dynamic Positions to Markers Array
    const liveBusMarkers: MapDataPoint[] = liveBuses.map((bus) => {
      const isSelected = bus.id === selectedLiveBusId
      return {
        id: bus.id,
        // Using the calculated interpolation values instead of the static stop coordinates!
        coordinates: bus.currentCoords,
        element: (
          <div className="group relative z-[999] flex flex-col items-center">
            <div className={cn(
              "absolute bottom-8 z-[999] hidden flex-col items-center rounded bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:flex",
              isSelected && "flex"
            )}>
              <span className="font-bold text-emerald-400">
                Route {bus.routeCode}
              </span>
              <span>{bus.direction}</span>
            </div>
            <div 
              onClick={() => {
                handleSelectLiveBus(bus)
                setUserLocation([bus.currentCoords[1], bus.currentCoords[0]])
                setActiveTab("live")
              }}
              className={cn(
                "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform",
                isSelected && "scale-125 z-[1000]"
              )}
              style={{ backgroundColor: bus.color }}
            >
              <BusIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        ),
      }
    })

    if (selectedBus || selectedLiveBusId) {
      const currentSelectedBus = selectedBus || liveBuses.find(b => b.id === selectedLiveBusId)
      if (currentSelectedBus) {
        // If it's a live bus, we need to adapt it to look like a BusRoute for stop rendering
        const stops = 'stops' in currentSelectedBus ? currentSelectedBus.stops : currentSelectedBus.stopsSequence
        const color = 'color' in currentSelectedBus ? currentSelectedBus.color : (currentSelectedBus.kind === "government" ? "#8b5cf6" : "#f59e0b")

        stops.forEach((stopName, index) => {
          const coords = (
            coordsData as unknown as Record<string, [number, number] | null>
          )[stopName]
          if (!coords) return

          const isStart = index === 0
          const isEnd = index === stops.length - 1

          let element = (
            <div className="group relative flex flex-col items-center">
              <div className="absolute bottom-5 z-50 hidden rounded bg-slate-950 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
                {stopName} (Stop {index + 1})
              </div>
              <Circle 
                onClick={() => handleNavigateToStop(stopName)}
                className="h-2.5 w-2.5 cursor-pointer text-white shadow-xs transition-transform group-hover:scale-120" 
                style={{ fill: color }}
              />
            </div>
          )

          if (isStart) {
            element = (
              <div className="group relative flex flex-col items-center">
                <div className="absolute bottom-7 z-50 hidden rounded bg-slate-950 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
                  Origin: {stopName}
                </div>
                <MapPin 
                  onClick={() => handleNavigateToStop(stopName)}
                  className="h-6 w-6 cursor-pointer drop-shadow-md transition-transform group-hover:scale-110" 
                  style={{ fill: color + '22', color: color }} // using color with alpha for fill
                />
              </div>
            )
          } else if (isEnd) {
            element = (
              <div className="group relative flex flex-col items-center">
                <div className="absolute bottom-7 z-50 hidden rounded bg-slate-950 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
                  Destination: {stopName}
                </div>
                <MapPin 
                  onClick={() => handleNavigateToStop(stopName)}
                  className="h-6 w-6 cursor-pointer drop-shadow-md transition-transform group-hover:scale-110" 
                  style={{ fill: color + '22', color: color }}
                />
              </div>
            )
          }

          dynamicMarkers.push({
            id: `bus-stop-${stopName}-${index}`,
            coordinates: coords as [number, number],
            element: element,
          })
        })
      }
    }

    // Special highlighter for searched stop
    const searchedStopCoords = (coordsData as unknown as Record<string, [number, number] | null>)[searchQuery]
    if (searchedStopCoords) {
      dynamicMarkers.push({
        id: `searched-stop-highlighter-${searchQuery}`,
        coordinates: searchedStopCoords,
        element: (
          <div className="group relative z-[1001] flex flex-col items-center">
            <div className="absolute bottom-10 z-50 rounded bg-slate-950 px-2 py-1 text-[11px] font-bold whitespace-nowrap text-white shadow-xl">
              {searchQuery}
            </div>
            <MapPin 
              onClick={() => handleNavigateToStop(searchQuery)}
              className="h-10 w-10 cursor-pointer fill-red-100 text-red-600 drop-shadow-2xl transition-all scale-110" 
            />
          </div>
        )
      })
    }

    if (showStops) {
      return [
        ...dynamicMarkers,
        ...networkStopMarkers.filter((m) => m.id !== searchQuery),
        ...liveBusMarkers,
      ]
    }

    return [...dynamicMarkers, ...liveBusMarkers]
  }, [networkStopMarkers, showStops, selectedBus, liveBuses, selectedLiveBusId, searchQuery, rawUserLocation])

  const isMapLoading = loading || isRouting

  return (
    <div className="flex h-dvh w-full gap-4 bg-slate-50 p-4 font-sans">
      <div className="relative h-full flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <Map
          markers={visibleMarkers}
          paths={visiblePaths}
          center={userLocation}
          zoom={14}
          isLoading={isMapLoading}
        />

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

        {!loading && (
          <div className="absolute right-5 bottom-5 z-[1000] flex flex-col items-center gap-2">
            <button
              onClick={handleRecenterToUser}
              title="Recenter map to user coordinates"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-all hover:bg-slate-50 hover:text-emerald-600 active:scale-95"
            >
              <Crosshair className="h-5 w-5" />
            </button>

            {/* Redesigned Speed Multiplier UI */}
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 p-1 shadow-md backdrop-blur-sm">
              <button
                onClick={() => {
                  const scales = [1, 2, 4, 8]
                  const idx = scales.indexOf(timeScale)
                  if (idx > 0) setTimeScale(scales[idx - 1])
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 active:scale-90"
                title="Decrease simulation speed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex min-w-[32px] flex-col items-center px-1">
                <span className="text-[10px] font-bold text-emerald-600">{timeScale}x</span>
              </div>

              <button
                onClick={() => {
                  const scales = [1, 2, 4, 8]
                  const idx = scales.indexOf(timeScale)
                  if (idx < scales.length - 1) setTimeScale(scales[idx + 1])
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 active:scale-90"
                title="Increase simulation speed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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
        liveBuses={liveBuses}
        handleSpawnBus={handleSpawnBus}
        handleRemoveLiveBus={handleRemoveLiveBus}
        handleRemoveAllLiveBuses={handleRemoveAllLiveBuses}
        onSelectLiveBus={handleSelectLiveBus}
        selectedLiveBusId={selectedLiveBusId}
        preSelectedBus={preSelectedBus}
        setPreSelectedBus={setPreSelectedBus}
        showStops={showStops}
        setShowStops={setShowStops}
        visibleMarkersCount={visibleMarkers.length}
      />
    </div>
  )
}
