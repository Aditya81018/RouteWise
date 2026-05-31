import { type ReactNode, useEffect, useState } from "react"
import { Map } from "@/components/ui/map/map"
import { MapMarker, MarkerContent } from "@/components/ui/map/marker"
import { MapLine } from "@/components/ui/map/line"
import { Card } from "@/components/ui/card"

export interface MapDataPoint {
  coordinates: [number, number] | null
  id: string | number
  element: ReactNode
}

export interface MapPath {
  id: string | number
  points: [number, number][]
  color?: string
  width?: number
  opacity?: number
  useOSRM?: boolean
}

interface ReusableMapProps {
  markers?: MapDataPoint[]
  paths?: MapPath[]
  center?: [number, number]
  zoom?: number
  isLoading?: boolean
}

// Internal interface to hold the final processed line geometry
interface RenderableLine {
  id: string | number
  geoJsonPoints: [number, number][]
  color: string
  width: number
  opacity: number
}

import { fetchOSRMPath } from "@/lib/utils"

export default function CustomMarkersMap({
  markers = [],
  paths = [],
  center = [88.3639, 22.5726],
  zoom = 12,
  isLoading = false,
}: ReusableMapProps) {
  const [computedLines, setComputedLines] = useState<RenderableLine[]>([])
  const [isRouting, setIsRouting] = useState(false)

  const validMarkers = markers
    .filter(
      (m): m is MapDataPoint & { coordinates: [number, number] } =>
        m.coordinates !== null &&
        Array.isArray(m.coordinates) &&
        m.coordinates.length === 2
    )
    .map((m) => ({
      id: m.id,
      lngLat: [m.coordinates[1], m.coordinates[0]] as [number, number],
      element: m.element,
    }))

  useEffect(() => {
    let isMounted = true

    const fetchRoutes = async () => {
      if (!paths || paths.length === 0) {
        setComputedLines([])
        return
      }

      setIsRouting(true)
      const lines: (RenderableLine | null)[] = []

      for (let i = 0; i < paths.length; i++) {
        const path = paths[i]

        const validPoints = path.points.filter(
          (pt) =>
            Array.isArray(pt) &&
            pt.length === 2 &&
            pt[0] !== null &&
            pt[1] !== null
        )

        if (validPoints.length < 2) continue

        const config = {
          id: path.id,
          color: path.color || "#3b82f6",
          width: path.width || 4,
          opacity: path.opacity || 0.8,
        }

        if (path.useOSRM === false) {
          // If explicitly false, just use the points directly (flip lat/lng to lng/lat)
          lines.push({
            ...config,
            geoJsonPoints: validPoints.map(
              ([lat, lng]) => [lng, lat] as [number, number]
            ),
          })
          continue
        }

        try {
          const stitchedGeoJsonPoints = await fetchOSRMPath(validPoints, "simplified")
          if (stitchedGeoJsonPoints.length > 0) {
            lines.push({
              ...config,
              geoJsonPoints: stitchedGeoJsonPoints.map(([lat, lng]) => [lng, lat] as [number, number]),
            })
          }
        } catch (error) {
          console.error(
            `Routing failed for path ${path.id}, falling back to straight lines:`,
            error
          )

          lines.push({
            ...config,
            geoJsonPoints: validPoints.map(
              ([lat, lng]) => [lng, lat] as [number, number]
            ),
          })
        }
      }

      if (isMounted) {
        setComputedLines(
          lines.filter((line): line is RenderableLine => line !== null)
        )
        setIsRouting(false)
      }
    }

    fetchRoutes()

    return () => {
      isMounted = false
    }
  }, [paths])

  const showLoadingOverlay = isLoading || isRouting

  return (
    <Card className="relative h-full w-full overflow-hidden p-0">
      {showLoadingOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <span className="animate-pulse text-sm font-medium text-muted-foreground">
            {isRouting
              ? "Calculating road paths..."
              : "Updating Map Details..."}
          </span>
        </div>
      )}

      <div className="h-full w-full [&_.maplibregl-canvas-container]:z-10 [&_canvas]:z-0 [&_path]:z-40">
        <Map center={center} zoom={zoom}>
          {computedLines.map((line) => (
            <MapLine
              key={line.id}
              coordinates={line.geoJsonPoints}
              color={line.color}
              width={line.width}
              opacity={line.opacity}
            />
          ))}

          {validMarkers.map((marker) => (
            <MapMarker key={marker.id} coordinates={marker.lngLat}>
              <MarkerContent>{marker.element}</MarkerContent>
            </MapMarker>
          ))}
        </Map>
      </div>
    </Card>
  )
}
