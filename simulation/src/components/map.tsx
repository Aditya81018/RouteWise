import { useEffect, useState } from "react"
import { Map } from "@/components/ui/map/map"
import { MapMarker, MarkerContent } from "@/components/ui/map/marker"
import { Card } from "@/components/ui/card"
import { MapPin } from "lucide-react"

export function MyMap() {
  // Default to New York [-Lng, +Lat] if geolocation fails or is loading
  const [coords, setCoords] = useState<[number, number]>([-74.006, 40.7128])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by your browser")
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // MapLibre / Terrae expects [longitude, latitude]
        setCoords([position.coords.longitude, position.coords.latitude])
        setLoading(false)
      },
      (error) => {
        console.error("Error retrieving position: ", error)
        setLoading(false)
      }
    )
  }, [])

  return (
    <Card className="relative h-dvh overflow-hidden p-0">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <span className="text-sm font-medium text-muted-foreground">
            Locating...
          </span>
        </div>
      )}

      <Map center={coords} zoom={13}>
        <MapMarker coordinates={coords}>
          <MarkerContent>
            <MapPin className="text-blue-500" />
          </MarkerContent>
        </MapMarker>
      </Map>
    </Card>
  )
}
