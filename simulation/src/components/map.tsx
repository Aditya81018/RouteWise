import { type ReactNode } from "react"
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
}

interface ReusableMapProps {
  markers?: MapDataPoint[]
  paths?: MapPath[]
  center?: [number, number]
  zoom?: number
  isLoading?: boolean
}

export default function CustomMarkersMap({
  markers = [],
  paths = [],
  center = [88.3639, 22.5726],
  zoom = 12,
  isLoading = false,
}: ReusableMapProps) {
  // 1. Process markers: filter out nulls and flip [lat, lng] -> [lng, lat]
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

  // 2. Process path lines into major point-to-point connections cleanly
  const processedPaths = paths
    .map((path) => {
      const validPoints = path.points.filter(
        (pt) =>
          Array.isArray(pt) &&
          pt.length === 2 &&
          pt[0] !== null &&
          pt[1] !== null
      )

      if (validPoints.length < 2) return null

      return {
        id: path.id,
        color: path.color || "#3b82f6",
        width: path.width || 4,
        opacity: path.opacity || 0.8,
        // Convert your data layers [lat, lng] to map layer [lng, lat]
        geoJsonPoints: validPoints.map(
          ([lat, lng]) => [lng, lat] as [number, number]
        ),
      }
    })
    .filter(Boolean)

  return (
    <Card className="relative h-full w-full overflow-hidden p-0">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <span className="animate-pulse text-sm font-medium text-muted-foreground">
            Updating Map Details...
          </span>
        </div>
      )}

      {/* CRITICAL FIX: Adding custom target CSS styling rules directly to the container forcing
        nested elements inside the canvas vector source layers to float over the base style graphics.
      */}
      <div className="h-full w-full [&_.maplibregl-canvas-container]:z-10 [&_canvas]:z-0 [&_path]:z-40">
        <Map center={center} zoom={zoom}>
          {/* Renders point-to-point connections straight through without complex road-snapping errors */}
          {processedPaths.map(
            (path) =>
              path && (
                <MapLine
                  key={path.id}
                  coordinates={path.geoJsonPoints}
                  color={path.color}
                  width={path.width}
                  opacity={path.opacity}
                />
              )
          )}

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
